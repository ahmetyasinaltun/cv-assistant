# Google Gemini implementation of the LLM and embedding interfaces, with timeouts, retries and output validation.

import logging
import time
from collections.abc import Callable
from typing import TypeVar

from google import genai
from google.genai import errors as genai_errors
from google.genai import types as genai_types
from pydantic import BaseModel, ValidationError

from app.core.config import Settings
from app.core.errors import AIProviderError

logger = logging.getLogger(__name__)

StructuredT = TypeVar("StructuredT", bound=BaseModel)

EMBEDDING_DIMENSIONS = 768
EMBEDDING_BATCH_SIZE = 100
RETRYABLE_STATUS_CODES = {408, 429, 500, 502, 503, 504}
ResultT = TypeVar("ResultT")


INVALID_OUTPUT_CODE = "ai_invalid_output"


def _is_retryable(exc: Exception) -> bool:
    if isinstance(exc, genai_errors.APIError):
        return exc.code in RETRYABLE_STATUS_CODES
    if isinstance(exc, AIProviderError):
        # Malformed structured output is usually transient model noise; other provider errors are not.
        return exc.code == INVALID_OUTPUT_CODE
    return isinstance(exc, TimeoutError | ConnectionError)


class GeminiProvider:
    """Holds one authenticated client and exposes it through the `llm` and `embeddings` interfaces."""

    def __init__(self, settings: Settings):
        if not settings.gemini_api_key:
            raise AIProviderError(
                "GEMINI_API_KEY is not configured.", code="ai_provider_not_configured"
            )
        http_options = genai_types.HttpOptions(
            timeout=int(settings.ai_request_timeout_seconds * 1000),
            # Retries are handled explicitly in _with_retries so behaviour is visible and testable.
            retry_options=genai_types.HttpRetryOptions(attempts=1),
        )
        self._client = genai.Client(api_key=settings.gemini_api_key, http_options=http_options)
        self._max_retries = settings.ai_max_retries
        self.llm = _GeminiLLM(self._client, settings.gemini_llm_model, self._with_retries)
        self.embeddings = _GeminiEmbeddings(
            self._client, settings.gemini_embedding_model, self._with_retries
        )

    def _with_retries(self, operation: Callable[[], ResultT], *, task: str) -> ResultT:
        attempt = 0
        while True:
            try:
                return operation()
            except Exception as exc:  # noqa: BLE001 - narrowed below by _is_retryable
                attempt += 1
                if not _is_retryable(exc) or attempt > self._max_retries:
                    logger.warning("Gemini %s failed after %d attempt(s): %s", task, attempt, exc)
                    if isinstance(exc, AIProviderError):
                        raise
                    raise AIProviderError(
                        f"The AI provider could not complete '{task}'. Please try again."
                    ) from exc
                delay = 2**attempt
                logger.info("Gemini %s retry %d in %ds: %s", task, attempt, delay, exc)
                time.sleep(delay)


class _GeminiLLM:
    def __init__(self, client: genai.Client, model: str, with_retries):
        self._client = client
        self._model = model
        self._with_retries = with_retries

    def generate_structured(
        self, *, task: str, prompt: str, schema: type[StructuredT]
    ) -> StructuredT:
        config = genai_types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=schema,
            temperature=0.2,
        )

        def call() -> StructuredT:
            response = self._client.models.generate_content(
                model=self._model, contents=prompt, config=config
            )
            return _parse_structured(response, schema)

        return self._with_retries(call, task=task)


class _GeminiEmbeddings:
    def __init__(self, client: genai.Client, model: str, with_retries):
        self._client = client
        self._model = model
        self._with_retries = with_retries

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        config = genai_types.EmbedContentConfig(
            task_type="SEMANTIC_SIMILARITY", output_dimensionality=EMBEDDING_DIMENSIONS
        )
        vectors: list[list[float]] = []
        for start in range(0, len(texts), EMBEDDING_BATCH_SIZE):
            batch = texts[start : start + EMBEDDING_BATCH_SIZE]

            def call(batch=batch) -> list[list[float]]:
                response = self._client.models.embed_content(
                    model=self._model, contents=batch, config=config
                )
                embeddings = response.embeddings or []
                if len(embeddings) != len(batch):
                    raise AIProviderError("Embedding response size did not match the input.")
                return [list(item.values or []) for item in embeddings]

            vectors.extend(self._with_retries(call, task="embed"))
        return vectors


def _parse_structured[T: BaseModel](
    response: genai_types.GenerateContentResponse, schema: type[T]
) -> T:
    parsed = response.parsed
    if isinstance(parsed, schema):
        return parsed
    raw_text = response.text
    if not raw_text:
        raise AIProviderError("The AI provider returned an empty response.")
    try:
        return schema.model_validate_json(raw_text)
    except ValidationError as exc:
        # Structured-output validity is one of the evaluated properties; surface it explicitly.
        logger.warning("Gemini returned JSON that failed %s validation: %s", schema.__name__, exc)
        raise AIProviderError(
            "The AI provider returned an unexpected response format.", code=INVALID_OUTPUT_CODE
        ) from exc

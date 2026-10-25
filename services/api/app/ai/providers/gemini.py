# Google Gemini implementation of the LLM and embedding interfaces: a best-first model fallback chain,
# timeouts and output validation.

import logging
import math
import time
from collections import Counter
from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal, TypeVar

import httpx
from google import genai
from google.genai import errors as genai_errors
from google.genai import types as genai_types
from pydantic import BaseModel, ValidationError

from app.core.config import Settings
from app.core.errors import AIProviderError

logger = logging.getLogger(__name__)

StructuredT = TypeVar("StructuredT", bound=BaseModel)
ResultT = TypeVar("ResultT")

EMBEDDING_DIMENSIONS = 768
EMBEDDING_BATCH_SIZE = 100
TRANSIENT_STATUS_CODES = {408, 500, 502, 503, 504}
# Overloaded models often stay overloaded for minutes. Benching one keeps the later pipeline steps
# from waiting on it again; a timed-out call costs the full request timeout.
OVERLOAD_COOLDOWN_SECONDS = 300.0
# Used when a quota error does not say when to retry.
DEFAULT_QUOTA_COOLDOWN_SECONDS = 60.0

INVALID_OUTPUT_CODE = "ai_invalid_output"
QUOTA_EXHAUSTED_CODE = "ai_quota_exhausted"

FailureKind = Literal["quota", "retired", "overloaded", "invalid_output", "fatal"]


def classify_failure(exc: Exception) -> FailureKind:
    if isinstance(exc, genai_errors.APIError):
        if exc.code == 429:
            return "quota"
        if exc.code == 404:
            return "retired"
        if exc.code in TRANSIENT_STATUS_CODES:
            return "overloaded"
        # Bad request or invalid key: another model would fail the same way.
        return "fatal"
    if isinstance(exc, AIProviderError):
        # Malformed structured output is model noise; other provider errors are not.
        return "invalid_output" if exc.code == INVALID_OUTPUT_CODE else "fatal"
    # httpx raises its own timeout/connection errors, which are not subclasses of the built-ins.
    if isinstance(exc, httpx.TransportError | TimeoutError | ConnectionError):
        return "overloaded"
    return "fatal"


def quota_retry_delay(exc: genai_errors.APIError) -> float:
    """Read the RetryInfo delay Google attaches to quota errors ("41s", or hours for a daily quota)."""
    error_body = exc.details.get("error", {}) if isinstance(exc.details, dict) else {}
    for detail in error_body.get("details") or []:
        delay = detail.get("retryDelay") if isinstance(detail, dict) else None
        if isinstance(delay, str) and delay.endswith("s"):
            try:
                return float(delay[:-1])
            except ValueError:
                break
    return DEFAULT_QUOTA_COOLDOWN_SECONDS


@dataclass(frozen=True)
class _Bench:
    until: float
    reason: FailureKind


class ModelChain:
    """Sends a request to the configured models in order of preference, benching those that cannot serve.

    Free-tier quotas are per model, so handing the request to the next model is what keeps the app
    working after the best model's daily quota is spent. Each model is tried at most once per call:

    - 429 quota: benched until Google's suggested retry time
    - 404 retired model: benched for the life of the process
    - overload or timeout: benched for a few minutes (tried again if every model is benched)
    - malformed output: not benched; the next model gets the request
    - anything else (bad request, invalid key): fails at once, because every model would fail
    """

    def __init__(self, models: list[str], *, clock: Callable[[], float] = time.monotonic):
        if not models:
            raise AIProviderError(
                "No Gemini models are configured.", code="ai_provider_not_configured"
            )
        self._models = list(models)
        self._clock = clock
        # Shared by concurrent analyses. Single dict writes are atomic; a race only costs one extra
        # request to a model that is about to be benched anyway.
        self._benches: dict[str, _Bench] = {}
        self.served: Counter[str] = Counter()

    def run(self, operation: Callable[[str], ResultT], *, task: str) -> ResultT:
        for model in self._candidates():
            try:
                result = operation(model)
            except Exception as exc:  # noqa: BLE001 - classified below; fatal errors are re-raised
                if self._record_failure(model, exc, task) == "fatal":
                    if isinstance(exc, AIProviderError):
                        raise
                    raise _could_not_complete(task) from exc
                continue
            self.served[model] += 1
            logger.info("Gemini %s served by %s", task, model)
            return result
        if self._quota_spent_everywhere():
            raise AIProviderError(
                "The AI service has used up its free quota for now. Please try again later.",
                code=QUOTA_EXHAUSTED_CODE,
                status_code=503,
            )
        raise _could_not_complete(task)

    def _candidates(self) -> list[str]:
        available = [m for m in self._models if not self._is_benched(m)]
        if available:
            return available
        # Everything is benched. An overload or a network drop may already be over, so give those
        # models another try instead of failing without sending a request; quota benches still hold.
        return [m for m in self._models if self._benches[m].reason == "overloaded"]

    def _record_failure(self, model: str, exc: Exception, task: str) -> FailureKind:
        kind = classify_failure(exc)
        if kind == "quota":
            seconds = quota_retry_delay(exc)
            self._bench(model, seconds, kind)
            logger.warning("Gemini %s: %s is out of quota, benched for %.0fs", task, model, seconds)
        elif kind == "retired":
            self._bench(model, math.inf, kind)
            logger.warning(
                "Gemini %s: %s is not available; remove it from the model list", task, model
            )
        elif kind == "overloaded":
            self._bench(model, OVERLOAD_COOLDOWN_SECONDS, kind)
            logger.warning("Gemini %s: %s is overloaded or timed out: %s", task, model, exc)
        elif kind == "invalid_output":
            logger.warning("Gemini %s: %s returned malformed output", task, model)
        else:
            logger.warning("Gemini %s failed on %s: %s", task, model, exc)
        return kind

    def _bench(self, model: str, seconds: float, reason: FailureKind) -> None:
        self._benches[model] = _Bench(until=self._clock() + seconds, reason=reason)

    def _is_benched(self, model: str) -> bool:
        bench = self._benches.get(model)
        return bench is not None and self._clock() < bench.until

    def _quota_spent_everywhere(self) -> bool:
        """True when no model can serve until a quota resets (as opposed to a temporary overload)."""
        return all(
            self._is_benched(m) and self._benches[m].reason in ("quota", "retired")
            for m in self._models
        )


def _could_not_complete(task: str) -> AIProviderError:
    return AIProviderError(f"The AI provider could not complete '{task}'. Please try again.")


class GeminiProvider:
    """Holds one authenticated client and exposes it through the `llm` and `embeddings` interfaces."""

    def __init__(self, settings: Settings):
        if not settings.gemini_api_key:
            raise AIProviderError(
                "GEMINI_API_KEY is not configured.", code="ai_provider_not_configured"
            )
        http_options = genai_types.HttpOptions(
            timeout=int(settings.ai_request_timeout_seconds * 1000),
            # Failures are handled by ModelChain so the fallback behaviour is visible and testable.
            retry_options=genai_types.HttpRetryOptions(attempts=1),
        )
        client = genai.Client(api_key=settings.gemini_api_key, http_options=http_options)
        self.llm = _GeminiLLM(client, ModelChain(settings.gemini_llm_models))
        self.embeddings = _GeminiEmbeddings(client, ModelChain(settings.gemini_embedding_models))

    def models_used(self) -> dict[str, int]:
        """Successful calls per model since start-up; the evaluation report shows which models answered."""
        return dict(self.llm.chain.served + self.embeddings.chain.served)


class _GeminiLLM:
    def __init__(self, client: genai.Client, chain: ModelChain):
        self._client = client
        self.chain = chain

    def generate_structured(
        self, *, task: str, prompt: str, schema: type[StructuredT]
    ) -> StructuredT:
        config = genai_types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=schema,
            temperature=0.2,
        )

        def call(model: str) -> StructuredT:
            response = self._client.models.generate_content(
                model=model, contents=prompt, config=config
            )
            return _parse_structured(response, schema)

        return self.chain.run(call, task=task)


class _GeminiEmbeddings:
    def __init__(self, client: genai.Client, chain: ModelChain):
        self._client = client
        self.chain = chain

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        config = genai_types.EmbedContentConfig(
            task_type="SEMANTIC_SIMILARITY", output_dimensionality=EMBEDDING_DIMENSIONS
        )

        def call(model: str) -> list[list[float]]:
            # Every batch goes to the same model: vectors from different models are not comparable.
            vectors: list[list[float]] = []
            for start in range(0, len(texts), EMBEDDING_BATCH_SIZE):
                batch = texts[start : start + EMBEDDING_BATCH_SIZE]
                # One Content per text: multimodal models (gemini-embedding-2) treat a plain list of
                # strings as the parts of a single input and return one vector for all of them.
                contents = [genai_types.Content(parts=[genai_types.Part(text=t)]) for t in batch]
                response = self._client.models.embed_content(
                    model=model, contents=contents, config=config
                )
                embeddings = response.embeddings or []
                if len(embeddings) != len(batch):
                    raise AIProviderError(
                        "Embedding response size did not match the input.",
                        code=INVALID_OUTPUT_CODE,
                    )
                vectors.extend(list(item.values or []) for item in embeddings)
            return vectors

        return self.chain.run(call, task="embed")


def _parse_structured[T: BaseModel](
    response: genai_types.GenerateContentResponse, schema: type[T]
) -> T:
    parsed = response.parsed
    if isinstance(parsed, schema):
        return parsed
    raw_text = response.text
    if not raw_text:
        raise AIProviderError(
            "The AI provider returned an empty response.", code=INVALID_OUTPUT_CODE
        )
    try:
        return schema.model_validate_json(raw_text)
    except ValidationError as exc:
        # Structured-output validity is one of the evaluated properties; surface it explicitly.
        logger.warning("Gemini returned JSON that failed %s validation: %s", schema.__name__, exc)
        raise AIProviderError(
            "The AI provider returned an unexpected response format.", code=INVALID_OUTPUT_CODE
        ) from exc

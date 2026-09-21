# Provider-agnostic interfaces the AI pipeline depends on: structured LLM generation and embeddings.

from typing import Protocol, TypeVar

from pydantic import BaseModel

StructuredT = TypeVar("StructuredT", bound=BaseModel)


class LLMClient(Protocol):
    def generate_structured(
        self, *, task: str, prompt: str, schema: type[StructuredT]
    ) -> StructuredT:
        """Run the prompt and return a validated instance of `schema`.

        `task` names the pipeline step (e.g. "extract_requirements") so providers can log or
        stub per step without parsing the prompt text.
        """
        ...


class EmbeddingClient(Protocol):
    def embed(self, texts: list[str]) -> list[list[float]]:
        """Return one embedding vector per input text, in the same order."""
        ...


class AIProvider(Protocol):
    llm: LLMClient
    embeddings: EmbeddingClient

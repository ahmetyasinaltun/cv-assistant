# Unit tests for the Gemini provider's model fallback chain and structured-output parsing, without network access.

from types import SimpleNamespace

import httpx
import pytest
from google.genai import errors as genai_errors
from google.genai import types as genai_types
from pydantic import BaseModel

from app.ai.providers import gemini as gemini_module
from app.ai.providers.gemini import GeminiProvider, ModelChain, _GeminiEmbeddings, _parse_structured
from app.core.config import Settings
from app.core.errors import AIProviderError


class _Shape(BaseModel):
    value: int


class _FakeResponse:
    def __init__(self, parsed=None, text=None):
        self.parsed = parsed
        self.text = text


class _Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def _api_error(code: int, retry_delay: str | None = None) -> genai_errors.APIError:
    details = [{"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": retry_delay}]
    body = {
        "error": {
            "code": code,
            "message": "boom",
            "status": "X",
            "details": details if retry_delay else [],
        }
    }
    return genai_errors.APIError(code, body)


class _ScriptedModels:
    """Raises the scripted error for a model (once per call), otherwise answers with the model name."""

    def __init__(self, failures: dict[str, Exception]):
        self.failures = failures
        self.calls: list[str] = []

    def __call__(self, model: str) -> str:
        self.calls.append(model)
        if model in self.failures:
            raise self.failures[model]
        return model


@pytest.fixture
def clock():
    return _Clock()


def test_first_available_model_answers(clock):
    chain = ModelChain(["best", "next"], clock=clock)
    operation = _ScriptedModels({})

    assert chain.run(operation, task="t") == "best"
    assert operation.calls == ["best"]
    assert chain.served == {"best": 1}


def test_quota_error_falls_back_and_benches_until_googles_retry_time(clock):
    chain = ModelChain(["best", "next"], clock=clock)
    operation = _ScriptedModels({"best": _api_error(429, retry_delay="40s")})

    assert chain.run(operation, task="t") == "next"
    assert chain.run(operation, task="t") == "next"
    assert operation.calls == ["best", "next", "next"]  # the benched model is not asked again

    clock.now += 41
    del operation.failures["best"]
    assert chain.run(operation, task="t") == "best"


def test_retired_model_is_skipped_for_good(clock):
    chain = ModelChain(["retired", "next"], clock=clock)
    operation = _ScriptedModels({"retired": _api_error(404)})

    chain.run(operation, task="t")
    clock.now += 10 * 24 * 3600
    chain.run(operation, task="t")
    assert operation.calls == ["retired", "next", "next"]


@pytest.mark.parametrize(
    "error",
    [_api_error(503), _api_error(504), httpx.ReadTimeout("slow"), httpx.ConnectError("down")],
)
def test_overload_and_timeouts_fall_back_and_bench_briefly(clock, error):
    chain = ModelChain(["busy", "next"], clock=clock)
    operation = _ScriptedModels({"busy": error})

    assert chain.run(operation, task="t") == "next"
    chain.run(operation, task="t")
    assert operation.calls == ["busy", "next", "next"]

    clock.now += gemini_module.OVERLOAD_COOLDOWN_SECONDS + 1
    chain.run(operation, task="t")
    assert operation.calls[-2:] == ["busy", "next"]


def test_overloaded_models_get_another_try_when_every_model_is_benched(clock):
    # A short network drop benches every model; the next call must still reach the API.
    chain = ModelChain(["a", "b", "c"], clock=clock)
    operation = _ScriptedModels(
        {"a": httpx.ConnectError("down"), "b": _api_error(429), "c": httpx.ConnectError("down")}
    )
    with pytest.raises(AIProviderError):
        chain.run(operation, task="t")

    operation.failures = {"b": _api_error(429)}
    assert chain.run(operation, task="t") == "a"
    assert operation.calls == ["a", "b", "c", "a"]  # the quota-benched model was not retried


def test_malformed_output_falls_back_without_benching(clock):
    chain = ModelChain(["noisy", "next"], clock=clock)
    invalid = AIProviderError("bad json", code=gemini_module.INVALID_OUTPUT_CODE)
    operation = _ScriptedModels({"noisy": invalid})

    assert chain.run(operation, task="t") == "next"
    chain.run(operation, task="t")
    assert operation.calls == ["noisy", "next", "noisy", "next"]


def test_client_errors_fail_without_trying_other_models(clock):
    chain = ModelChain(["best", "next"], clock=clock)
    operation = _ScriptedModels({"best": _api_error(400)})

    with pytest.raises(AIProviderError) as exc_info:
        chain.run(operation, task="t")
    assert exc_info.value.code == "ai_provider_error"
    assert operation.calls == ["best"]


def test_provider_errors_keep_their_code(clock):
    chain = ModelChain(["best", "next"], clock=clock)
    operation = _ScriptedModels({"best": AIProviderError("specific", code="specific_code")})

    with pytest.raises(AIProviderError) as exc_info:
        chain.run(operation, task="t")
    assert exc_info.value.code == "specific_code"


def test_quota_spent_on_every_model_is_reported_as_such(clock):
    chain = ModelChain(["a", "b"], clock=clock)
    operation = _ScriptedModels({"a": _api_error(429), "b": _api_error(404)})

    with pytest.raises(AIProviderError) as exc_info:
        chain.run(operation, task="t")
    assert exc_info.value.code == gemini_module.QUOTA_EXHAUSTED_CODE
    assert exc_info.value.status_code == 503


def test_overload_on_every_model_is_a_temporary_failure(clock):
    chain = ModelChain(["a", "b"], clock=clock)
    operation = _ScriptedModels({"a": _api_error(429), "b": _api_error(503)})

    with pytest.raises(AIProviderError) as exc_info:
        chain.run(operation, task="t")
    assert exc_info.value.code == "ai_provider_error"


def test_quota_without_retry_info_uses_default_cooldown():
    assert (
        gemini_module.quota_retry_delay(_api_error(429))
        == gemini_module.DEFAULT_QUOTA_COOLDOWN_SECONDS
    )
    assert gemini_module.quota_retry_delay(_api_error(429, retry_delay="56372s")) == 56372.0


def test_embeddings_restart_on_the_next_model_so_vectors_never_mix(clock, monkeypatch):
    monkeypatch.setattr(gemini_module, "EMBEDDING_BATCH_SIZE", 2)
    requests: list[tuple[str, int]] = []

    def embed_content(*, model, contents, config):
        assert all(isinstance(item, genai_types.Content) for item in contents)
        requests.append((model, len(requests)))
        if model == "primary" and len(requests) == 2:
            raise _api_error(429)  # quota runs out on the second batch
        return SimpleNamespace(
            embeddings=[SimpleNamespace(values=[float(len(model))]) for _ in contents]
        )

    client = SimpleNamespace(models=SimpleNamespace(embed_content=embed_content))
    embeddings = _GeminiEmbeddings(client, ModelChain(["primary", "backup"], clock=clock))

    vectors = embeddings.embed(["a", "b", "c"])
    assert [model for model, _ in requests] == ["primary", "primary", "backup", "backup"]
    assert vectors == [[6.0], [6.0], [6.0]]  # every vector came from "backup"


def test_embedding_count_mismatch_falls_back_to_the_next_model(clock):
    def embed_content(*, model, contents, config):
        count = 1 if model == "merges-inputs" else len(contents)
        return SimpleNamespace(embeddings=[SimpleNamespace(values=[1.0]) for _ in range(count)])

    client = SimpleNamespace(models=SimpleNamespace(embed_content=embed_content))
    chain = ModelChain(["merges-inputs", "backup"], clock=clock)

    assert _GeminiEmbeddings(client, chain).embed(["a", "b"]) == [[1.0], [1.0]]
    assert chain.served == {"backup": 1}


def test_parse_structured_prefers_parsed_then_text():
    assert _parse_structured(_FakeResponse(parsed=_Shape(value=1)), _Shape).value == 1
    assert _parse_structured(_FakeResponse(text='{"value": 2}'), _Shape).value == 2
    with pytest.raises(AIProviderError) as exc_info:
        _parse_structured(_FakeResponse(text='{"value": "not-an-int"}'), _Shape)
    assert exc_info.value.code == gemini_module.INVALID_OUTPUT_CODE
    with pytest.raises(AIProviderError) as exc_info:
        _parse_structured(_FakeResponse(text=""), _Shape)
    assert exc_info.value.code == gemini_module.INVALID_OUTPUT_CODE


def test_missing_api_key_is_reported():
    with pytest.raises(AIProviderError) as exc_info:
        GeminiProvider(Settings(gemini_api_key=""))
    assert exc_info.value.code == "ai_provider_not_configured"

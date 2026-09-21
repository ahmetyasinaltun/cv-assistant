# Unit tests for the Gemini provider's retry policy and structured-output parsing, without network access.

import pytest
from google.genai import errors as genai_errors
from pydantic import BaseModel

from app.ai.providers import gemini as gemini_module
from app.ai.providers.gemini import GeminiProvider, _parse_structured
from app.core.config import Settings
from app.core.errors import AIProviderError


class _Shape(BaseModel):
    value: int


class _FakeResponse:
    def __init__(self, parsed=None, text=None):
        self.parsed = parsed
        self.text = text


@pytest.fixture
def provider(monkeypatch):
    monkeypatch.setattr(gemini_module.time, "sleep", lambda _: None)
    settings = Settings(gemini_api_key="dummy", ai_max_retries=2)
    return GeminiProvider(settings)


def _api_error(code: int) -> genai_errors.APIError:
    return genai_errors.APIError(code, {"error": {"message": "boom", "status": "X"}})


def test_retries_on_rate_limit_then_succeeds(provider):
    attempts = {"count": 0}

    def flaky():
        attempts["count"] += 1
        if attempts["count"] < 3:
            raise _api_error(429)
        return "ok"

    assert provider._with_retries(flaky, task="t") == "ok"
    assert attempts["count"] == 3


def test_gives_up_after_max_retries(provider):
    def always_failing():
        raise _api_error(503)

    with pytest.raises(AIProviderError):
        provider._with_retries(always_failing, task="t")


def test_does_not_retry_client_errors(provider):
    attempts = {"count": 0}

    def bad_request():
        attempts["count"] += 1
        raise _api_error(400)

    with pytest.raises(AIProviderError):
        provider._with_retries(bad_request, task="t")
    assert attempts["count"] == 1


def test_provider_errors_keep_their_code(provider):
    def not_configured():
        raise AIProviderError("specific", code="specific_code")

    with pytest.raises(AIProviderError) as exc_info:
        provider._with_retries(not_configured, task="t")
    assert exc_info.value.code == "specific_code"


def test_parse_structured_prefers_parsed_then_text():
    assert _parse_structured(_FakeResponse(parsed=_Shape(value=1)), _Shape).value == 1
    assert _parse_structured(_FakeResponse(text='{"value": 2}'), _Shape).value == 2
    with pytest.raises(AIProviderError) as exc_info:
        _parse_structured(_FakeResponse(text='{"value": "not-an-int"}'), _Shape)
    assert exc_info.value.code == gemini_module.INVALID_OUTPUT_CODE
    with pytest.raises(AIProviderError):
        _parse_structured(_FakeResponse(text=""), _Shape)


def test_missing_api_key_is_reported():
    with pytest.raises(AIProviderError) as exc_info:
        GeminiProvider(Settings(gemini_api_key=""))
    assert exc_info.value.code == "ai_provider_not_configured"

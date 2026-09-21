# Chooses the configured AI provider (Gemini or the offline fake) and caches a single instance.

from functools import lru_cache

from app.ai.providers.base import AIProvider
from app.core.config import get_settings


@lru_cache
def get_ai_provider() -> AIProvider:
    settings = get_settings()
    if settings.ai_provider == "fake":
        from app.ai.providers.fake import FakeProvider

        return FakeProvider()
    from app.ai.providers.gemini import GeminiProvider

    return GeminiProvider(settings)

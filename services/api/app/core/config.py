# Loads application settings from environment variables and exposes a single validated Settings object.

from functools import lru_cache

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_JWT_SECRET = "dev-only-secret-change-me-before-deploying-0000"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "CV Assistant API"
    environment: str = Field(default="development", pattern="^(development|test|production)$")
    debug: bool = False

    database_url: str = "postgresql+psycopg://career:career@localhost:5434/career_assistant"

    jwt_secret_key: str = Field(default=DEV_JWT_SECRET, min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    cors_origins: list[str] = ["http://localhost:3000"]

    max_upload_size_bytes: int = 5 * 1024 * 1024
    max_document_chars: int = 30_000

    # AI provider configuration. Each list is a fallback chain: free-tier quotas are per model, so a
    # request moves down the list when a model is out of quota, overloaded or retired.
    # LLM order is "reliable first, then most capable" (probes of 2026-10-25): the Flash-Lite and
    # Gemma 26B models answered every time in seconds, while the full Flash models were often
    # overloaded (60 s timeouts) and have daily free quotas of only a few dozen requests.
    # Models change often; re-check with Google AI Studio and the eval runner.
    ai_provider: str = Field(default="gemini", pattern="^(gemini|fake)$")
    gemini_api_key: str = ""
    gemini_llm_models: list[str] = Field(
        default=[
            "gemini-3.5-flash-lite",
            "gemma-4-26b-a4b-it",
            "gemini-3.1-flash-lite",
            "gemini-3-flash-preview",
            "gemini-3.6-flash",
            "gemini-3.5-flash",
            "gemini-3.8-flash",
            "gemini-3.7-flash",
            "gemma-4-31b-it",
        ],
        min_length=1,
    )
    gemini_embedding_models: list[str] = Field(
        default=["gemini-embedding-2", "gemini-embedding-001"], min_length=1
    )
    ai_request_timeout_seconds: float = 60.0

    @field_validator("database_url")
    @classmethod
    def name_the_psycopg_driver(cls, value: str) -> str:
        """Hosted Postgres (Neon, Render) hands out postgres:// URLs; SQLAlchemy needs the driver named."""
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value.removeprefix(prefix)
        return value

    @model_validator(mode="after")
    def refuse_development_secrets_in_production(self) -> "Settings":
        """Fail at start-up, not at the first request, when a deployment forgot a secret."""
        if self.environment == "production":
            if self.jwt_secret_key == DEV_JWT_SECRET:
                raise ValueError("JWT_SECRET_KEY must be set to a random value in production.")
            if self.ai_provider == "gemini" and not self.gemini_api_key:
                raise ValueError("GEMINI_API_KEY must be set in production.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()

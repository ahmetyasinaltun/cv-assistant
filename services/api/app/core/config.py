# Loads application settings from environment variables and exposes a single validated Settings object.

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "AI Career Assistant API"
    environment: str = Field(default="development", pattern="^(development|test|production)$")
    debug: bool = False

    database_url: str = "postgresql+psycopg://career:career@localhost:5434/career_assistant"

    jwt_secret_key: str = Field(
        default="dev-only-secret-change-me-before-deploying-0000", min_length=32
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    cors_origins: list[str] = ["http://localhost:3000"]

    max_upload_size_bytes: int = 5 * 1024 * 1024
    max_document_chars: int = 30_000

    # AI provider configuration. Model names are configurable because free-tier quotas change.
    ai_provider: str = Field(default="gemini", pattern="^(gemini|fake)$")
    gemini_api_key: str = ""
    gemini_llm_model: str = "gemini-2.5-flash"
    gemini_embedding_model: str = "gemini-embedding-001"
    ai_request_timeout_seconds: float = 60.0
    ai_max_retries: int = 2


@lru_cache
def get_settings() -> Settings:
    return Settings()

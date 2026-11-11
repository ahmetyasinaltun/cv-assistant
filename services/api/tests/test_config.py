# Unit tests for deployment-facing settings: hosted database URLs and the production secret checks.

import pytest
from pydantic import ValidationError

from app.core.config import DEV_JWT_SECRET, Settings


def settings(**values) -> Settings:
    """Settings from the given values only: no .env file, and the provider stated (tests run with the fake)."""
    return Settings(_env_file=None, **{"ai_provider": "gemini", **values})


def test_hosted_postgres_urls_get_the_psycopg_driver():
    neon = "postgresql://user:pw@ep-x.eu-central-1.aws.neon.tech/db?sslmode=require"
    assert settings(database_url=neon).database_url == (
        "postgresql+psycopg://user:pw@ep-x.eu-central-1.aws.neon.tech/db?sslmode=require"
    )
    assert (
        settings(database_url="postgres://u:p@h/db").database_url == "postgresql+psycopg://u:p@h/db"
    )
    local = "postgresql+psycopg://career:career@localhost:5434/career_assistant"
    assert settings(database_url=local).database_url == local


def test_production_refuses_the_development_jwt_secret():
    with pytest.raises(ValidationError, match="JWT_SECRET_KEY"):
        settings(environment="production", jwt_secret_key=DEV_JWT_SECRET, gemini_api_key="key")


def test_production_needs_a_gemini_key():
    with pytest.raises(ValidationError, match="GEMINI_API_KEY"):
        settings(environment="production", jwt_secret_key="x" * 48, gemini_api_key="")


PRODUCTION = {
    "environment": "production",
    "jwt_secret_key": "x" * 48,
    "gemini_api_key": "key",
    "email_provider": "brevo",
    "brevo_api_key": "brevo-key",
    "email_sender_address": "codes@example.com",
    "web_proxy_secret": "s" * 40,
}


def test_production_with_real_secrets_starts():
    assert settings(**PRODUCTION).environment == "production"


@pytest.mark.parametrize(
    "missing",
    [
        {"email_provider": "log"},
        {"brevo_api_key": ""},
        {"email_sender_address": ""},
    ],
)
def test_production_needs_a_real_email_service(missing):
    # The log sender would swallow every code, and nobody could verify an account.
    with pytest.raises(ValidationError, match="BREVO_API_KEY"):
        settings(**{**PRODUCTION, **missing})


@pytest.mark.parametrize("secret", ["", "too-short"])
def test_production_needs_a_long_web_proxy_secret(secret):
    with pytest.raises(ValidationError, match="WEB_PROXY_SECRET"):
        settings(**{**PRODUCTION, "web_proxy_secret": secret})

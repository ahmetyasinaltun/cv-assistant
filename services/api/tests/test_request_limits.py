# Tests for the API's outer limits: the request size cap, the upload read limit and the schema pages that the
# deployed API does not publish.

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.request_size import MAX_REQUEST_BYTES
from app.main import create_app


def test_a_body_declared_larger_than_any_real_request_is_refused_before_it_is_read(
    client, auth_headers
):
    oversized = b"x" * (MAX_REQUEST_BYTES + 1)
    response = client.post(
        "/resumes", content=oversized, headers={**auth_headers, "content-type": "application/json"}
    )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "request_too_large"


def test_an_upload_over_the_limit_is_refused_without_reading_all_of_it(client, auth_headers):
    too_large = b"%PDF" + b"0" * get_settings().max_upload_size_bytes
    response = client.post(
        "/resumes/upload",
        data={"title": "Big"},
        files={"file": ("cv.pdf", too_large, "application/pdf")},
        headers=auth_headers,
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "file_too_large"


def test_the_deployed_api_does_not_publish_its_schema(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("JWT_SECRET_KEY", "a-production-like-secret-of-at-least-32-bytes")
    monkeypatch.setenv("GEMINI_API_KEY", "not-used-here")
    monkeypatch.setenv("EMAIL_PROVIDER", "brevo")
    monkeypatch.setenv("BREVO_API_KEY", "not-used-here")
    monkeypatch.setenv("EMAIL_SENDER_ADDRESS", "codes@example.com")
    monkeypatch.setenv("WEB_PROXY_SECRET", "s" * 40)
    get_settings.cache_clear()
    try:
        with TestClient(create_app()) as production:
            for path in ("/docs", "/redoc", "/openapi.json"):
                assert production.get(path).status_code == 404
            assert production.get("/health").status_code == 200
    finally:
        get_settings.cache_clear()

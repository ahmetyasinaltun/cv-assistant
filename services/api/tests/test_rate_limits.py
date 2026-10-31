# Tests for the usage limits: the sliding window on a fake clock, failed sign-ins per email, analyses and interview
# questions per user (only successful ones count) and link reads per user.

import uuid

import pytest

from app.api.routes.job_descriptions import get_posting_import_service
from app.core.errors import TooManyRequestsError
from app.core.rate_limit import ANALYSES, INTERVIEW_QUESTIONS, LINK_IMPORTS, SlidingWindowLimiter
from app.services.posting_import.fetch import FetchedPage
from app.services.posting_import.service import PostingImportService
from tests.conftest import SAMPLE_JOB, SAMPLE_RESUME, register_user


class FakeClock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def test_the_window_allows_the_limit_refuses_the_next_and_slides():
    clock = FakeClock()
    limiter = SlidingWindowLimiter(2, 60, message="slow down", clock=clock)
    limiter.hit("a")
    clock.now += 10
    limiter.hit("a")
    with pytest.raises(TooManyRequestsError) as refused:
        limiter.hit("a")
    # The oldest event leaves the window 50 seconds from now.
    assert refused.value.retry_after_seconds == 50
    limiter.hit("b")  # other keys are counted on their own

    clock.now += 50
    limiter.hit("a")


def test_check_does_not_count_and_record_does():
    limiter = SlidingWindowLimiter(1, 60, message="slow down", clock=FakeClock())
    limiter.check("a")
    limiter.check("a")
    limiter.record("a")
    with pytest.raises(TooManyRequestsError):
        limiter.check("a")


def test_ten_failed_sign_ins_pause_that_email_even_for_the_right_password(client):
    register_user(client)
    for _ in range(10):
        wrong = client.post(
            "/auth/login", json={"email": "jane@example.com", "password": "wrong-password"}
        )
        assert wrong.status_code == 401
    paused = client.post(
        "/auth/login", json={"email": "jane@example.com", "password": "correct-horse-battery"}
    )
    assert paused.status_code == 429
    assert paused.json()["error"]["code"] == "rate_limited"
    assert int(paused.headers["retry-after"]) > 0

    register_user(client, email="other@example.com")
    other = client.post(
        "/auth/login", json={"email": "other@example.com", "password": "correct-horse-battery"}
    )
    assert other.status_code == 200


def _documents(client, headers) -> dict:
    resume = client.post("/resumes", json={"title": "CV", "text": SAMPLE_RESUME}, headers=headers)
    job = client.post(
        "/job-descriptions", json={"title": "Backend", "text": SAMPLE_JOB}, headers=headers
    )
    return {"resume_id": resume.json()["id"], "job_description_id": job.json()["id"]}


def test_analyses_per_user_count_only_the_ones_that_start(client, auth_headers, monkeypatch):
    monkeypatch.setattr(ANALYSES, "limit", 2)
    documents = _documents(client, auth_headers)
    missing = client.post(
        "/analyses", json={**documents, "resume_id": str(uuid.uuid4())}, headers=auth_headers
    )
    assert missing.status_code == 404
    for _ in range(2):
        assert client.post("/analyses", json=documents, headers=auth_headers).status_code == 202
    refused = client.post("/analyses", json=documents, headers=auth_headers)
    assert refused.status_code == 429
    assert refused.json()["error"]["code"] == "rate_limited"

    other = register_user(client, email="other@example.com")
    assert (
        client.post("/analyses", json=_documents(client, other), headers=other).status_code == 202
    )


def test_interview_questions_per_user(client, auth_headers, monkeypatch):
    monkeypatch.setattr(INTERVIEW_QUESTIONS, "limit", 1)
    analysis_id = client.post(
        "/analyses", json=_documents(client, auth_headers), headers=auth_headers
    ).json()["id"]
    path = f"/analyses/{analysis_id}/interview-questions"
    assert client.post(path, headers=auth_headers).status_code == 200
    assert client.post(path, headers=auth_headers).status_code == 429


def test_link_reads_per_user(client, auth_headers, monkeypatch):
    monkeypatch.setattr(LINK_IMPORTS, "limit", 1)
    page = (
        b"<main><h1>Intern</h1><p>"
        + b"We need a backend intern who writes Python. " * 3
        + b"</p></main>"
    )
    client.app.dependency_overrides[get_posting_import_service] = lambda: PostingImportService(
        lambda url: FetchedPage(url, page, "utf-8")
    )
    body = {"url": "https://jobs.example/intern"}
    assert (
        client.post("/job-descriptions/import", json=body, headers=auth_headers).status_code == 200
    )
    refused = client.post("/job-descriptions/import", json=body, headers=auth_headers)
    assert refused.status_code == 429

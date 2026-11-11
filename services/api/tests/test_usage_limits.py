# Tests the database-counted limits: the service-wide daily AI budget and the per-address limits on accounts and
# AI actions, including which address counts when the web server forwards its visitor's address.

from datetime import timedelta

import pytest
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.base import utc_now
from app.models.usage_event import UsageEvent
from tests.conftest import SAMPLE_JOB, SAMPLE_RESUME, register_user


@pytest.fixture
def limits(monkeypatch):
    """Small limits for the test; the settings object is shared, so changes are undone afterwards."""
    settings = get_settings()

    def apply(**values):
        for name, value in values.items():
            monkeypatch.setattr(settings, name, value)

    return apply


def start_analysis(client, headers, address="203.0.113.1"):
    resume = client.post(
        "/resumes", json={"title": "CV", "text": SAMPLE_RESUME}, headers=headers
    ).json()
    job = client.post(
        "/job-descriptions", json={"title": "Backend", "text": SAMPLE_JOB}, headers=headers
    ).json()
    return client.post(
        "/analyses",
        json={"resume_id": resume["id"], "job_description_id": job["id"]},
        headers={**headers, "X-Forwarded-For": address},
    )


def register_from(client, email, address):
    return client.post(
        "/auth/register",
        json={"email": email, "full_name": "Deniz Kurgu", "password": "correct-horse-battery"},
        headers={"X-Forwarded-For": address},
    )


def test_the_daily_ai_budget_is_shared_by_every_account(client, limits):
    limits(ai_daily_budget=2)
    first = register_user(client, "one@example.com")
    second = register_user(client, "two@example.com")
    assert start_analysis(client, first, "203.0.113.1").status_code == 202
    assert start_analysis(client, second, "203.0.113.2").status_code == 202

    refused = start_analysis(client, second, "203.0.113.3")
    assert refused.status_code == 429
    assert refused.json()["error"]["code"] == "daily_budget_reached"
    assert 0 < int(refused.headers["Retry-After"]) <= 24 * 60 * 60


def test_ai_actions_older_than_a_day_no_longer_count(client, engine, limits):
    limits(ai_daily_budget=1)
    headers = register_user(client)
    assert start_analysis(client, headers).status_code == 202
    with Session(engine) as db:
        for event in db.query(UsageEvent).filter_by(kind="analysis"):
            event.created_at = utc_now() - timedelta(days=1, minutes=1)
        db.commit()
    assert start_analysis(client, headers).status_code == 202


def test_one_address_has_its_own_share_of_ai_actions(client, limits):
    limits(address_daily_ai_actions=1)
    headers = register_user(client)
    assert start_analysis(client, headers, "203.0.113.7").status_code == 202
    refused = start_analysis(client, headers, "203.0.113.7")
    assert refused.status_code == 429 and refused.json()["error"]["code"] == "rate_limited"
    assert start_analysis(client, headers, "198.51.100.4").status_code == 202


def test_accounts_per_address_are_limited(client, limits):
    limits(address_daily_registrations=2)
    assert register_from(client, "a@example.com", "203.0.113.9").status_code == 201
    assert register_from(client, "b@example.com", "203.0.113.9").status_code == 201
    refused = register_from(client, "c@example.com", "203.0.113.9")
    assert refused.status_code == 429
    assert "Retry-After" in refused.headers
    assert register_from(client, "c@example.com", "198.51.100.1").status_code == 201


def test_a_forwarded_address_counts_only_with_the_web_server_secret(client, limits):
    limits(address_daily_registrations=1, web_proxy_secret="s" * 40)
    # Without the secret, the made-up header is ignored and the connection's own address counts.
    spoofed = {"X-Client-Address": "192.0.2.1", "X-Forwarded-For": "203.0.113.20"}
    assert client.post("/auth/register", json=_account("a"), headers=spoofed).status_code == 201
    spoofed["X-Client-Address"] = "192.0.2.2"
    assert client.post("/auth/register", json=_account("b"), headers=spoofed).status_code == 429

    # With the secret, the web server's visitors count one by one.
    web = {"X-Proxy-Secret": "s" * 40, "X-Forwarded-For": "203.0.113.20"}
    assert (
        client.post(
            "/auth/register", json=_account("c"), headers={**web, "X-Client-Address": "192.0.2.3"}
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/auth/register", json=_account("d"), headers={**web, "X-Client-Address": "192.0.2.4"}
        ).status_code
        == 201
    )


def test_addresses_are_stored_only_as_keyed_hashes(client, engine):
    register_from(client, "a@example.com", "203.0.113.30")
    with Session(engine) as db:
        keys = {event.address_key for event in db.query(UsageEvent)}
    assert keys and all(key and "203.0.113.30" not in key for key in keys)


def _account(name: str) -> dict:
    return {
        "email": f"{name}@example.com",
        "full_name": "Deniz Kurgu",
        "password": "correct-horse-battery",
    }

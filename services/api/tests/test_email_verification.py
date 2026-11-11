# Tests email verification: the code sent at registration, confirming it, wrong and expired codes, resending,
# and AI actions that stay locked until the address is verified.

from datetime import timedelta

from app.db.base import utc_now
from app.models.user import User
from tests.conftest import SAMPLE_JOB, SAMPLE_RESUME


def register(client, email="new@example.com", language="en"):
    response = client.post(
        "/auth/register",
        json={
            "email": email,
            "full_name": "Deniz Kurgu",
            "password": "correct-horse-battery",
            "preferred_language": language,
        },
    )
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}, response.json()["user"]


def confirm(client, headers, code):
    return client.post("/me/email-verification/confirm", json={"code": code}, headers=headers)


def user_row(engine, email) -> User:
    from sqlalchemy.orm import Session

    with Session(engine) as db:
        return db.query(User).filter_by(email=email).one()


def test_registration_signs_in_unverified_and_emails_a_code(client):
    _, user = register(client, language="tr")
    assert user["email_verified"] is False
    (message,) = client.outbox.to("new@example.com")
    code = client.outbox.last_code("new@example.com")
    assert code in message.subject and code in message.text and code in message.html
    assert message.subject.startswith("CV Assistant doğrulama kodun")


def test_the_code_is_stored_only_as_a_hash(client, engine):
    register(client)
    row = user_row(engine, "new@example.com")
    assert (
        row.verification_code_hash
        and client.outbox.last_code("new@example.com") not in row.verification_code_hash
    )


def test_an_unverified_account_cannot_spend_the_ai_quota(client):
    headers, _ = register(client)
    resume = client.post(
        "/resumes", json={"title": "CV", "text": SAMPLE_RESUME}, headers=headers
    ).json()
    job = client.post(
        "/job-descriptions", json={"title": "Backend", "text": SAMPLE_JOB}, headers=headers
    ).json()
    refused = client.post(
        "/analyses",
        json={"resume_id": resume["id"], "job_description_id": job["id"]},
        headers=headers,
    )
    assert refused.status_code == 403
    assert refused.json()["error"]["code"] == "email_not_verified"
    assert (
        client.post(f"/resumes/{resume['id']}/cv-documents", json={}, headers=headers).status_code
        == 403
    )

    assert confirm(client, headers, client.outbox.last_code("new@example.com")).status_code == 200
    started = client.post(
        "/analyses",
        json={"resume_id": resume["id"], "job_description_id": job["id"]},
        headers=headers,
    )
    assert started.status_code == 202


def test_the_right_code_verifies_the_account(client):
    headers, _ = register(client)
    response = confirm(client, headers, client.outbox.last_code("new@example.com"))
    assert response.status_code == 200
    assert response.json()["email_verified"] is True
    assert client.get("/me", headers=headers).json()["email_verified"] is True
    # Confirming again is harmless, and a verified account gets no more codes.
    assert confirm(client, headers, "000000").status_code == 200
    resend = client.post("/me/email-verification", headers=headers)
    assert resend.status_code == 409 and resend.json()["error"]["code"] == "already_verified"


def test_wrong_codes_are_counted_and_end_after_five(client):
    headers, _ = register(client)
    code = client.outbox.last_code("new@example.com")
    wrong = "111111" if code != "111111" else "222222"
    for _ in range(5):
        response = confirm(client, headers, wrong)
        assert response.status_code == 422 and response.json()["error"]["code"] == "code_invalid"
    blocked = confirm(client, headers, code)
    assert blocked.status_code == 429 and blocked.json()["error"]["code"] == "too_many_attempts"


def test_an_expired_code_is_refused(client, engine):
    from sqlalchemy.orm import Session

    headers, _ = register(client)
    code = client.outbox.last_code("new@example.com")
    with Session(engine) as db:
        row = db.query(User).filter_by(email="new@example.com").one()
        row.verification_code_expires_at = utc_now() - timedelta(seconds=1)
        db.commit()
    response = confirm(client, headers, code)
    assert response.status_code == 422 and response.json()["error"]["code"] == "code_expired"


def test_a_code_must_be_six_digits(client):
    headers, _ = register(client)
    assert confirm(client, headers, "12345").status_code == 422
    assert confirm(client, headers, "abcdef").status_code == 422


def test_a_new_code_replaces_the_old_one_after_a_minute(client, engine):
    from sqlalchemy.orm import Session

    from app.models.usage_event import UsageEvent

    headers, _ = register(client)
    first = client.outbox.last_code("new@example.com")
    too_soon = client.post("/me/email-verification", headers=headers)
    assert too_soon.status_code == 429 and int(too_soon.headers["Retry-After"]) <= 60

    with Session(engine) as db:  # the first code was sent two minutes ago
        for event in db.query(UsageEvent).filter_by(kind="verification_email"):
            event.created_at = utc_now() - timedelta(minutes=2)
        db.commit()
    resent = client.post("/me/email-verification", headers=headers)
    assert resent.status_code == 202 and resent.json() == {"sent_to": "new@example.com"}
    second = client.outbox.last_code("new@example.com")
    if second != first:
        assert confirm(client, headers, first).json()["error"]["code"] == "code_invalid"
    assert confirm(client, headers, second).status_code == 200


def test_registration_works_when_the_email_service_fails(client):
    from app.core.email import get_email_sender
    from app.core.errors import EmailDeliveryError

    class Failing:
        def send(self, message):
            raise EmailDeliveryError("down")

    client.app.dependency_overrides[get_email_sender] = lambda: Failing()
    headers, user = register(client)
    assert user["email_verified"] is False
    resend = client.post("/me/email-verification", headers=headers)
    # The first attempt counts for the one-minute gap, so the account cannot hammer the failing service.
    assert resend.status_code == 429

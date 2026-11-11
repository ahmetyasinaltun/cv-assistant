# Shared pytest fixtures: isolated in-memory database, test client and authenticated helpers.

import os
import re

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("AI_PROVIDER", "fake")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-that-is-at-least-32-bytes")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, event  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.core.email import EmailMessage, get_email_sender  # noqa: E402
from app.core.rate_limit import ALL_LIMITERS  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import get_db, get_session_factory  # noqa: E402
from app.main import create_app  # noqa: E402

SAMPLE_RESUME = """
Jane Doe
Software Engineering Student

Experience
- Backend Intern, Acme Corp (2025): Built REST APIs with Python and FastAPI, wrote unit tests with pytest.
- Teaching Assistant, Data Structures (2024): Led weekly lab sessions for 40 students.

Projects
- Inventory Tracker: React and TypeScript frontend with a PostgreSQL database.

Skills
Python, FastAPI, SQL, Git, Docker basics
"""

SAMPLE_JOB = """
Junior Backend Developer

Requirements
- 1+ years experience with Python web frameworks (Django or FastAPI)
- Strong SQL and relational database knowledge (PostgreSQL preferred)
- Familiarity with Docker and CI/CD pipelines
- Experience with Kubernetes is a plus
- Good communication skills
"""


class Outbox:
    """Stands in for the email service: keeps every message so a test can read the code it carries."""

    def __init__(self):
        self.sent: list[EmailMessage] = []

    def send(self, message: EmailMessage) -> None:
        self.sent.append(message)

    def to(self, address: str) -> list[EmailMessage]:
        return [message for message in self.sent if message.to_address == address]

    def last_code(self, address: str) -> str:
        return CODE.search(self.to(address)[-1].text).group(1)


CODE = re.compile(r"\b(\d{6})\b")


@pytest.fixture
def outbox() -> Outbox:
    return Outbox()


@pytest.fixture(autouse=True)
def fresh_rate_limits():
    """The limiters keep counts in memory for the whole process; every test starts from zero."""
    for limiter in ALL_LIMITERS:
        limiter.reset()
    yield


@pytest.fixture
def engine():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    # SQLite ignores foreign keys unless asked, so ON DELETE CASCADE / SET NULL would go untested.
    @event.listens_for(engine, "connect")
    def enforce_foreign_keys(dbapi_connection, _):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)


@pytest.fixture
def client(engine, outbox):
    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_session_factory] = lambda: TestingSession
    app.dependency_overrides[get_email_sender] = lambda: outbox
    with TestClient(app) as test_client:
        test_client.outbox = outbox
        yield test_client


def register_user(client: TestClient, email: str = "jane@example.com") -> dict:
    response = client.post(
        "/auth/register",
        json={"email": email, "full_name": "Jane Doe", "password": "correct-horse-battery"},
    )
    assert response.status_code == 201, response.text
    headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
    # Most tests act as a verified user, so they go through the real flow: read the emailed code, confirm it.
    code = client.outbox.last_code(email)
    confirmed = client.post("/me/email-verification/confirm", json={"code": code}, headers=headers)
    assert confirmed.status_code == 200, confirmed.text
    return headers


@pytest.fixture
def auth_headers(client) -> dict:
    return register_user(client)

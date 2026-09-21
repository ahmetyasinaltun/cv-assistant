# Integration tests for registration, login, token validation and protected endpoints.

from tests.conftest import register_user


def test_register_returns_token_and_user(client):
    response = client.post(
        "/auth/register",
        json={"email": "Jane@Example.com", "full_name": "Jane", "password": "long-enough-pw"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "jane@example.com"
    assert "password" not in body["user"]


def test_register_duplicate_email_conflicts(client):
    register_user(client)
    response = client.post(
        "/auth/register",
        json={"email": "jane@example.com", "full_name": "Other", "password": "long-enough-pw"},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "email_taken"


def test_register_rejects_short_password(client):
    response = client.post(
        "/auth/register", json={"email": "a@b.co", "full_name": "A", "password": "short"}
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_failed"


def test_login_success_and_me(client):
    register_user(client)
    response = client.post(
        "/auth/login", json={"email": "jane@example.com", "password": "correct-horse-battery"}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    me = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "jane@example.com"


def test_login_wrong_password_is_unauthorized(client):
    register_user(client)
    response = client.post("/auth/login", json={"email": "jane@example.com", "password": "nope"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_credentials"


def test_me_requires_token(client):
    assert client.get("/me").status_code == 401
    bad = client.get("/me", headers={"Authorization": "Bearer not-a-token"})
    assert bad.status_code == 401
    assert bad.json()["error"]["code"] == "invalid_token"

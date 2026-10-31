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


def test_register_stores_the_preferred_language(client):
    default = client.post(
        "/auth/register",
        json={"email": "en@example.com", "full_name": "En", "password": "long-enough-pw"},
    )
    assert default.json()["user"]["preferred_language"] == "en"
    turkish = client.post(
        "/auth/register",
        json={
            "email": "tr@example.com",
            "full_name": "Tr",
            "password": "long-enough-pw",
            "preferred_language": "tr",
        },
    )
    assert turkish.status_code == 201
    token = turkish.json()["access_token"]
    me = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["preferred_language"] == "tr"


def test_preferred_language_can_be_changed_and_is_validated(client, auth_headers):
    updated = client.patch("/me", json={"preferred_language": "tr"}, headers=auth_headers)
    assert updated.status_code == 200, updated.text
    assert updated.json()["preferred_language"] == "tr"
    assert client.get("/me", headers=auth_headers).json()["preferred_language"] == "tr"

    unsupported = client.patch("/me", json={"preferred_language": "de"}, headers=auth_headers)
    assert unsupported.status_code == 422
    assert client.get("/me", headers=auth_headers).json()["preferred_language"] == "tr"
    assert client.patch("/me", json={"preferred_language": "en"}).status_code == 401


def test_a_password_longer_than_bcrypt_reads_is_refused_not_a_crash(client):
    # 40 × "ş" is 80 bytes: within the 128-character field limit, beyond what bcrypt accepts.
    response = client.post(
        "/auth/register",
        json={"email": "long@example.com", "full_name": "Long", "password": "ş" * 40},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "password_too_long"

    register_user(client)
    login = client.post("/auth/login", json={"email": "jane@example.com", "password": "ş" * 40})
    assert login.status_code == 401
    assert login.json()["error"]["code"] == "invalid_credentials"


def test_an_unknown_email_fails_like_a_wrong_password(client):
    register_user(client)
    unknown = client.post(
        "/auth/login", json={"email": "nobody@example.com", "password": "whatever-pw"}
    )
    wrong = client.post(
        "/auth/login", json={"email": "jane@example.com", "password": "whatever-pw"}
    )
    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json() == wrong.json()

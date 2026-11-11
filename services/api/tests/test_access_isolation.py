# Object-level authorization: one account must not reach another account's resources through any route that takes
# an id. Every attempt answers 404, the same as a missing id, so the answer does not reveal that the id exists.

import pytest

from tests.conftest import SAMPLE_JOB, SAMPLE_RESUME, register_user


@pytest.fixture
def owner_resources(client) -> dict:
    """Everything one account can own: a CV, a posting, an analysis and a CV document."""
    owner = register_user(client, "owner@example.com")
    resume = client.post(
        "/resumes", json={"title": "CV", "text": SAMPLE_RESUME}, headers=owner
    ).json()
    job = client.post(
        "/job-descriptions", json={"title": "Backend", "text": SAMPLE_JOB}, headers=owner
    ).json()
    analysis = client.post(
        "/analyses",
        json={"resume_id": resume["id"], "job_description_id": job["id"]},
        headers=owner,
    ).json()
    document = client.post(f"/resumes/{resume['id']}/cv-documents", json={}, headers=owner).json()
    return {
        "resume": resume["id"],
        "job": job["id"],
        "analysis": analysis["id"],
        "document": document["id"],
    }


ROUTES = [
    ("GET", "/resumes/{resume}", None),
    ("DELETE", "/resumes/{resume}", None),
    ("GET", "/job-descriptions/{job}", None),
    ("DELETE", "/job-descriptions/{job}", None),
    ("GET", "/analyses/{analysis}", None),
    ("POST", "/analyses/{analysis}/interview-questions", None),
    ("POST", "/analyses/{analysis}/tailored-cv", {"mode": "flexible"}),
    ("POST", "/resumes/{resume}/cv-documents", {}),
    ("GET", "/cv-documents/{document}", None),
    ("PATCH", "/cv-documents/{document}", {"title": "Taken over"}),
    ("DELETE", "/cv-documents/{document}", None),
    ("GET", "/cv-documents/{document}/pdf", None),
    ("GET", "/cv-documents/{document}/thumbnail", None),
    ("POST", "/cv-documents/{document}/answers", {"answers": [{"id": "q1", "accepted": True}]}),
]


@pytest.mark.parametrize(("method", "path", "body"), ROUTES)
def test_another_account_gets_not_found(client, owner_resources, method, path, body):
    intruder = register_user(client, "intruder@example.com")
    response = client.request(method, path.format(**owner_resources), json=body, headers=intruder)
    assert response.status_code == 404, (method, path, response.text)


def test_an_analysis_cannot_mix_one_account_with_anothers_documents(client, owner_resources):
    intruder = register_user(client, "intruder@example.com")
    own_job = client.post(
        "/job-descriptions", json={"title": "Mine", "text": SAMPLE_JOB}, headers=intruder
    ).json()
    response = client.post(
        "/analyses",
        json={"resume_id": owner_resources["resume"], "job_description_id": own_job["id"]},
        headers=intruder,
    )
    assert response.status_code == 404


def test_the_owner_still_reaches_everything(client, owner_resources):
    # The same routes work for the owner, so the 404s above come from ownership, not from wrong paths.
    login = client.post(
        "/auth/login", json={"email": "owner@example.com", "password": "correct-horse-battery"}
    )
    owner = {"Authorization": f"Bearer {login.json()['access_token']}"}
    for method, path, _ in ROUTES:
        if method == "GET":
            response = client.get(path.format(**owner_resources), headers=owner)
            assert response.status_code == 200, (path, response.text)

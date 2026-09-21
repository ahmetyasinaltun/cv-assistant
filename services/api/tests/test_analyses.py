# Integration tests for the analysis endpoints using the deterministic fake AI provider.

from tests.conftest import SAMPLE_JOB, SAMPLE_RESUME, register_user


def _create_documents(client, headers) -> tuple[str, str]:
    resume = client.post("/resumes", json={"title": "CV", "text": SAMPLE_RESUME}, headers=headers)
    job = client.post(
        "/job-descriptions",
        json={"title": "Junior Backend Developer", "company": "Acme", "text": SAMPLE_JOB},
        headers=headers,
    )
    return resume.json()["id"], job.json()["id"]


def test_analysis_runs_and_returns_structured_result(client, auth_headers):
    resume_id, job_id = _create_documents(client, auth_headers)
    created = client.post(
        "/analyses",
        json={"resume_id": resume_id, "job_description_id": job_id},
        headers=auth_headers,
    )
    assert created.status_code == 202, created.text
    analysis_id = created.json()["id"]

    # TestClient runs background tasks before returning, so the analysis is already complete.
    detail = client.get(f"/analyses/{analysis_id}", headers=auth_headers)
    assert detail.status_code == 200
    body = detail.json()
    assert body["status"] == "completed", body.get("error_message")
    assert body["job_title"] == "Junior Backend Developer"
    assert body["resume_title"] == "CV"

    result = body["result"]
    assert 0 <= result["overall"]["score"] <= 100
    assert result["overall"]["fit_level"] in {"strong", "moderate", "weak"}
    assert result["overall"]["score_explanation"]
    assert len(result["requirements"]) == 5
    statuses = {r["text"]: r["status"] for r in result["requirements"]}
    assert (
        statuses["1+ years experience with Python web frameworks (Django or FastAPI)"] == "matched"
    )
    assert statuses["Experience with Kubernetes is a plus"] == "missing"
    kubernetes = next(r for r in result["requirements"] if "Kubernetes" in r["text"])
    assert kubernetes["importance"] == "nice_to_have"
    assert kubernetes["evidence"] == []
    python_req = next(r for r in result["requirements"] if "Python" in r["text"])
    assert python_req["evidence"][0]["quote"].startswith("Backend Intern")
    assert result["candidate_evidence"]
    assert any(s["related_requirement_ids"] == [kubernetes["id"]] for s in result["suggestions"])
    assert body["score"] == result["overall"]["score"]


def test_analysis_list_and_isolation(client):
    jane = register_user(client, "jane@example.com")
    bob = register_user(client, "bob@example.com")
    resume_id, job_id = _create_documents(client, jane)
    created = client.post(
        "/analyses", json={"resume_id": resume_id, "job_description_id": job_id}, headers=jane
    )
    analysis_id = created.json()["id"]

    listed = client.get("/analyses", headers=jane).json()
    assert [a["id"] for a in listed] == [analysis_id]
    assert listed[0]["status"] == "completed"
    assert client.get("/analyses", headers=bob).json() == []
    assert client.get(f"/analyses/{analysis_id}", headers=bob).status_code == 404

    # Bob cannot analyse Jane's documents either.
    forbidden = client.post(
        "/analyses", json={"resume_id": resume_id, "job_description_id": job_id}, headers=bob
    )
    assert forbidden.status_code == 404


def test_interview_questions_require_completed_analysis_and_persist(client, auth_headers):
    resume_id, job_id = _create_documents(client, auth_headers)
    analysis_id = client.post(
        "/analyses",
        json={"resume_id": resume_id, "job_description_id": job_id},
        headers=auth_headers,
    ).json()["id"]

    response = client.post(f"/analyses/{analysis_id}/interview-questions", headers=auth_headers)
    assert response.status_code == 200, response.text
    questions = response.json()
    assert len(questions) == 5
    assert {q["category"] for q in questions} <= {"technical", "behavioral", "project", "gap"}

    detail = client.get(f"/analyses/{analysis_id}", headers=auth_headers).json()
    assert detail["interview_questions"] == questions


def test_analysis_failure_is_recorded(client, auth_headers, monkeypatch):
    from app.ai import pipeline as pipeline_module
    from app.core.errors import AIProviderError

    def boom(self, job_description):
        raise AIProviderError("Provider down")

    monkeypatch.setattr(pipeline_module.AnalysisPipeline, "extract_requirements", boom)
    resume_id, job_id = _create_documents(client, auth_headers)
    analysis_id = client.post(
        "/analyses",
        json={"resume_id": resume_id, "job_description_id": job_id},
        headers=auth_headers,
    ).json()["id"]

    detail = client.get(f"/analyses/{analysis_id}", headers=auth_headers).json()
    assert detail["status"] == "failed"
    assert detail["error_message"] == "Provider down"
    assert detail["result"] is None

    blocked = client.post(f"/analyses/{analysis_id}/interview-questions", headers=auth_headers)
    assert blocked.status_code == 422
    assert blocked.json()["error"]["code"] == "analysis_not_completed"

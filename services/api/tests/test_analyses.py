# Integration tests for the analysis endpoints using the deterministic fake AI provider.

from app.ai.pipeline import UNGROUNDED_NOTE
from app.ai.providers import get_ai_provider
from app.ai.providers.fake import FakeLLM, FakeProvider
from app.ai.scoring import SCORE_EXPLANATIONS
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
    assert body["output_language"] == "en"

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
    assert detail["error_code"] == "ai_provider_error"
    assert detail["error_message"] == "Provider down"
    assert detail["result"] is None

    blocked = client.post(f"/analyses/{analysis_id}/interview-questions", headers=auth_headers)
    assert blocked.status_code == 422
    assert blocked.json()["error"]["code"] == "analysis_not_completed"


class _RecordingLLM(FakeLLM):
    """Fake LLM that keeps the last prompt of each task, so a test can check what the model was asked."""

    def __init__(self):
        self.prompts: dict[str, str] = {}

    def generate_structured(self, *, task, prompt, schema):
        self.prompts[task] = prompt
        return super().generate_structured(task=task, prompt=prompt, schema=schema)


def test_output_language_is_stored_and_reaches_every_writing_step(client, auth_headers):
    provider = FakeProvider()
    provider.llm = _RecordingLLM()
    client.app.dependency_overrides[get_ai_provider] = lambda: provider
    resume_id, job_id = _create_documents(client, auth_headers)

    created = client.post(
        "/analyses",
        json={"resume_id": resume_id, "job_description_id": job_id, "output_language": "tr"},
        headers=auth_headers,
    )
    assert created.status_code == 202, created.text
    assert created.json()["output_language"] == "tr"
    analysis_id = created.json()["id"]
    questions = client.post(f"/analyses/{analysis_id}/interview-questions", headers=auth_headers)
    assert questions.status_code == 200, questions.text

    detail = client.get(f"/analyses/{analysis_id}", headers=auth_headers).json()
    assert detail["output_language"] == "tr"
    assert detail["result"]["overall"]["score_explanation"] == SCORE_EXPLANATIONS["tr"]
    prompts = provider.llm.prompts
    for task in ("judge_matches", "write_narrative", "generate_interview_questions"):
        assert "in Turkish" in prompts[task], task
    # Extraction keeps the source language, so its prompts carry no output language.
    for task in ("extract_requirements", "extract_evidence"):
        assert "Turkish" not in prompts[task], task
    assert all(
        UNGROUNDED_NOTE["en"] not in r["reasoning"] for r in detail["result"]["requirements"]
    )


def test_unsupported_output_language_is_rejected(client, auth_headers):
    resume_id, job_id = _create_documents(client, auth_headers)
    response = client.post(
        "/analyses",
        json={"resume_id": resume_id, "job_description_id": job_id, "output_language": "de"},
        headers=auth_headers,
    )
    assert response.status_code == 422
    assert client.get("/analyses", headers=auth_headers).json() == []


def test_analysis_without_a_language_uses_the_account_preference(client, auth_headers):
    client.patch("/me", json={"preferred_language": "tr"}, headers=auth_headers)
    resume_id, job_id = _create_documents(client, auth_headers)

    implicit = client.post(
        "/analyses",
        json={"resume_id": resume_id, "job_description_id": job_id},
        headers=auth_headers,
    )
    explicit = client.post(
        "/analyses",
        json={"resume_id": resume_id, "job_description_id": job_id, "output_language": "en"},
        headers=auth_headers,
    )
    assert implicit.json()["output_language"] == "tr"
    assert explicit.json()["output_language"] == "en"

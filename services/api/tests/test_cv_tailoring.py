# Tests for tailoring a CV to a posting: entities always come from the source CV, line origins are corrected, strict
# mode adds nothing and asks instead, and the endpoints (tailor, answer questions) behave as documented.

import pytest

from app.ai.schemas import TailoredCv
from app.cv.content import CvContent
from app.cv.tailoring import CvTailorer, TailoringRequest
from app.schemas.analysis import RequirementMatch
from tests.conftest import SAMPLE_JOB, SAMPLE_RESUME, register_user

BASE = CvContent.model_validate(
    {
        "contact": {"name": "Deniz Aydın"},
        "experience": [
            {
                "role": "Backend Intern",
                "organization": "Acme Corp",
                "start": "2025-06",
                "end": "2025-09",
                "bullets": [{"text": "Built REST endpoints with FastAPI.", "origin": "cv"}],
            },
            {
                "role": "Teaching Assistant",
                "organization": "North Technical University",
                "start": "2024",
                "bullets": [{"text": "Led weekly lab sessions.", "origin": "cv"}],
            },
        ],
        "education": [
            {"degree": "B.Sc. Computer Engineering", "school": "North Technical University"}
        ],
        "projects": [
            {
                "name": "Inventory Tracker",
                "bullets": [{"text": "FastAPI and PostgreSQL app.", "origin": "cv"}],
            },
            {
                "name": "Campus Events API",
                "bullets": [{"text": "Public API with JWT.", "origin": "cv"}],
            },
        ],
        "skills": [{"items": [{"text": "Python", "origin": "cv"}]}],
        "languages": [{"name": "Turkish", "level": "native"}],
    }
)
REQUIREMENTS = [
    RequirementMatch(
        id="r1",
        text="Docker",
        category="tool",
        importance="must_have",
        status="missing",
        reasoning="Not in the CV.",
    )
]


class ScriptedLLM:
    def __init__(self, output: dict):
        self.output = output
        self.prompt = ""

    def generate_structured(self, *, task, prompt, schema):
        assert task == "tailor_cv"
        self.prompt = prompt
        return TailoredCv.model_validate(self.output)


def tailor(output: dict, *, mode="flexible", target="en"):
    llm = ScriptedLLM(output)
    request = TailoringRequest(
        base=BASE,
        base_language="en",
        target_language=target,
        job_title="Junior Backend Developer",
        company="Globex",
        posting="We need Docker.",
        requirements=REQUIREMENTS,
        mode=mode,
    )
    return CvTailorer(llm).tailor(request), llm.prompt


def test_prompt_carries_ids_requirements_and_mode():
    _, prompt = tailor({})
    assert '"id": "x1"' in prompt and '"id": "x1.1"' in prompt and '"id": "p2"' in prompt
    assert '"status": "missing"' in prompt
    assert "flexible mode" in prompt and "Write every line in English" in prompt


def test_entities_come_from_the_source_and_titles_stay_in_the_same_language():
    result, _ = tailor(
        {
            "experience": [
                {"id": "x1", "role": "Senior Backend Engineer", "bullets": []},
                {
                    "id": "x9",
                    "role": "CTO",
                    "bullets": [{"text": "Ran everything.", "origin": "ai_added"}],
                },
            ],
            "education": [{"id": "d1", "degree": "M.Sc. Computer Science", "details": []}],
        }
    )
    jobs = result.content.experience
    assert [(j.role, j.organization, j.start) for j in jobs] == [
        ("Backend Intern", "Acme Corp", "2025-06"),
        ("Teaching Assistant", "North Technical University", "2024"),
    ]
    # An empty answer for a position keeps its own lines; an unknown id adds nothing.
    assert jobs[0].bullets[0].text == "Built REST endpoints with FastAPI."
    assert result.content.education[0].degree == "B.Sc. Computer Engineering"


def test_titles_are_taken_from_the_model_only_when_the_language_changes():
    result, prompt = tailor(
        {
            "experience": [{"id": "x1", "role": "Backend Stajyeri", "bullets": []}],
            "languages": [{"id": "l1", "name": "Türkçe", "level": "ana dil"}],
        },
        target="tr",
    )
    assert "Write every line in Turkish" in prompt
    assert result.content.experience[0].role == "Backend Stajyeri"
    assert result.content.experience[0].organization == "Acme Corp"
    assert (result.content.languages[0].name, result.content.languages[0].level) == (
        "Türkçe",
        "ana dil",
    )


def test_line_origins_are_corrected_against_the_source():
    result, _ = tailor(
        {
            "experience": [
                {
                    "id": "x1",
                    "role": "Backend Intern",
                    "bullets": [
                        {
                            "text": "Built REST endpoints with FastAPI.",
                            "origin": "ai_reworded",
                            "source": "x1.1",
                        },
                        {"text": "Built fast REST endpoints.", "origin": "cv", "source": "x1.1"},
                        {"text": "Ran Docker in production.", "origin": "cv"},
                        {
                            "text": "Containerised the API with Docker.",
                            "origin": "ai_embellished",
                            "source": "x1.1",
                        },
                    ],
                }
            ]
        }
    )
    origins = [(b.text, b.origin) for b in result.content.experience[0].bullets]
    assert origins == [
        ("Built REST endpoints with FastAPI.", "cv"),
        ("Built fast REST endpoints.", "ai_reworded"),
        ("Ran Docker in production.", "ai_added"),
        ("Containerised the API with Docker.", "ai_embellished"),
    ]


def test_projects_follow_the_model_order_and_none_is_lost():
    result, _ = tailor({"projects": [{"id": "p2", "bullets": []}, {"id": "p2", "bullets": []}]})
    assert [p.name for p in result.content.projects] == ["Campus Events API", "Inventory Tracker"]


def test_flexible_mode_keeps_added_skills_and_summary():
    result, _ = tailor(
        {
            "headline": "Backend developer",
            "summary": [{"text": "Ships tested APIs.", "origin": "ai_added"}],
            "skills": [
                {
                    "name": "Tools",
                    "items": [
                        {"text": "Python", "origin": "cv", "source": "k1.1"},
                        {"text": "Docker", "origin": "ai_added"},
                    ],
                }
            ],
        }
    )
    assert result.content.headline == "Backend developer"
    assert [(i.text, i.origin) for i in result.content.skills[0].items] == [
        ("Python", "cv"),
        ("Docker", "ai_added"),
    ]
    assert result.content.summary[0].origin == "ai_added"
    assert result.questions == []


def test_strict_mode_drops_additions_and_keeps_questions_about_real_entries():
    questions = [
        {"question": f"Did you use Docker {n}?", "entry_id": "x1", "proposed_line": "Used Docker."}
        for n in range(7)
    ]
    questions.insert(
        0, {"question": "Did you lead?", "entry_id": "x9", "proposed_line": "Led a team."}
    )
    result, prompt = tailor(
        {
            "skills": [
                {
                    "items": [
                        {"text": "Python", "origin": "cv", "source": "k1.1"},
                        {"text": "Docker", "origin": "ai_added"},
                    ]
                }
            ],
            "experience": [
                {
                    "id": "x1",
                    "role": "Backend Intern",
                    "bullets": [
                        {
                            "text": "Built REST endpoints with FastAPI.",
                            "origin": "cv",
                            "source": "x1.1",
                        },
                        {
                            "text": "Used Docker daily.",
                            "origin": "ai_embellished",
                            "source": "x1.1",
                        },
                    ],
                }
            ],
            "questions": questions,
        },
        mode="strict",
    )
    assert "strict mode" in prompt
    assert [i.text for i in result.content.skills[0].items] == ["Python"]
    assert [b.text for b in result.content.experience[0].bullets] == [
        "Built REST endpoints with FastAPI."
    ]
    assert len(result.questions) == 5
    assert result.questions[0].entry_name == "Backend Intern · Acme Corp"
    assert result.questions[0].kind == "experience"


def tailor_for(output: dict, posting: str, *, target="en"):
    request = TailoringRequest(
        base=BASE,
        base_language="en",
        target_language=target,
        job_title="Intern",
        company="Globex Defence",
        posting=posting,
        requirements=REQUIREMENTS,
        mode="flexible",
    )
    return CvTailorer(ScriptedLLM(output)).tailor(request).content


def test_summary_never_addresses_the_company():
    content = tailor_for(
        {
            "summary": [
                {
                    "text": "I want to complete my internship at Globex Defence.",
                    "origin": "ai_added",
                },
                {"text": "Builds and tests FastAPI services.", "origin": "ai_reworded"},
            ]
        },
        "Join Globex Defence.",
    )
    assert [line.text for line in content.summary] == ["Builds and tests FastAPI services."]


def test_a_reworded_line_that_brings_in_posting_words_is_marked_embellished():
    posting = "Support the workshop team with simulation runs. FastAPI is a plus."
    output = {
        "experience": [
            {
                "id": "x1",
                "role": "Backend Intern",
                "bullets": [
                    {
                        "text": "Ran simulation tests for the workshop team.",
                        "origin": "ai_reworded",
                        "source": "x1.1",
                    },
                    {
                        "text": "Built REST services with FastAPI.",
                        "origin": "ai_reworded",
                        "source": "x1.1",
                    },
                ],
            }
        ]
    }
    bullets = tailor_for(output, posting).experience[0].bullets
    assert [b.origin for b in bullets] == ["ai_embellished", "ai_reworded"]
    # Across languages every word is new, so a translation is not judged by its words.
    translated = tailor_for(output, posting, target="tr").experience[0].bullets
    assert [b.origin for b in translated] == ["ai_reworded", "ai_reworded"]


def test_a_skill_the_cv_already_states_is_not_an_addition():
    content = tailor_for(
        {
            "skills": [
                {
                    "items": [
                        {"text": "FastAPI", "origin": "ai_added"},
                        {"text": "Python", "origin": "ai_reworded"},
                        {"text": "SolidWorks", "origin": "ai_added"},
                    ]
                }
            ]
        },
        "SolidWorks is a plus.",
    )
    assert [(i.text, i.origin) for i in content.skills[0].items] == [
        ("FastAPI", "cv"),
        ("Python", "cv"),
        ("SolidWorks", "ai_added"),
    ]


# --- HTTP -------------------------------------------------------------------------------------------


def completed_analysis(client, headers) -> tuple[str, str]:
    resume = client.post(
        "/resumes", json={"title": "CV", "text": SAMPLE_RESUME}, headers=headers
    ).json()
    job = client.post(
        "/job-descriptions",
        json={"title": "Junior Backend Developer", "company": "Acme", "text": SAMPLE_JOB},
        headers=headers,
    ).json()
    analysis = client.post(
        "/analyses",
        json={"resume_id": resume["id"], "job_description_id": job["id"]},
        headers=headers,
    ).json()
    # TestClient runs background tasks before returning, so the analysis is already complete.
    assert (
        client.get(f"/analyses/{analysis['id']}", headers=headers).json()["status"] == "completed"
    )
    return analysis["id"], resume["id"]


def test_tailored_cv_is_written_for_the_posting(client, auth_headers):
    analysis_id, resume_id = completed_analysis(client, auth_headers)
    response = client.post(f"/analyses/{analysis_id}/tailored-cv", json={}, headers=auth_headers)
    assert response.status_code == 201, response.text
    body = response.json()
    assert (body["kind"], body["tailoring_mode"], body["language"]) == (
        "tailored",
        "flexible",
        "en",
    )
    assert (body["analysis_id"], body["resume_id"]) == (analysis_id, resume_id)
    assert body["title"] == "Junior Backend Developer · Acme"
    assert body["content"]["experience"][0]["organization"] == "Acme Corp"
    skills = [item for group in body["content"]["skills"] for item in group["items"]]
    assert {"text": "Kubernetes", "origin": "ai_added", "evidence_ids": []} in skills
    assert body["questions"] == []
    # The analysis is not touched: its score still comes from the user's own CV.
    assert client.get(f"/analyses/{analysis_id}", headers=auth_headers).json()["result"]


def test_tailoring_starts_from_the_users_edited_copy(client, auth_headers):
    analysis_id, resume_id = completed_analysis(client, auth_headers)
    maker = client.post(f"/resumes/{resume_id}/cv-documents", json={}, headers=auth_headers).json()
    content = maker["content"]
    content["contact"]["email"] = "deniz@example.com"
    client.patch(f"/cv-documents/{maker['id']}", json={"content": content}, headers=auth_headers)

    body = client.post(f"/analyses/{analysis_id}/tailored-cv", json={}, headers=auth_headers).json()
    assert body["content"]["contact"]["email"] == "deniz@example.com"


def test_strict_mode_asks_and_a_yes_adds_a_confirmed_line_once(client, auth_headers):
    analysis_id, _ = completed_analysis(client, auth_headers)
    body = client.post(
        f"/analyses/{analysis_id}/tailored-cv", json={"mode": "strict"}, headers=auth_headers
    ).json()
    assert body["tailoring_mode"] == "strict"
    (question,) = body["questions"]
    assert question["answer"] is None
    skills = [item["origin"] for group in body["content"]["skills"] for item in group["items"]]
    assert "ai_added" not in skills

    url = f"/cv-documents/{body['id']}/answers"
    answered = client.post(
        url, json={"answers": [{"id": question["id"], "accepted": True}]}, headers=auth_headers
    )
    assert answered.status_code == 200, answered.text
    bullets = answered.json()["content"]["experience"][0]["bullets"]
    assert bullets[-1] == {
        "text": question["proposed_line"],
        "origin": "confirmed",
        "evidence_ids": [],
    }
    assert answered.json()["questions"][0]["answer"] is True

    again = client.post(
        url, json={"answers": [{"id": question["id"], "accepted": True}]}, headers=auth_headers
    )
    assert len(again.json()["content"]["experience"][0]["bullets"]) == len(bullets)


@pytest.mark.parametrize("mode", ["flexible", "strict"])
def test_tailoring_another_users_analysis_is_not_found(client, auth_headers, mode):
    analysis_id, _ = completed_analysis(client, auth_headers)
    other = register_user(client, "bob@example.com")
    response = client.post(
        f"/analyses/{analysis_id}/tailored-cv", json={"mode": mode}, headers=other
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "analysis_not_found"


def test_unknown_mode_is_refused(client, auth_headers):
    analysis_id, _ = completed_analysis(client, auth_headers)
    response = client.post(
        f"/analyses/{analysis_id}/tailored-cv", json={"mode": "wild"}, headers=auth_headers
    )
    assert response.status_code == 422

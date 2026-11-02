# Tests for CV documents: turning a saved CV into structured content (cleaning, source checks, retry), and the
# CV document endpoints (create, structure from a saved CV, list, edit, delete, download, isolation, limits).

from io import BytesIO

import pytest
from pypdf import PdfReader

from app.ai.schemas import (
    CvStructure,
    StructuredContact,
    StructuredEducation,
    StructuredExperience,
    StructuredProject,
    StructuredSkillGroup,
)
from app.api.routes.cv_documents import attachment_disposition
from app.core.rate_limit import CV_AI_WRITES
from app.cv.content import CvContent
from app.cv.source_check import UnsupportedFact, unsupported_facts
from app.cv.structuring import CvStructurer, to_cv_content
from tests.conftest import SAMPLE_RESUME, register_user

SOURCE = """Deniz Aydın
Bilgisayar Mühendisliği öğrencisi
Deneyim
- Backend Stajyeri, ACME CORP. (Haziran 2025 - Eylül 2025): Sipariş servisi için REST uç noktaları yazdım.
Eğitim
- Bilgisayar Mühendisliği Lisans, İstanbul Teknik Üniversitesi (2022 - 2026)
"""


def structure(**overrides) -> CvStructure:
    fields = {
        "contact": StructuredContact(name="Deniz Aydın"),
        "experience": [
            StructuredExperience(
                role="Backend Stajyeri",
                organization="Acme Corp",
                start="2025-06",
                end="2025-09",
                bullets=["Sipariş servisi için REST uç noktaları yazdım."],
            )
        ],
        "education": [
            StructuredEducation(
                degree="Bilgisayar Mühendisliği Lisans",
                school="istanbul teknik universitesi",
                start="2022",
                end="2026",
            )
        ],
    }
    return CvStructure(**{**fields, **overrides})


class ScriptedLLM:
    """Answers each structuring call with the next prepared output."""

    def __init__(self, *outputs: CvStructure):
        self.outputs = list(outputs)
        self.calls = 0

    def generate_structured(self, *, task, prompt, schema):
        assert task == "structure_cv" and "<resume>" in prompt
        self.calls += 1
        return self.outputs.pop(0)


# --- Cleaning model output ------------------------------------------------------------------------


def test_model_output_is_cleaned_into_the_contract():
    raw = structure(
        contact=StructuredContact(
            name="  Deniz   Aydın ",
            email="not an email",
            links=["github.com/example-deniz", "mailto:deniz@example.com", "https://x.dev/a b"],
        ),
        experience=[
            StructuredExperience(
                role="Intern", organization="Acme", start="2025-6", end="Present", bullets=[" A "]
            ),
            StructuredExperience(role="Intern", organization="  ", start="June 2025"),
        ],
        projects=[StructuredProject(name="Tracker", url="example.com/repo", start="2024-13")],
        skills=[StructuredSkillGroup(items=["", "Python"]), StructuredSkillGroup(items=[" "])],
    )
    content = to_cv_content(raw, fallback_name="Fallback")
    assert content.contact.name == "Deniz Aydın"
    assert content.contact.email is None
    assert [link.url for link in content.contact.links] == ["https://github.com/example-deniz"]
    (job,) = content.experience  # the entry without an organization is dropped
    assert (job.start, job.end) == ("2025-06", "present")
    assert job.bullets[0].text == "A" and job.bullets[0].origin == "cv"
    (project,) = content.projects
    assert project.link.url == "https://example.com/repo"
    assert project.start == "2024"  # an impossible month keeps only the year
    assert [[item.text for item in group.items] for group in content.skills] == [["Python"]]


def test_empty_name_falls_back_to_the_account_name():
    content = to_cv_content(structure(contact=StructuredContact(name=" ")), "Jane Doe")
    assert content.contact.name == "Jane Doe"


# --- Source checks ----------------------------------------------------------------------------------


def test_copied_facts_pass_despite_case_accents_and_punctuation():
    content = to_cv_content(structure(), "x")
    assert unsupported_facts(content, SOURCE) == []


def test_invented_employer_school_role_and_year_are_reported():
    raw = structure(
        experience=[
            StructuredExperience(role="Senior Engineer", organization="Google", start="2019")
        ],
        education=[StructuredEducation(degree="MSc", school="MIT", start="2022")],
    )
    facts = unsupported_facts(to_cv_content(raw, "x"), SOURCE)
    assert set(facts) == {
        UnsupportedFact("role", "Senior Engineer"),
        UnsupportedFact("organization", "Google"),
        UnsupportedFact("date", "2019"),
        UnsupportedFact("degree", "MSc"),
        UnsupportedFact("school", "MIT"),
    }


def test_a_part_of_a_word_is_not_a_match():
    raw = structure(experience=[StructuredExperience(role="Backend", organization="Acm")])
    facts = unsupported_facts(to_cv_content(raw, "x"), SOURCE)
    assert UnsupportedFact("organization", "Acm") in facts


# --- Structurer -------------------------------------------------------------------------------------


def test_structurer_retries_once_when_a_fact_is_not_in_the_source():
    invented = structure(experience=[StructuredExperience(role="CTO", organization="Acme Corp")])
    llm = ScriptedLLM(invented, structure())
    result = CvStructurer(llm).structure(SOURCE, "x")
    assert llm.calls == 2
    assert result.unsupported == []
    assert result.content.experience[0].role == "Backend Stajyeri"


def test_structurer_drops_unsupported_dates_and_reports_names_after_the_retry():
    invented = structure(
        experience=[
            StructuredExperience(
                role="Backend Stajyeri", organization="Globex", start="2019", end="2025-09"
            )
        ]
    )
    llm = ScriptedLLM(invented, invented)
    result = CvStructurer(llm).structure(SOURCE, "x")
    assert llm.calls == 2
    (job,) = result.content.experience
    assert (job.organization, job.start, job.end) == ("Globex", None, "2025-09")
    assert set(result.unsupported) == {
        UnsupportedFact("organization", "Globex"),
        UnsupportedFact("date", "2019"),
    }


def test_structurer_stops_after_a_clean_first_answer():
    llm = ScriptedLLM(structure(omitted_sections=["Hobiler", " "]))
    result = CvStructurer(llm).structure(SOURCE, "x")
    assert llm.calls == 1
    assert result.omitted_sections == ["Hobiler"]


def test_lines_the_model_changed_are_marked_as_reworded():
    raw = structure(
        experience=[
            StructuredExperience(
                role="Backend Stajyeri",
                organization="Acme Corp",
                bullets=[
                    "Sipariş servisi için REST uç noktaları yazdım.",
                    "Sipariş servisi için API yazdım.",
                ],
            )
        ],
        skills=[StructuredSkillGroup(items=["REST", "Kubernetes"])],
    )
    result = CvStructurer(ScriptedLLM(raw)).structure(SOURCE, "x")
    (job,) = result.content.experience
    assert [line.origin for line in job.bullets] == ["cv", "ai_reworded"]
    assert [item.origin for item in result.content.skills[0].items] == ["cv", "ai_reworded"]


# --- HTTP -------------------------------------------------------------------------------------------


def create_resume(client, headers, text: str = SAMPLE_RESUME) -> str:
    response = client.post("/resumes", json={"title": "My CV", "text": text}, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_saved_cv_becomes_an_editable_cv_document(client, auth_headers):
    resume_id = create_resume(client, auth_headers, SAMPLE_RESUME + "\nHobbies\n- Chess\n")
    response = client.post(
        f"/resumes/{resume_id}/cv-documents", json={"template": "modern"}, headers=auth_headers
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert (body["kind"], body["title"], body["template"]) == ("maker", "My CV", "modern")
    assert body["language"] == "en" and body["resume_id"] == resume_id
    assert body["content"]["contact"]["name"] == "Jane Doe"
    assert body["content"]["experience"][0]["organization"] == "Acme Corp"
    assert body["omitted_sections"] == ["Hobbies"]
    assert body["unsupported_facts"] == []


def test_imported_cv_is_named_without_the_file_extension(client, auth_headers):
    response = client.post(
        "/resumes", json={"title": "Deniz_CV_2025.PDF", "text": SAMPLE_RESUME}, headers=auth_headers
    )
    created = client.post(
        f"/resumes/{response.json()['id']}/cv-documents", json={}, headers=auth_headers
    )
    assert created.json()["title"] == "Deniz_CV_2025"


def test_structuring_another_users_cv_is_not_found(client, auth_headers):
    other = register_user(client, "bob@example.com")
    resume_id = create_resume(client, other)
    response = client.post(f"/resumes/{resume_id}/cv-documents", json={}, headers=auth_headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "resume_not_found"


def test_structuring_is_limited_per_day(client, auth_headers):
    resume_id = create_resume(client, auth_headers)
    for _ in range(CV_AI_WRITES.limit):
        response = client.post(f"/resumes/{resume_id}/cv-documents", json={}, headers=auth_headers)
        assert response.status_code == 201
    response = client.post(f"/resumes/{resume_id}/cv-documents", json={}, headers=auth_headers)
    assert response.status_code == 429
    assert "retry-after" in response.headers


def test_blank_cv_starts_with_the_account_name(client, auth_headers):
    response = client.post(
        "/cv-documents", json={"title": "Yeni CV", "language": "tr"}, headers=auth_headers
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["template"] == "classic" and body["resume_id"] is None
    assert body["content"]["contact"] == {
        "name": "Jane Doe",
        "email": None,
        "phone": None,
        "location": None,
        "links": [],
    }


def test_documents_are_listed_edited_and_deleted(client, auth_headers):
    created = client.post(
        "/cv-documents", json={"title": "CV", "language": "en"}, headers=auth_headers
    ).json()
    url = f"/cv-documents/{created['id']}"
    content = CvContent.model_validate(created["content"])
    content.headline = "Backend developer"

    response = client.patch(
        url,
        json={"template": "standard", "content": content.model_dump(mode="json")},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    assert response.json()["template"] == "standard"
    assert response.json()["title"] == "CV"  # fields not sent stay as they were
    assert (
        client.get(url, headers=auth_headers).json()["content"]["headline"] == "Backend developer"
    )

    listed = client.get("/cv-documents", headers=auth_headers).json()
    assert [d["id"] for d in listed] == [created["id"]] and "content" not in listed[0]

    assert client.patch(url, json={"template": "fancy"}, headers=auth_headers).status_code == 422
    assert client.delete(url, headers=auth_headers).status_code == 204
    assert client.get(url, headers=auth_headers).status_code == 404


def test_documents_are_private_to_their_owner(client, auth_headers):
    created = client.post(
        "/cv-documents", json={"title": "CV", "language": "en"}, headers=auth_headers
    ).json()
    other = register_user(client, "bob@example.com")
    url = f"/cv-documents/{created['id']}"
    assert client.get(url, headers=other).status_code == 404
    assert client.patch(url, json={"title": "Mine"}, headers=other).status_code == 404
    assert client.delete(url, headers=other).status_code == 404
    assert client.get(f"{url}/pdf", headers=other).status_code == 404
    assert client.get("/cv-documents", headers=other).json() == []


def test_document_downloads_as_a_named_pdf(client, auth_headers):
    created = client.post(
        "/cv-documents", json={"title": "Deniz Aydın CV", "language": "tr"}, headers=auth_headers
    ).json()
    response = client.get(f"/cv-documents/{created['id']}/pdf", headers=auth_headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["x-page-count"] == "1"
    assert response.headers["content-disposition"] == attachment_disposition("Deniz Aydın CV")
    assert "Jane Doe" in PdfReader(BytesIO(response.content)).pages[0].extract_text()


@pytest.mark.parametrize(
    ("title", "expected"),
    [
        (
            "Deniz Aydın CV",
            "attachment; filename=\"deniz-aydin-cv.pdf\"; filename*=UTF-8''Deniz%20Ayd%C4%B1n%20CV.pdf",
        ),
        ("***", "attachment; filename=\"cv.pdf\"; filename*=UTF-8''%2A%2A%2A.pdf"),
        ("CV.PDF", "attachment; filename=\"cv.pdf\"; filename*=UTF-8''CV.pdf"),
    ],
)
def test_attachment_name_is_safe_ascii_with_the_exact_name_beside_it(title, expected):
    assert attachment_disposition(title) == expected


def test_document_outlives_the_saved_cv_it_came_from(client, auth_headers):
    resume_id = create_resume(client, auth_headers)
    created = client.post(
        f"/resumes/{resume_id}/cv-documents", json={}, headers=auth_headers
    ).json()
    assert client.delete(f"/resumes/{resume_id}", headers=auth_headers).status_code == 204
    document = client.get(f"/cv-documents/{created['id']}", headers=auth_headers).json()
    assert document["resume_id"] is None
    assert document["content"]["contact"]["name"] == "Jane Doe"


def test_document_thumbnail_is_a_private_png(client, auth_headers):
    created = client.post(
        "/cv-documents", json={"title": "CV", "language": "en"}, headers=auth_headers
    ).json()
    url = f"/cv-documents/{created['id']}/thumbnail"
    response = client.get(url, headers=auth_headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.headers["cache-control"].startswith("private")
    assert client.get(url, headers=register_user(client, "bob@example.com")).status_code == 404

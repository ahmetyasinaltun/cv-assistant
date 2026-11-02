# Tests for rendering CVs with Typst: every template reads back as clean text (as a CV parser sees it), user text
# is never run as Typst code, page counts are reported, and the PDF endpoint is guarded like the other routes.

from io import BytesIO
from pathlib import Path

import pytest
from pypdf import PdfReader

from app.core.errors import NotFoundError
from app.cv.content import CvContent
from app.cv.formatting import upper_for
from app.cv.render import CV_TEMPLATES, CvRenderer

SAMPLES_DIR = Path(__file__).parents[1] / "app" / "cv" / "samples"
TEMPLATE_IDS = list(CV_TEMPLATES)
A4_POINTS = (595.28, 841.89)


@pytest.fixture(scope="module")
def renderer() -> CvRenderer:
    return CvRenderer()


def sample(language: str) -> CvContent:
    path = SAMPLES_DIR / f"sample_cv_{language}.json"
    return CvContent.model_validate_json(path.read_text(encoding="utf-8"))


def pdf_text(pdf: bytes) -> str:
    return "\n".join(page.extract_text() for page in PdfReader(BytesIO(pdf)).pages)


def content_with(**fields) -> CvContent:
    return CvContent.model_validate({"contact": {"name": "Deniz Aydın"}, **fields})


@pytest.mark.parametrize("template_id", TEMPLATE_IDS)
def test_sample_renders_on_one_page_with_its_facts_readable(renderer, template_id):
    rendered = renderer.render(sample("en"), template_id, "en")
    assert rendered.pdf.startswith(b"%PDF")
    assert rendered.page_count == 1
    text = pdf_text(rendered.pdf)
    for fact in (
        "Deniz Aydın",
        "deniz.aydin@example.com",
        "Backend Intern",
        "Acme Corp",
        "Jun 2025 – Sep 2025",
        "github.com/example-deniz/inventory-tracker",
    ):
        assert fact in text
    # Section titles must read back as whole words; wide letter spacing splits them ("EX P ERI ENCE").
    for title in ("Experience", "Education", "Projects", "Skills", "Certifications"):
        assert title in text or title.upper() in text


@pytest.mark.parametrize("template_id", TEMPLATE_IDS)
def test_turkish_sample_keeps_turkish_letters_and_casing(renderer, template_id):
    text = pdf_text(renderer.render(sample("tr"), template_id, "tr").pdf)
    assert "İstanbul" in text and "Kuzey Teknik Üniversitesi" in text
    assert "Haz 2025 – Eyl 2025" in text
    # Section titles print either as written or uppercased with Turkish rules, never as "DENEYIM".
    for title in ("Deneyim", "Eğitim", "Projeler", "Yetenekler", "Diller", "Sertifikalar"):
        assert title in text or upper_for(title, "tr") in text
    assert "DENEYIM" not in text and "EĞITIM" not in text


@pytest.mark.parametrize("template_id", TEMPLATE_IDS)
def test_words_with_ligature_pairs_read_back_whole(renderer, template_id):
    words = "office efficient profiled fiyat ofis workflow affluent"
    rendered = renderer.render(content_with(summary=[{"text": words}]), template_id, "en")
    assert words in pdf_text(rendered.pdf)


@pytest.mark.parametrize("template_id", TEMPLATE_IDS)
def test_user_text_is_printed_never_run_as_typst(renderer, template_id):
    tricks = [
        "#set page(width: 3cm, height: 3cm)",
        '#eval("1 + 1")',
        "$x^2$ ] [ *bold* _it_ <label> @ref // not a comment",
        '#read("/etc/passwd") \\ "quoted"',
    ]
    content = content_with(
        headline="#set text(size: 40pt)", summary=[{"text": trick} for trick in tricks]
    )
    rendered = renderer.render(content, template_id, "en")
    reader = PdfReader(BytesIO(rendered.pdf))
    page = reader.pages[0]
    assert (float(page.mediabox.width), float(page.mediabox.height)) == pytest.approx(
        A4_POINTS, abs=0.5
    )
    # Lines may wrap anywhere, so whitespace is ignored when looking for the literal text.
    text = "".join(pdf_text(rendered.pdf).split())
    for trick in ["#set text(size: 40pt)", *tricks]:
        assert "".join(trick.split()) in text


@pytest.mark.parametrize("template_id", TEMPLATE_IDS)
def test_long_cv_reports_its_page_count(renderer, template_id):
    bullets = [
        {"text": f"Delivered improvement number {n} to the order service."} for n in range(12)
    ]
    jobs = [
        {
            "role": f"Engineer {n}",
            "organization": "Acme Corp",
            "start": "2020",
            "end": "2021",
            "bullets": bullets,
        }
        for n in range(8)
    ]
    rendered = renderer.render(content_with(experience=jobs), template_id, "en")
    assert rendered.page_count >= 2
    assert len(PdfReader(BytesIO(rendered.pdf)).pages) == rendered.page_count


@pytest.mark.parametrize("template_id", TEMPLATE_IDS)
def test_name_only_cv_renders(renderer, template_id):
    rendered = renderer.render(content_with(), template_id, "tr")
    assert "Deniz Aydın" in pdf_text(rendered.pdf)


def test_standard_template_reads_in_the_order_it_is_seen(renderer):
    # Nothing is right-aligned, so the dates follow the title instead of trailing the bullets.
    text = pdf_text(renderer.render(sample("en"), "standard", "en").pdf)
    assert "Backend Intern\nAcme Corp | Istanbul | Jun 2025 – Sep 2025\n• Built six" in text
    assert "github.com/example-deniz/inventory-tracker | Feb 2025 – May 2025" in text


def test_unknown_template_is_not_found(renderer):
    with pytest.raises(NotFoundError):
        renderer.render(content_with(), "fancy", "en")


# --- HTTP ---------------------------------------------------------------------------------------


def render_request(language: str = "en") -> dict:
    return {"language": language, "content": sample(language).model_dump(mode="json")}


def test_pdf_endpoint_requires_sign_in(client):
    response = client.post("/cv-templates/classic/pdf", json=render_request())
    assert response.status_code == 401


def test_pdf_endpoint_returns_the_pdf_and_its_page_count(client, auth_headers):
    response = client.post(
        "/cv-templates/modern/pdf", json=render_request("tr"), headers=auth_headers
    )
    assert response.status_code == 200, response.text
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["x-page-count"] == "1"
    assert "Deniz Aydın" in pdf_text(response.content)


def test_pdf_endpoint_rejects_unknown_templates_and_invalid_content(client, auth_headers):
    response = client.post("/cv-templates/fancy/pdf", json=render_request(), headers=auth_headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "template_not_found"

    bad = render_request()
    bad["content"]["contact"]["links"] = [{"url": "javascript:alert(1)"}]
    response = client.post("/cv-templates/classic/pdf", json=bad, headers=auth_headers)
    assert response.status_code == 422

    response = client.post(
        "/cv-templates/classic/pdf",
        json={**render_request(), "language": "de"},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_template_list_is_named_in_the_requested_language(client, auth_headers):
    response = client.get("/cv-templates", params={"language": "tr"}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == [
        {"id": "classic", "name": "Klasik"},
        {"id": "modern", "name": "Modern"},
        {"id": "standard", "name": "Standart"},
    ]


def test_preview_endpoint_returns_one_page_as_png(client, auth_headers):
    response = client.post(
        "/cv-templates/standard/preview", json=render_request("tr"), headers=auth_headers
    )
    assert response.status_code == 200, response.text
    assert response.headers["content-type"] == "image/png"
    assert response.content.startswith(b"\x89PNG")
    assert response.headers["x-page-count"] == "1"
    # A page past the end shows the last page instead of failing.
    response = client.post(
        "/cv-templates/standard/preview?page=3", json=render_request("tr"), headers=auth_headers
    )
    assert response.status_code == 200
    assert client.post("/cv-templates/standard/preview", json=render_request()).status_code == 401


def test_long_cv_preview_reports_every_page(renderer):
    bullets = [{"text": f"Delivered improvement number {n}."} for n in range(12)]
    jobs = [{"role": f"Engineer {n}", "organization": "Acme", "bullets": bullets} for n in range(8)]
    first = renderer.render_page(content_with(experience=jobs), "classic", "en", page=1, ppi=30)
    second = renderer.render_page(content_with(experience=jobs), "classic", "en", page=2, ppi=30)
    assert first.page_count == second.page_count >= 2
    assert first.png != second.png

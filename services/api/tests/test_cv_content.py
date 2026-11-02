# Unit tests for the CV contract and its print rules: validation, Turkish uppercasing, dates, links and section order.

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.cv.content import DEFAULT_SECTION_ORDER, CvContent
from app.cv.formatting import display_url, format_period, upper_for
from app.cv.print_view import build_print_view

SAMPLES_DIR = Path(__file__).parents[1] / "app" / "cv" / "samples"


def minimal_content(**overrides) -> dict:
    return {"contact": {"name": "Deniz Aydın"}, **overrides}


@pytest.mark.parametrize("language", ["en", "tr"])
def test_samples_are_valid_content(language):
    content = CvContent.model_validate_json(
        (SAMPLES_DIR / f"sample_cv_{language}.json").read_text(encoding="utf-8")
    )
    assert content.experience and content.education and content.projects


@pytest.mark.parametrize(
    ("text", "language", "expected"),
    [
        ("Deneyim", "tr", "DENEYİM"),
        ("Eğitim", "tr", "EĞİTİM"),
        ("ışık", "tr", "IŞIK"),
        ("Sertifikalar", "tr", "SERTİFİKALAR"),
        ("Skills", "en", "SKILLS"),
    ],
)
def test_upper_for_follows_the_language(text, language, expected):
    assert upper_for(text, language) == expected


@pytest.mark.parametrize(
    ("start", "end", "language", "expected"),
    [
        ("2025-06", "2025-09", "en", "Jun 2025 – Sep 2025"),
        ("2025-06", "2025-09", "tr", "Haz 2025 – Eyl 2025"),
        ("2024-02", "present", "en", "Feb 2024 – Present"),
        ("2024-08", "present", "tr", "Ağu 2024 – Günümüz"),
        ("2022", "2026", "en", "2022 – 2026"),
        ("2025-03", None, "en", "Mar 2025"),
        (None, None, "en", None),
    ],
)
def test_format_period(start, end, language, expected):
    assert format_period(start, end, language) == expected


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://github.com/example-deniz", "github.com/example-deniz"),
        ("https://www.linkedin.com/in/example-deniz/", "linkedin.com/in/example-deniz"),
        ("http://example.com", "example.com"),
    ],
)
def test_display_url(url, expected):
    assert display_url(url) == expected


@pytest.mark.parametrize("bad_date", ["2025-13", "25-06", "2025/06", "June 2025"])
def test_dates_must_be_year_or_year_month(bad_date):
    with pytest.raises(ValidationError):
        CvContent.model_validate(
            minimal_content(
                experience=[{"role": "Intern", "organization": "Acme", "start": bad_date}]
            )
        )


@pytest.mark.parametrize("bad_url", ["javascript:alert(1)", "file:///etc/passwd", "github.com/x"])
def test_links_must_be_web_addresses(bad_url):
    with pytest.raises(ValidationError):
        CvContent.model_validate(
            minimal_content(contact={"name": "D", "links": [{"url": bad_url}]})
        )


def test_unknown_fields_are_refused():
    with pytest.raises(ValidationError):
        CvContent.model_validate(minimal_content(photo="me.png"))


def test_section_order_is_completed_and_duplicates_are_refused():
    content = CvContent.model_validate(minimal_content(sections=[{"key": "projects"}]))
    assert [s.key for s in content.sections] == [
        "projects",
        *[key for key in DEFAULT_SECTION_ORDER if key != "projects"],
    ]
    assert [s.key for s in CvContent.model_validate(minimal_content()).sections] == list(
        DEFAULT_SECTION_ORDER
    )
    with pytest.raises(ValidationError):
        CvContent.model_validate(minimal_content(sections=[{"key": "skills"}, {"key": "skills"}]))


def test_print_view_leaves_out_empty_and_hidden_sections():
    content = CvContent.model_validate(
        minimal_content(
            summary=[{"text": "Builds APIs."}, {"text": "Writes tests."}],
            skills=[{"items": [{"text": "Python"}, {"text": "SQL"}]}],
            languages=[{"name": "English", "level": "B2"}],
            sections=[{"key": "languages", "visible": False}],
        )
    )
    view = build_print_view(content, "en")
    assert [s["key"] for s in view["sections"]] == ["summary", "skills"]
    summary, skills = view["sections"]
    assert summary["text"] == "Builds APIs. Writes tests."
    assert skills["groups"] == [{"label": None, "text": "Python, SQL"}]


def test_print_view_resolves_titles_dates_and_contact_for_the_language():
    content = CvContent.model_validate(
        minimal_content(
            contact={
                "name": "Deniz Aydın",
                "email": "deniz@example.com",
                "location": "İstanbul",
                "links": [{"url": "https://github.com/example-deniz"}],
            },
            education=[
                {"degree": "Lisans", "school": "Kuzey", "start": "2022-09", "end": "present"}
            ],
        )
    )
    view = build_print_view(content, "tr")
    assert view["contact"] == [
        {"text": "deniz@example.com", "url": "mailto:deniz@example.com"},
        {"text": "İstanbul", "url": None},
    ]
    assert view["links"] == [
        {"text": "github.com/example-deniz", "url": "https://github.com/example-deniz"}
    ]
    (education,) = view["sections"]
    assert (education["title"], education["title_upper"]) == ("Eğitim", "EĞİTİM")
    assert education["entries"][0]["period"] == "Eyl 2022 – Günümüz"
    # The view is passed to Typst as JSON, so it must serialise as plain data.
    json.dumps(view)

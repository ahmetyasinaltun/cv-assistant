# Tests the check on the model's "not carried over" headings: names of filled sections are dropped in any spelling.

import pytest

from app.cv.content import CvContent
from app.cv.section_headings import fold_heading, not_carried_over
from app.cv.structuring import CvStructurer
from tests.test_cv_documents import SOURCE, ScriptedLLM, structure


@pytest.mark.parametrize(
    ("heading", "folded"),
    [
        ("EĞİTİM:", "egitim"),
        ("Egitim", "egitim"),
        ("İŞ DENEYİMİ", "is deneyimi"),
        ("YABANCI DİLLER", "yabanci diller"),
        ("Skills & Tools", "skills tools"),
        ("Yetenekler ve Araçlar", "yetenekler araclar"),
    ],
)
def test_headings_fold_to_one_spelling(heading: str, folded: str):
    assert fold_heading(heading) == folded


def _content(**sections) -> CvContent:
    return CvContent.model_validate({"contact": {"name": "Deniz Kurgu"}, **sections})


EDUCATION = [{"degree": "Bilgisayar Mühendisliği", "school": "Kurgu Üniversitesi", "details": []}]
EXPERIENCE = [{"role": "Yazılım Stajyeri", "organization": "Kurgu Teknoloji", "bullets": []}]


def test_headings_of_filled_sections_are_not_reported():
    content = _content(education=EDUCATION, experience=EXPERIENCE)
    reported = ["EGITIM", "İş Deneyimi", "Education", "Hobiler", "References"]
    assert not_carried_over(reported, content) == ["Hobiler", "References"]


def test_a_heading_whose_section_stayed_empty_is_still_reported():
    content = _content(education=EDUCATION)
    assert not_carried_over(["EĞİTİM", "SERTİFİKALAR", "Ödüller"], content) == [
        "SERTİFİKALAR",
        "Ödüller",
    ]


def test_contact_counts_as_carried_only_when_details_were_copied():
    assert not_carried_over(["İletişim"], _content()) == ["İletişim"]
    with_email = CvContent.model_validate(
        {"contact": {"name": "Deniz Kurgu", "email": "deniz@example.com"}}
    )
    assert not_carried_over(["İletişim"], with_email) == []


def test_structurer_drops_filled_sections_the_model_listed_as_omitted():
    # The live check of 2026-11-05: the model listed headings whose sections it had filled.
    llm = ScriptedLLM(structure(omitted_sections=["EGITIM", "DENEYIM", "Hobiler"]))
    result = CvStructurer(llm).structure(SOURCE, "x")
    assert result.omitted_sections == ["Hobiler"]

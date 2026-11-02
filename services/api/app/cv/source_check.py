# Checks that the facts a CV is built on (employers, schools, roles, degrees and years) appear in the source text.
# The model is told to copy; this is the code-side guarantee that it did not invent an employer, a school or a date.

import re
from dataclasses import dataclass
from typing import Literal

from app.cv.content import CvContent
from app.services.text_normalization import fold_for_matching

FactKind = Literal["role", "organization", "degree", "school", "date"]

_NON_WORD = re.compile(r"[\W_]+")


@dataclass(frozen=True)
class UnsupportedFact:
    kind: FactKind
    value: str


def comparable(text: str) -> str:
    """Lowercase, without accents or punctuation: "Acme Corp." and "ACME CORP" compare equal."""
    return " ".join(_NON_WORD.sub(" ", fold_for_matching(text)).split())


def unsupported_facts(content: CvContent, source_text: str) -> list[UnsupportedFact]:
    source = f" {comparable(source_text)} "
    found: list[UnsupportedFact] = []

    def check_name(kind: FactKind, value: str) -> None:
        if f" {comparable(value)} " not in source:
            found.append(UnsupportedFact(kind, value))

    def check_year(value: str | None) -> None:
        # Months are written in too many ways to check; the year is the part that must not be invented.
        if value and value != "present" and value[:4] not in source:
            found.append(UnsupportedFact("date", value))

    for job in content.experience:
        check_name("role", job.role)
        check_name("organization", job.organization)
        check_year(job.start)
        check_year(job.end)
    for school in content.education:
        check_name("degree", school.degree)
        check_name("school", school.school)
        check_year(school.start)
        check_year(school.end)
    for project in content.projects:
        check_year(project.start)
        check_year(project.end)
    for certificate in content.certificates:
        check_year(certificate.date)
    return found


def mark_reworded_lines(content: CvContent, source_text: str) -> CvContent:
    """Lines said to come from the CV but not found in it word for word become "ai_reworded", so the editor shows
    which lines the model changed while copying."""
    source = f" {comparable(source_text)} "
    data = content.model_dump(mode="json")
    lines = [
        *data["summary"],
        *(line for job in data["experience"] for line in job["bullets"]),
        *(line for school in data["education"] for line in school["details"]),
        *(line for project in data["projects"] for line in project["bullets"]),
        *(item for group in data["skills"] for item in group["items"]),
    ]
    for line in lines:
        if line["origin"] == "cv" and f" {comparable(line['text'])} " not in source:
            line["origin"] = "ai_reworded"
    return CvContent.model_validate(data)

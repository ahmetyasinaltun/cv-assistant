# Turns a saved CV's text into CvContent: one model call copies the CV into fields, then code cleans the output into
# the contract and checks its facts against the source text, retrying once when something cannot be found there.

import re
from dataclasses import dataclass
from typing import Any

from annotated_types import MaxLen
from pydantic import BaseModel, EmailStr, TypeAdapter, ValidationError

from app.ai.prompts import render_prompt
from app.ai.providers.base import LLMClient
from app.ai.schemas import CvStructure
from app.cv.content import (
    LINE_TEXT_MAX,
    SHORT_TEXT_MAX,
    URL_MAX,
    CvContact,
    CvContent,
    CvEducation,
    CvExperience,
    CvProject,
    CvSkillGroup,
)
from app.cv.source_check import UnsupportedFact, mark_reworded_lines, unsupported_facts

MAX_ATTEMPTS = 2

_DATE = re.compile(r"^(\d{4})(?:-(\d{1,2}))?$")
_PRESENT_WORDS = {"present", "current", "now", "ongoing"}
_EMAIL = TypeAdapter(EmailStr)


@dataclass(frozen=True)
class StructuringResult:
    content: CvContent
    # Facts the source text does not show after the retry: dates among them were removed, names were kept.
    unsupported: list[UnsupportedFact]
    omitted_sections: list[str]


class CvStructurer:
    def __init__(self, llm: LLMClient):
        self.llm = llm

    def structure(self, resume_text: str, fallback_name: str) -> StructuringResult:
        prompt = render_prompt("structure_cv", resume=resume_text)
        best: StructuringResult | None = None
        for _ in range(MAX_ATTEMPTS):
            raw = self.llm.generate_structured(
                task="structure_cv", prompt=prompt, schema=CvStructure
            )
            content = to_cv_content(raw, fallback_name)
            problems = unsupported_facts(content, resume_text)
            if best is None or len(problems) < len(best.unsupported):
                best = StructuringResult(content, problems, _clean_list(raw.omitted_sections))
            if not problems:
                break
        assert best is not None
        removed_dates = {fact.value for fact in best.unsupported if fact.kind == "date"}
        content = mark_reworded_lines(without_dates(best.content, removed_dates), resume_text)
        return StructuringResult(content, best.unsupported, best.omitted_sections)


def to_cv_content(raw: CvStructure, fallback_name: str) -> CvContent:
    """Cleans model output into the contract: trims and caps text, normalizes dates, keeps only web links and
    drops entries without their required fields. Every carried line is marked as coming from the CV."""
    contact = raw.contact
    data: dict[str, Any] = {
        "contact": {
            "name": _short(contact.name) or _short(fallback_name) or "CV",
            "email": _email(contact.email),
            "phone": _short(contact.phone),
            "location": _short(contact.location),
            "links": capped(
                [{"url": url} for url in map(_url, contact.links) if url], CvContact, "links"
            ),
        },
        "headline": _short(raw.headline),
        "summary": capped(_lines(raw.summary), CvContent, "summary"),
        "experience": capped(
            [
                {
                    "role": _short(job.role),
                    "organization": _short(job.organization),
                    "location": _short(job.location),
                    "start": _date(job.start),
                    "end": _date(job.end, allow_present=True),
                    "bullets": capped(_lines(job.bullets), CvExperience, "bullets"),
                }
                for job in raw.experience
                if _short(job.role) and _short(job.organization)
            ],
            CvContent,
            "experience",
        ),
        "education": capped(
            [
                {
                    "degree": _short(school.degree),
                    "school": _short(school.school),
                    "location": _short(school.location),
                    "start": _date(school.start),
                    "end": _date(school.end, allow_present=True),
                    "details": capped(_lines(school.details), CvEducation, "details"),
                }
                for school in raw.education
                if _short(school.degree) and _short(school.school)
            ],
            CvContent,
            "education",
        ),
        "projects": capped(
            [
                {
                    "name": _short(project.name),
                    "link": {"url": url} if (url := _url(project.url)) else None,
                    "start": _date(project.start),
                    "end": _date(project.end, allow_present=True),
                    "bullets": capped(_lines(project.bullets), CvProject, "bullets"),
                }
                for project in raw.projects
                if _short(project.name)
            ],
            CvContent,
            "projects",
        ),
        "skills": capped(
            [
                {"name": _short(group.name), "items": items}
                for group in raw.skills
                if (items := capped(_lines(group.items, SHORT_TEXT_MAX), CvSkillGroup, "items"))
            ],
            CvContent,
            "skills",
        ),
        "languages": capped(
            [
                {"name": _short(language.name), "level": _short(language.level)}
                for language in raw.languages
                if _short(language.name)
            ],
            CvContent,
            "languages",
        ),
        "certificates": capped(
            [
                {
                    "name": _short(certificate.name),
                    "issuer": _short(certificate.issuer),
                    "date": _date(certificate.date),
                }
                for certificate in raw.certificates
                if _short(certificate.name)
            ],
            CvContent,
            "certificates",
        ),
    }
    return CvContent.model_validate(data)


def without_dates(content: CvContent, removed: set[str]) -> CvContent:
    """Clears the given date values everywhere: a missing date is better than an invented one."""
    if not removed:
        return content
    data = content.model_dump(mode="json")
    for key, fields in (
        ("experience", ("start", "end")),
        ("education", ("start", "end")),
        ("projects", ("start", "end")),
        ("certificates", ("date",)),
    ):
        for item in data[key]:
            for field in fields:
                if item[field] in removed:
                    item[field] = None
    return CvContent.model_validate(data)


def _short(value: str | None) -> str | None:
    text = " ".join((value or "").split())
    return text[:SHORT_TEXT_MAX] or None


def _lines(values: list[str], max_chars: int = LINE_TEXT_MAX) -> list[dict]:
    texts = (" ".join(value.split())[:max_chars] for value in values)
    return [{"text": text, "origin": "cv"} for text in texts if text]


def _clean_list(values: list[str]) -> list[str]:
    return [text for text in map(_short, values) if text]


def capped(items: list, model: type[BaseModel], field: str) -> list:
    """Keeps as many items as the contract allows for that field."""
    limits = [m.max_length for m in model.model_fields[field].metadata if isinstance(m, MaxLen)]
    return items[: limits[0]] if limits else items


def _date(value: str | None, *, allow_present: bool = False) -> str | None:
    text = (value or "").strip().lower()
    if allow_present and text in _PRESENT_WORDS:
        return "present"
    match = _DATE.match(text)
    if not match:
        return None
    year, month = match.groups()
    if month is None:
        return year
    return f"{year}-{int(month):02d}" if 1 <= int(month) <= 12 else year


def _url(value: str | None) -> str | None:
    text = (value or "").strip()
    if not text or " " in text:
        return None
    if not text.lower().startswith(("https://", "http://")):
        # "github.com/name" is a web address written without its scheme; "mailto:" and the like are not kept.
        host = text.split("/")[0]
        if "://" in text or ":" in host or "." not in host:
            return None
        text = f"https://{text}"
    return text if len(text) <= URL_MAX else None


def _email(value: str | None) -> str | None:
    try:
        return _EMAIL.validate_python((value or "").strip()) if value else None
    except ValidationError:
        return None

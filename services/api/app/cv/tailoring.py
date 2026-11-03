# Tailors a CV to one posting: one model call writes text into the slots of the user's own CV (referenced by id), then
# code builds the CvContent. Employers, schools, dates and links are copied from the source CV, so tailoring cannot
# invent them; a line that claims to be copied but is not in the source gets the origin it really has.

import json
from dataclasses import dataclass, field
from typing import Literal

from app.ai.lexical import keyword_terms
from app.ai.prompts import render_prompt
from app.ai.providers.base import LLMClient
from app.ai.schemas import TailoredCv, TailoredLine
from app.cv.content import LINE_TEXT_MAX, SHORT_TEXT_MAX, CvContent, CvLine
from app.cv.source_check import comparable
from app.cv.structuring import capped
from app.schemas.analysis import RequirementMatch
from app.schemas.common import Language

TailoringMode = Literal["flexible", "strict"]

LANGUAGE_NAMES: dict[Language, str] = {"en": "English", "tr": "Turkish"}
POSTING_MAX_CHARS = 8000
MAX_QUESTIONS = 5

MODE_RULES: dict[TailoringMode, str] = {
    "flexible": (
        "The candidate chose the flexible mode. You may write the headline and summary freely for this posting, "
        "stressing strengths that fit it, including ones the CV does not show (origin ai_added), within the summary "
        "rules above. You may add skills the posting asks for to the "
        "skills list (origin ai_added). In positions and projects you may add plausible detail that fits what a line "
        "already says, for example that a full-stack project used a tool the posting asks for (origin "
        "ai_embellished), and at most one new bullet per position or project in an area the CV already touches "
        "(origin ai_added). Favour the posting's must-have requirements that are partial or missing. Never add a "
        "whole project or position. Return `questions` as an empty list."
    ),
    "strict": (
        "The candidate chose the strict mode. Use only facts the CV states: select, reorder, reword and translate, "
        "but add no skill, tool, detail or claim; every line's origin is cv or ai_reworded. When the posting asks "
        "for something the CV plausibly includes but does not say, do not write it; ask instead in `questions` (at "
        "most 5): a short yes/no question to the candidate, the id of the position or project it is about, and the "
        "bullet you would add if the answer is yes."
    ),
}


@dataclass(frozen=True)
class TailoringRequest:
    base: CvContent
    base_language: Language
    target_language: Language
    job_title: str
    company: str | None
    posting: str
    requirements: list[RequirementMatch]
    mode: TailoringMode


@dataclass(frozen=True)
class PendingQuestion:
    """A strict-mode question with the entry it is about, named so it can still be found after edits."""

    id: str
    question: str
    kind: Literal["experience", "projects"]
    entry_name: str
    proposed_line: str


@dataclass
class _SourceIds:
    """Ids the prompt uses for the source CV's parts and lines ("x1" is the first position, "x1.2" its 2nd line)."""

    lines: dict[str, str] = field(default_factory=dict)
    experience: list[str] = field(default_factory=list)
    education: list[str] = field(default_factory=list)
    projects: list[str] = field(default_factory=list)
    languages: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class TailoringResult:
    content: CvContent
    questions: list[PendingQuestion]


class CvTailorer:
    def __init__(self, llm: LLMClient):
        self.llm = llm

    def tailor(self, request: TailoringRequest) -> TailoringResult:
        ids, cv_json = describe_source(request.base)
        requirements = [
            {"id": r.id, "text": r.text, "importance": r.importance, "status": r.status}
            for r in request.requirements
        ]
        prompt = render_prompt(
            "tailor_cv",
            job_title=request.job_title,
            company=f", {request.company}" if request.company else "",
            posting=request.posting[:POSTING_MAX_CHARS],
            requirements=json.dumps(requirements, ensure_ascii=False),
            cv=json.dumps(cv_json, ensure_ascii=False),
            target_language=LANGUAGE_NAMES[request.target_language],
            source_language=LANGUAGE_NAMES[request.base_language],
            mode_rules=MODE_RULES[request.mode],
        )
        raw = self.llm.generate_structured(task="tailor_cv", prompt=prompt, schema=TailoredCv)
        same_language = request.base_language == request.target_language
        content = assemble(
            raw,
            request.base,
            ids,
            same_language=same_language,
            mode=request.mode,
            posting=request.posting,
            company=request.company,
        )
        questions = _questions(raw, request.base, ids) if request.mode == "strict" else []
        return TailoringResult(content=content, questions=questions)


def describe_source(base: CvContent) -> tuple[_SourceIds, dict]:
    """The source CV as the prompt sees it, with an id on every part and line."""
    ids = _SourceIds()

    def lines(prefix: str, items: list[CvLine]) -> list[dict]:
        described = []
        for number, line in enumerate(items, start=1):
            line_id = f"{prefix}{number}"
            ids.lines[line_id] = line.text
            described.append({"id": line_id, "text": line.text})
        return described

    experience = []
    for number, job in enumerate(base.experience, start=1):
        entry_id = f"x{number}"
        ids.experience.append(entry_id)
        experience.append(
            {
                "id": entry_id,
                "role": job.role,
                "organization": job.organization,
                "dates": [job.start, job.end],
                "bullets": lines(f"{entry_id}.", job.bullets),
            }
        )
    education = []
    for number, school in enumerate(base.education, start=1):
        entry_id = f"d{number}"
        ids.education.append(entry_id)
        education.append(
            {
                "id": entry_id,
                "degree": school.degree,
                "school": school.school,
                "details": lines(f"{entry_id}.", school.details),
            }
        )
    projects = []
    for number, project in enumerate(base.projects, start=1):
        entry_id = f"p{number}"
        ids.projects.append(entry_id)
        projects.append(
            {
                "id": entry_id,
                "name": project.name,
                "bullets": lines(f"{entry_id}.", project.bullets),
            }
        )
    languages = []
    for number, language in enumerate(base.languages, start=1):
        entry_id = f"l{number}"
        ids.languages.append(entry_id)
        languages.append({"id": entry_id, "name": language.name, "level": language.level})
    skills = [
        {"name": group.name, "items": lines(f"k{number}.", group.items)}
        for number, group in enumerate(base.skills, start=1)
    ]
    return ids, {
        "headline": base.headline,
        "summary": lines("s", base.summary),
        "experience": experience,
        "education": education,
        "projects": projects,
        "skills": skills,
        "languages": languages,
        "certificates": [certificate.name for certificate in base.certificates],
    }


def source_text(base: CvContent) -> str:
    """Everything the source CV says, comparable: lines, titles, organizations, projects and skills."""
    parts = [base.headline or "", *(line.text for line in base.summary)]
    for job in base.experience:
        parts += [job.role, job.organization, *(line.text for line in job.bullets)]
    for school in base.education:
        parts += [school.degree, school.school, *(line.text for line in school.details)]
    for project in base.projects:
        parts += [project.name, *(line.text for line in project.bullets)]
    parts += [item.text for group in base.skills for item in group.items]
    parts += [f"{language.name} {language.level or ''}" for language in base.languages]
    parts += [certificate.name for certificate in base.certificates]
    return " ".join(parts)


def assemble(
    raw: TailoredCv,
    base: CvContent,
    ids: _SourceIds,
    *,
    same_language: bool,
    mode: TailoringMode,
    posting: str = "",
    company: str | None = None,
) -> CvContent:
    """Builds the tailored CV from the source CV and the model's text. Entities always come from the source."""
    source = source_text(base)
    source_comparable = f" {comparable(source)} "
    # Words of the posting the CV never uses: a "reworded" line that brings one in has added something.
    new_posting_terms = set(keyword_terms(posting)) - set(keyword_terms(source))

    def line(item: TailoredLine) -> dict | None:
        text = " ".join(item.text.split())[:LINE_TEXT_MAX]
        if not text:
            return None
        origin = item.origin
        source = ids.lines.get(item.source) if item.source else None
        copied = source is not None and comparable(source) == comparable(text)
        if copied:
            origin = "cv"
        elif origin == "cv":
            # Claimed as copied but not in the CV word for word: a rewording of its source, or new.
            origin = "ai_reworded" if source is not None else "ai_added"
        elif (
            origin == "ai_reworded"
            and same_language
            and new_posting_terms & set(keyword_terms(text))
        ):
            origin = "ai_embellished"
        elif f" {comparable(text)} " in source_comparable:
            # A skill or phrase the CV already states word for word comes from the CV, whatever the model said.
            origin = "cv"
        if mode == "strict" and origin in ("ai_embellished", "ai_added"):
            return None
        return {"text": text, "origin": origin}

    def lines(items: list[TailoredLine]) -> list[dict]:
        return [built for built in map(line, items) if built]

    def title(model_value: str, source_value: str) -> str:
        # Titles change only by translation; in the CV's own language the source title stays.
        cleaned = " ".join(model_value.split())[:SHORT_TEXT_MAX]
        return source_value if same_language or not cleaned else cleaned

    data = base.model_dump(mode="json")
    headline = " ".join((raw.headline or "").split())[:SHORT_TEXT_MAX]
    if headline:
        data["headline"] = headline
    summary = lines(raw.summary)
    # A CV does not address the company; that belongs in a cover letter.
    company_name = comparable(company or "")
    if len(company_name) >= 3:
        summary = [s for s in summary if f" {company_name} " not in f" {comparable(s['text'])} "]
    if summary:
        data["summary"] = capped(summary, CvContent, "summary")

    experience = {item.id: item for item in raw.experience}
    for index, entry_id in enumerate(ids.experience):
        tailored = experience.get(entry_id)
        if tailored is None:
            continue
        data["experience"][index]["role"] = title(tailored.role, base.experience[index].role)
        bullets = lines(tailored.bullets)
        if bullets:
            data["experience"][index]["bullets"] = bullets[:12]

    education = {item.id: item for item in raw.education}
    for index, entry_id in enumerate(ids.education):
        tailored = education.get(entry_id)
        if tailored is None:
            continue
        data["education"][index]["degree"] = title(tailored.degree, base.education[index].degree)
        details = lines(tailored.details)
        if details:
            data["education"][index]["details"] = details[:8]

    # Projects follow the model's order of relevance; any it left out keep their place after the others.
    order = [ids.projects.index(item.id) for item in raw.projects if item.id in ids.projects]
    order = list(dict.fromkeys(order)) + [i for i in range(len(ids.projects)) if i not in order]
    tailored_projects = {item.id: item for item in raw.projects}
    projects = []
    for index in order:
        project = data["projects"][index]
        tailored = tailored_projects.get(ids.projects[index])
        bullets = lines(tailored.bullets) if tailored else []
        if bullets:
            project = {**project, "bullets": bullets[:8]}
        projects.append(project)
    data["projects"] = projects

    skills = [
        {"name": " ".join((group.name or "").split())[:SHORT_TEXT_MAX] or None, "items": items[:40]}
        for group in raw.skills
        if (items := [i for i in lines(group.items) if len(i["text"]) <= SHORT_TEXT_MAX])
    ]
    if skills:
        data["skills"] = capped(skills, CvContent, "skills")

    if not same_language:
        languages = {item.id: item for item in raw.languages}
        for index, entry_id in enumerate(ids.languages):
            tailored = languages.get(entry_id)
            if tailored and tailored.name.strip():
                data["languages"][index]["name"] = tailored.name.strip()[:SHORT_TEXT_MAX]
                data["languages"][index]["level"] = (tailored.level or "").strip()[
                    :SHORT_TEXT_MAX
                ] or None

    return CvContent.model_validate(data)


def _questions(raw: TailoredCv, base: CvContent, ids: _SourceIds) -> list[PendingQuestion]:
    questions = []
    for item in raw.questions:
        line = " ".join(item.proposed_line.split())[:LINE_TEXT_MAX]
        question = " ".join(item.question.split())[:LINE_TEXT_MAX]
        if not line or not question:
            continue
        if item.entry_id in ids.experience:
            job = base.experience[ids.experience.index(item.entry_id)]
            kind, name = "experience", f"{job.role} · {job.organization}"
        elif item.entry_id in ids.projects:
            kind, name = "projects", base.projects[ids.projects.index(item.entry_id)].name
        else:
            continue
        questions.append(PendingQuestion(f"q{len(questions) + 1}", question, kind, name, line))
        if len(questions) == MAX_QUESTIONS:
            break
    return questions

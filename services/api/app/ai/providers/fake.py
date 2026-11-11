# Deterministic offline stand-in for the AI provider, used by tests and local development without an API key.
# It reads the tagged input blocks from the prompt and applies simple keyword heuristics.

import hashlib
import json
import math
import re
from typing import TypeVar

from pydantic import BaseModel

from app.ai.schemas import (
    AnalysisNarrative,
    CvStructure,
    EvidenceExtraction,
    ExtractedEvidence,
    ExtractedRequirement,
    InterviewQuestionSet,
    MatchJudgement,
    RequirementExtraction,
    RequirementJudgement,
    StructuredContact,
    StructuredEducation,
    StructuredExperience,
    StructuredProject,
    StructuredSkillGroup,
    TailoredCv,
)
from app.schemas.analysis import InterviewQuestion, Suggestion

StructuredT = TypeVar("StructuredT", bound=BaseModel)

FAKE_EMBEDDING_DIMENSIONS = 64
_TOKEN = re.compile(r"[a-z0-9+#.]+")
_STOPWORDS = {
    "and",
    "or",
    "the",
    "a",
    "an",
    "with",
    "of",
    "in",
    "to",
    "for",
    "is",
    "are",
    "as",
    "on",
    "at",
    "by",
    "plus",
    "strong",
    "good",
    "experience",
    "knowledge",
    "familiarity",
    "years",
    "preferred",
    "skills",
    "using",
    "built",
    "wrote",
    "led",
}


def tokens(text: str) -> set[str]:
    return {t for t in _TOKEN.findall(text.lower()) if t not in _STOPWORDS and len(t) > 1}


def _block(prompt: str, tag: str) -> str:
    match = re.search(rf"<{tag}>\n?(.*?)\n?</{tag}>", prompt, re.DOTALL)
    return match.group(1) if match else ""


def _bullet_lines(text: str) -> list[str]:
    return [line[2:].strip() for line in text.splitlines() if line.startswith("- ")]


class FakeLLM:
    def generate_structured(
        self, *, task: str, prompt: str, schema: type[StructuredT]
    ) -> StructuredT:
        handlers = {
            "extract_requirements": self._extract_requirements,
            "extract_evidence": self._extract_evidence,
            "judge_matches": self._judge_matches,
            "write_narrative": self._write_narrative,
            "generate_interview_questions": self._interview_questions,
            "structure_cv": _structure_cv,
            "tailor_cv": _tailor_cv,
        }
        if task not in handlers:
            raise ValueError(f"FakeLLM has no handler for task '{task}'")
        result = handlers[task](prompt)
        if not isinstance(result, schema):
            raise TypeError(f"FakeLLM produced {type(result).__name__}, expected {schema.__name__}")
        return result

    @staticmethod
    def _extract_requirements(prompt: str) -> RequirementExtraction:
        requirements = []
        for line in _bullet_lines(_block(prompt, "job_description")):
            lowered = line.lower()
            is_optional = "plus" in lowered or "nice to have" in lowered or "bonus" in lowered
            is_soft = any(word in lowered for word in ("communication", "team", "collaborat"))
            requirements.append(
                ExtractedRequirement(
                    text=line,
                    category="soft_skill" if is_soft else "technical_skill",
                    importance="nice_to_have" if is_optional else "must_have",
                )
            )
        return RequirementExtraction(requirements=requirements)

    @staticmethod
    def _extract_evidence(prompt: str) -> EvidenceExtraction:
        evidence = []
        for line in _bullet_lines(_block(prompt, "resume")):
            skills = sorted(t for t in tokens(line) if t[0].isalpha() and len(t) > 2)[:6]
            evidence.append(ExtractedEvidence(text=line, section=None, skills=skills))
        return EvidenceExtraction(evidence=evidence)

    @staticmethod
    def _judge_matches(prompt: str) -> MatchJudgement:
        payload = json.loads(_block(prompt, "requirements_with_candidates"))
        judgements = []
        for item in payload:
            requirement_tokens = tokens(item["text"])
            best_id, best_overlap = None, 0
            for candidate in item["candidates"]:
                overlap = len(requirement_tokens & tokens(candidate["text"]))
                if overlap > best_overlap:
                    best_id, best_overlap = candidate["evidence_id"], overlap
            if best_overlap >= 2:
                status, evidence_ids = "matched", [best_id]
            elif best_overlap == 1:
                status, evidence_ids = "partial", [best_id]
            else:
                status, evidence_ids = "missing", []
            judgements.append(
                RequirementJudgement(
                    requirement_id=item["id"],
                    status=status,
                    reasoning=f"Keyword overlap of {best_overlap} term(s) with the resume evidence.",
                    supporting_evidence_ids=evidence_ids,
                )
            )
        return MatchJudgement(judgements=judgements)

    @staticmethod
    def _write_narrative(prompt: str) -> AnalysisNarrative:
        requirements = json.loads(_block(prompt, "requirement_matches"))
        gaps = [r for r in requirements if r["status"] != "matched"]
        suggestions = [
            Suggestion(
                title=f"Address: {r['text'][:60]}",
                detail=f"Add concrete evidence for '{r['text']}' or build a small project that uses it.",
                target="skill" if r["status"] == "missing" else "cv_section",
                priority="high" if r["importance"] == "must_have" else "medium",
                related_requirement_ids=[r["id"]],
            )
            for r in gaps
        ]
        matched = len(requirements) - len(gaps)
        return AnalysisNarrative(
            summary=f"{matched} of {len(requirements)} requirements are supported by resume evidence.",
            limitations=["Generated by the offline fake provider using keyword heuristics."],
            suggestions=suggestions,
        )

    @staticmethod
    def _interview_questions(prompt: str) -> InterviewQuestionSet:
        requirements = json.loads(_block(prompt, "requirement_matches"))
        questions = [
            InterviewQuestion(
                question=f"Tell me about your experience with: {r['text']}",
                category="gap" if r["status"] == "missing" else "technical",
                rationale=f"The requirement is currently '{r['status']}'.",
                related_requirement_ids=[r["id"]],
            )
            for r in requirements[:6]
        ]
        return InterviewQuestionSet(questions=questions)


# --- structure_cv: reads the plain "Heading" + "- item" layout of the sample and evaluation CVs ----------------

_SECTION_KEYS = {
    "experience": "experience",
    "deneyim": "experience",
    "education": "education",
    "eğitim": "education",
    "projects": "projects",
    "projeler": "projects",
    "skills": "skills",
    "beceriler": "skills",
    "yetenekler": "skills",
    "links": "links",
}
_MONTHS = {
    name: number
    for number, names in enumerate(
        [
            ("jan", "oca"),
            ("feb", "şub"),
            ("mar",),
            ("apr", "nis"),
            ("may",),
            ("jun", "haz"),
            ("jul", "tem"),
            ("aug", "ağu"),
            ("sep", "eyl"),
            ("oct", "eki"),
            ("nov", "kas"),
            ("dec", "ara"),
        ],
        start=1,
    )
    for name in names
}
_ENTRY = re.compile(r"^(?P<head>[^:(]+?)\s*(?:\((?P<dates>[^)]*)\))?\s*:\s*(?P<text>.+)$")
_DATE_PART = re.compile(r"(?:([A-Za-zÇĞİÖŞÜçğıöşü]{3})[A-Za-zÇĞİÖŞÜçğıöşü]*\.?\s+)?(\d{4})")


def _fake_dates(text: str | None) -> tuple[str | None, str | None]:
    found = []
    for month, year in _DATE_PART.findall(text or ""):
        number = _MONTHS.get(month.lower())
        found.append(f"{year}-{number:02d}" if number else year)
    return (found[0] if found else None, found[1] if len(found) > 1 else None)


def _structure_cv(prompt: str) -> CvStructure:
    lines = [line.strip() for line in _block(prompt, "resume").splitlines() if line.strip()]
    name = lines[0] if lines else "Candidate"
    headline = lines[1] if len(lines) > 1 and lines[1].lower() not in _SECTION_KEYS else None
    sections: dict[str, list[str]] = {}
    omitted: list[str] = []
    current = None
    for line in lines[2 if headline else 1 :]:
        is_item = line.startswith("- ")
        # A plain comma-separated line under a heading ("Python, SQL, Git") is an item, not a heading.
        if not is_item and (line.lower() in _SECTION_KEYS or "," not in line or current is None):
            current = _SECTION_KEYS.get(line.lower())
            if current is None:
                omitted.append(line)
            continue
        if current:
            sections.setdefault(current, []).append(line[2:].strip() if is_item else line)

    def entries(key: str) -> list[tuple[str, str | None, str | None, str | None, str]]:
        parsed = []
        for item in sections.get(key, []):
            match = _ENTRY.match(item)
            if not match:
                continue
            head, _, place = match["head"].partition(",")
            start, end = _fake_dates(match["dates"])
            parsed.append((head.strip(), place.strip() or None, start, end, match["text"].strip()))
        return parsed

    return CvStructure(
        contact=StructuredContact(name=name, links=sections.get("links", [])),
        headline=headline,
        experience=[
            StructuredExperience(
                role=role, organization=org or role, start=start, end=end, bullets=[text]
            )
            for role, org, start, end, text in entries("experience")
        ],
        education=[
            StructuredEducation(degree=degree, school=school or degree, start=start, end=end)
            for degree, school, start, end, _ in entries("education")
        ],
        projects=[
            StructuredProject(name=project, start=start, end=end, bullets=[text])
            for project, _, start, end, text in entries("projects")
        ],
        skills=[
            StructuredSkillGroup(items=[part.strip() for part in item.split(",") if part.strip()])
            for item in sections.get("skills", [])
        ],
        omitted_sections=omitted,
    )


# --- tailor_cv: keeps every line, reorders projects, adds one skill (flexible) or asks one question (strict) -------


def _tailor_cv(prompt: str) -> TailoredCv:
    cv = json.loads(_block(prompt, "cv"))
    strict = "strict mode" in prompt
    experience = [
        {
            "id": job["id"],
            "role": job["role"],
            "bullets": [
                {"text": line["text"], "origin": "cv", "source": line["id"]}
                for line in job["bullets"]
            ],
        }
        for job in cv["experience"]
    ]
    skills = [
        {
            "name": group["name"],
            "items": [
                {"text": item["text"], "origin": "cv", "source": item["id"]}
                for item in group["items"]
            ],
        }
        for group in cv["skills"]
    ]
    if not strict and skills:
        skills[0]["items"].append({"text": "Kubernetes", "origin": "ai_added"})
    questions = []
    if strict and experience:
        questions.append(
            {
                "question": "Did you deploy this service with Docker?",
                "entry_id": experience[0]["id"],
                "proposed_line": "Deployed the service with Docker.",
            }
        )
    return TailoredCv.model_validate(
        {
            "headline": "Backend developer in training",
            "summary": [
                {"text": "Ready to build and test APIs for this team.", "origin": "ai_added"}
            ],
            "experience": experience,
            "education": [
                {"id": school["id"], "degree": school["degree"], "details": []}
                for school in cv["education"]
            ],
            "projects": [
                {
                    "id": project["id"],
                    "bullets": [
                        {"text": line["text"], "origin": "cv", "source": line["id"]}
                        for line in project["bullets"]
                    ],
                }
                for project in reversed(cv["projects"])
            ],
            "skills": skills,
            "languages": [],
            "questions": questions,
        }
    )


class FakeEmbeddings:
    """Hashed bag-of-words vectors: identical tokens land in identical dimensions, so overlap => similarity."""

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_one(text) for text in texts]

    @staticmethod
    def _embed_one(text: str) -> list[float]:
        vector = [0.0] * FAKE_EMBEDDING_DIMENSIONS
        for token in tokens(text):
            digest = hashlib.sha1(token.encode("utf-8"), usedforsecurity=False).digest()
            vector[digest[0] % FAKE_EMBEDDING_DIMENSIONS] += 1.0
        norm = math.sqrt(sum(v * v for v in vector)) or 1.0
        return [v / norm for v in vector]


class FakeProvider:
    def __init__(self):
        self.llm = FakeLLM()
        self.embeddings = FakeEmbeddings()

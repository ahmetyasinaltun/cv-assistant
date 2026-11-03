# Structured-output schemas for each LLM step of the pipeline (intermediate shapes, not API responses).

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.analysis import (
    Importance,
    InterviewQuestion,
    MatchStatus,
    RequirementCategory,
    Suggestion,
)


class ExtractedRequirement(BaseModel):
    text: str = Field(description="One concrete requirement, phrased as in the posting.")
    category: RequirementCategory
    importance: Importance


class RequirementExtraction(BaseModel):
    requirements: list[ExtractedRequirement]


class ExtractedEvidence(BaseModel):
    text: str = Field(description="One self-contained statement taken from the resume.")
    section: str | None = None
    skills: list[str] = Field(default_factory=list)


class EvidenceExtraction(BaseModel):
    evidence: list[ExtractedEvidence]


class RequirementJudgement(BaseModel):
    requirement_id: str
    status: MatchStatus
    reasoning: str
    supporting_evidence_ids: list[str] = Field(default_factory=list)


class MatchJudgement(BaseModel):
    judgements: list[RequirementJudgement]


class AnalysisNarrative(BaseModel):
    summary: str
    limitations: list[str] = Field(default_factory=list)
    suggestions: list[Suggestion]


class InterviewQuestionSet(BaseModel):
    questions: list[InterviewQuestion]


# --- Structuring a CV (CV Maker) ------------------------------------------------------------------
# Plain shapes the model can fill reliably; app.cv.structuring cleans them into the CvContent contract.

_DATE_HINT = '"YYYY-MM" when the month is given, "YYYY" when only the year is, otherwise null.'


class StructuredContact(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    links: list[str] = Field(
        default_factory=list, description="Profile and portfolio web addresses."
    )


class StructuredExperience(BaseModel):
    role: str = Field(description="The job or position title, as written.")
    organization: str = Field(description="The employer or institution, as written.")
    location: str | None = None
    start: str | None = Field(default=None, description=_DATE_HINT)
    end: str | None = Field(default=None, description=_DATE_HINT + ' "present" if ongoing.')
    bullets: list[str] = Field(default_factory=list)


class StructuredEducation(BaseModel):
    degree: str
    school: str
    location: str | None = None
    start: str | None = Field(default=None, description=_DATE_HINT)
    end: str | None = Field(default=None, description=_DATE_HINT + ' "present" if ongoing.')
    details: list[str] = Field(default_factory=list)


class StructuredProject(BaseModel):
    name: str
    url: str | None = None
    start: str | None = Field(default=None, description=_DATE_HINT)
    end: str | None = Field(default=None, description=_DATE_HINT + ' "present" if ongoing.')
    bullets: list[str] = Field(default_factory=list)


class StructuredSkillGroup(BaseModel):
    name: str | None = None
    items: list[str]


class StructuredLanguage(BaseModel):
    name: str
    level: str | None = None


class StructuredCertificate(BaseModel):
    name: str
    issuer: str | None = None
    date: str | None = Field(default=None, description=_DATE_HINT)


class CvStructure(BaseModel):
    contact: StructuredContact
    headline: str | None = None
    summary: list[str] = Field(default_factory=list, description="Profile text, one sentence each.")
    experience: list[StructuredExperience] = Field(default_factory=list)
    education: list[StructuredEducation] = Field(default_factory=list)
    projects: list[StructuredProject] = Field(default_factory=list)
    skills: list[StructuredSkillGroup] = Field(default_factory=list)
    languages: list[StructuredLanguage] = Field(default_factory=list)
    certificates: list[StructuredCertificate] = Field(default_factory=list)
    omitted_sections: list[str] = Field(
        default_factory=list,
        description="Headings of CV sections that fit none of the fields above, as written.",
    )


# --- Tailoring a CV to a posting -------------------------------------------------------------------
# The model writes text into slots of the user's own CV, referenced by id. Employers, schools, dates and links are
# not part of this shape at all: app.cv.tailoring copies them from the source CV, so they cannot be invented.

TailoredOrigin = Literal["cv", "ai_reworded", "ai_embellished", "ai_added"]


class TailoredLine(BaseModel):
    text: str
    origin: TailoredOrigin = Field(
        description='"cv": copied as it is; "ai_reworded": the same fact in new words or translated; '
        '"ai_embellished": a fact from the CV with detail added; "ai_added": not in the CV.'
    )
    source: str | None = Field(
        default=None, description="Id of the CV line this line comes from, when there is one."
    )


class TailoredExperience(BaseModel):
    id: str = Field(description="Id of the position in the source CV.")
    role: str = Field(
        description="The position title, translated only when the CV changes language."
    )
    bullets: list[TailoredLine] = Field(default_factory=list)


class TailoredEducation(BaseModel):
    id: str
    degree: str = Field(description="The degree, translated only when the CV changes language.")
    details: list[TailoredLine] = Field(default_factory=list)


class TailoredProject(BaseModel):
    id: str
    bullets: list[TailoredLine] = Field(default_factory=list)


class TailoredSkillGroup(BaseModel):
    name: str | None = None
    items: list[TailoredLine]


class TailoredLanguage(BaseModel):
    id: str
    name: str
    level: str | None = None


class ConfirmationQuestion(BaseModel):
    """Strict mode: instead of adding a claim, ask the user whether it is true."""

    question: str
    entry_id: str = Field(description="Id of the position or project the proposed line belongs to.")
    proposed_line: str


class TailoredCv(BaseModel):
    headline: str | None = None
    summary: list[TailoredLine] = Field(default_factory=list)
    experience: list[TailoredExperience] = Field(default_factory=list)
    education: list[TailoredEducation] = Field(default_factory=list)
    projects: list[TailoredProject] = Field(default_factory=list)
    skills: list[TailoredSkillGroup] = Field(default_factory=list)
    languages: list[TailoredLanguage] = Field(default_factory=list)
    questions: list[ConfirmationQuestion] = Field(default_factory=list)

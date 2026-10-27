# Schemas for the analysis API and the validated structured result produced by the AI pipeline.
# The nested models here are the single source of truth for what the pipeline is allowed to store.

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.analysis import AnalysisStatus
from app.schemas.common import Language, ORMModel

RequirementCategory = Literal[
    "technical_skill", "tool", "experience", "education", "soft_skill", "domain", "other"
]
Importance = Literal["must_have", "nice_to_have"]
MatchStatus = Literal["matched", "partial", "missing"]
FitLevel = Literal["strong", "moderate", "weak"]
SuggestionTarget = Literal["skill", "cv_section", "project", "interview_topic"]
Priority = Literal["high", "medium", "low"]
QuestionCategory = Literal["technical", "behavioral", "project", "gap"]


class EvidenceReference(BaseModel):
    evidence_id: str
    quote: str = Field(description="Verbatim or near-verbatim excerpt from the resume.")
    similarity: float = Field(ge=0.0, le=1.0)


class RequirementMatch(BaseModel):
    id: str
    text: str
    category: RequirementCategory
    importance: Importance
    status: MatchStatus
    reasoning: str
    evidence: list[EvidenceReference] = Field(default_factory=list)


class CandidateEvidence(BaseModel):
    id: str
    text: str = Field(description="A self-contained statement grounded in the resume.")
    section: str | None = Field(default=None, description="Resume section it came from, if clear.")
    skills: list[str] = Field(default_factory=list)


class Suggestion(BaseModel):
    title: str
    detail: str
    target: SuggestionTarget
    priority: Priority
    related_requirement_ids: list[str] = Field(default_factory=list)


class OverallMatch(BaseModel):
    score: int = Field(ge=0, le=100)
    fit_level: FitLevel
    summary: str
    score_explanation: str
    limitations: list[str] = Field(default_factory=list)


class AnalysisResult(BaseModel):
    overall: OverallMatch
    requirements: list[RequirementMatch]
    candidate_evidence: list[CandidateEvidence]
    suggestions: list[Suggestion]


class InterviewQuestion(BaseModel):
    question: str
    category: QuestionCategory
    rationale: str
    related_requirement_ids: list[str] = Field(default_factory=list)


class AnalysisCreateRequest(BaseModel):
    resume_id: UUID
    job_description_id: UUID
    # Language of the AI-written text; when omitted, the account's preferred language is used.
    output_language: Language | None = None


class AnalysisSummaryResponse(ORMModel):
    id: UUID
    status: AnalysisStatus
    output_language: Language
    resume_id: UUID
    job_description_id: UUID
    resume_title: str
    job_title: str
    company: str | None
    score: int | None
    fit_level: FitLevel | None
    created_at: datetime
    completed_at: datetime | None


class AnalysisDetailResponse(AnalysisSummaryResponse):
    result: AnalysisResult | None
    interview_questions: list[InterviewQuestion] | None
    error_code: str | None
    error_message: str | None

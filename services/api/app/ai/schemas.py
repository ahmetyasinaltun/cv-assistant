# Structured-output schemas for each LLM step of the pipeline (intermediate shapes, not API responses).

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

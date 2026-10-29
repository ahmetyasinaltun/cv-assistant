# Orchestrates the analysis pipeline: extraction -> embeddings -> retrieval -> judgement -> scoring -> narrative.
# Each step is a small method so the flow can be read, tested and evaluated independently.

import json
import logging
import re
from dataclasses import dataclass

from app.ai.matching import RetrievedCandidate, retrieve_candidates
from app.ai.prompts import render_prompt
from app.ai.providers.base import AIProvider
from app.ai.schemas import (
    AnalysisNarrative,
    EvidenceExtraction,
    InterviewQuestionSet,
    MatchJudgement,
    RequirementExtraction,
    RequirementJudgement,
)
from app.ai.scoring import SCORE_EXPLANATIONS, compute_score, fit_level_for
from app.core.errors import AIProviderError
from app.schemas.analysis import (
    AnalysisResult,
    CandidateEvidence,
    EvidenceReference,
    InterviewQuestion,
    OverallMatch,
    RequirementMatch,
)
from app.schemas.common import DEFAULT_LANGUAGE, Language

logger = logging.getLogger(__name__)

MAX_QUOTE_CHARS = 300
_LIST_MARKER = re.compile(r"^-(?:\s+|$)")

# Prompts name the language instead of passing a code: models follow a name more reliably.
# The Turkish interface addresses the user informally, so generated Turkish text should too.
PROMPT_LANGUAGES: dict[Language, str] = {
    "en": "English",
    "tr": 'Turkish, addressing the candidate informally ("sen") as the product interface does',
}

# Sentences the grounding guard writes itself, in each output language.
NOT_ASSESSED_REASONING: dict[Language, str] = {
    "en": "The model did not assess this requirement.",
    "tr": "Model bu şartı değerlendirmedi.",
}
UNGROUNDED_NOTE: dict[Language, str] = {
    "en": "(No supporting evidence was cited, so this is treated as missing.)",
    "tr": "(Destekleyen bir kanıt gösterilmediği için eksik sayıldı.)",
}


@dataclass(frozen=True)
class AnalysisInput:
    job_title: str
    job_description: str
    resume: str
    output_language: Language = DEFAULT_LANGUAGE


@dataclass(frozen=True)
class _Requirement:
    id: str
    text: str
    category: str
    importance: str


class AnalysisPipeline:
    def __init__(self, provider: AIProvider):
        self.llm = provider.llm
        self.embeddings = provider.embeddings

    def run(self, analysis_input: AnalysisInput) -> AnalysisResult:
        language = analysis_input.output_language
        requirements = self.extract_requirements(analysis_input.job_description)
        evidence = self.extract_evidence(analysis_input.resume)
        candidates = self.retrieve(requirements, evidence)
        judgements = self.judge(requirements, evidence, candidates, language)
        matches = self.build_matches(requirements, evidence, candidates, judgements, language)
        overall = self.score(matches, language)
        narrative = self.write_narrative(analysis_input.job_title, matches, overall, language)
        overall.summary = narrative.summary
        overall.limitations = narrative.limitations
        return AnalysisResult(
            overall=overall,
            requirements=matches,
            candidate_evidence=evidence,
            suggestions=narrative.suggestions,
        )

    # --- LLM steps -------------------------------------------------------------------------

    def extract_requirements(self, job_description: str) -> list[_Requirement]:
        prompt = render_prompt("extract_requirements", job_description=job_description)
        extraction = self.llm.generate_structured(
            task="extract_requirements", prompt=prompt, schema=RequirementExtraction
        )
        requirements = [
            _Requirement(
                id=f"r{i}",
                text=item.text.strip(),
                category=item.category,
                importance=item.importance,
            )
            for i, item in enumerate(extraction.requirements, start=1)
            if item.text.strip()
        ]
        if not requirements:
            raise AIProviderError(
                "No requirements could be extracted from the job description.",
                code="no_requirements_extracted",
                status_code=422,
            )
        return requirements

    def extract_evidence(self, resume: str) -> list[CandidateEvidence]:
        prompt = render_prompt("extract_evidence", resume=resume)
        extraction = self.llm.generate_structured(
            task="extract_evidence", prompt=prompt, schema=EvidenceExtraction
        )
        evidence = [
            CandidateEvidence(
                id=f"e{i}", text=_evidence_text(item.text), section=item.section, skills=item.skills
            )
            for i, item in enumerate(extraction.evidence, start=1)
            if _evidence_text(item.text)
        ]
        if not evidence:
            raise AIProviderError(
                "No evidence could be extracted from the resume.",
                code="no_evidence_extracted",
                status_code=422,
            )
        return evidence

    def judge(
        self,
        requirements: list[_Requirement],
        evidence: list[CandidateEvidence],
        candidates: list[list[RetrievedCandidate]],
        output_language: Language,
    ) -> dict[str, RequirementJudgement]:
        evidence_by_id = {item.id: item for item in evidence}
        payload = [
            {
                "id": requirement.id,
                "text": requirement.text,
                "importance": requirement.importance,
                "candidates": [
                    {
                        "evidence_id": candidate.evidence_id,
                        "similarity": candidate.similarity,
                        "text": evidence_by_id[candidate.evidence_id].text,
                    }
                    for candidate in requirement_candidates
                ],
            }
            for requirement, requirement_candidates in zip(requirements, candidates, strict=True)
        ]
        prompt = render_prompt(
            "judge_matches",
            requirements_with_candidates=json.dumps(payload, ensure_ascii=False, indent=1),
            output_language=PROMPT_LANGUAGES[output_language],
        )
        judgement = self.llm.generate_structured(
            task="judge_matches", prompt=prompt, schema=MatchJudgement
        )
        return {item.requirement_id: item for item in judgement.judgements}

    def write_narrative(
        self,
        job_title: str,
        matches: list[RequirementMatch],
        overall: OverallMatch,
        output_language: Language,
    ) -> AnalysisNarrative:
        prompt = render_prompt(
            "write_narrative",
            job_title=job_title,
            score=str(overall.score),
            fit_level=overall.fit_level,
            score_explanation=overall.score_explanation,
            requirement_matches=_matches_as_json(matches),
            output_language=PROMPT_LANGUAGES[output_language],
        )
        narrative = self.llm.generate_structured(
            task="write_narrative", prompt=prompt, schema=AnalysisNarrative
        )
        valid_ids = {match.id for match in matches}
        for suggestion in narrative.suggestions:
            suggestion.related_requirement_ids = [
                rid for rid in suggestion.related_requirement_ids if rid in valid_ids
            ]
        return narrative

    def generate_interview_questions(
        self, job_title: str, result: AnalysisResult, output_language: Language
    ) -> list[InterviewQuestion]:
        prompt = render_prompt(
            "generate_interview_questions",
            job_title=job_title,
            requirement_matches=_matches_as_json(result.requirements),
            output_language=PROMPT_LANGUAGES[output_language],
        )
        question_set = self.llm.generate_structured(
            task="generate_interview_questions", prompt=prompt, schema=InterviewQuestionSet
        )
        valid_ids = {match.id for match in result.requirements}
        for question in question_set.questions:
            question.related_requirement_ids = [
                rid for rid in question.related_requirement_ids if rid in valid_ids
            ]
        if not question_set.questions:
            raise AIProviderError("No interview questions were generated.")
        return question_set.questions

    # --- Deterministic steps ---------------------------------------------------------------

    def retrieve(
        self, requirements: list[_Requirement], evidence: list[CandidateEvidence]
    ) -> list[list[RetrievedCandidate]]:
        # One embedding call for both sides: vectors are only comparable when the same model made
        # them, and the provider may fall back to another model between separate calls.
        vectors = self.embeddings.embed([r.text for r in requirements] + [e.text for e in evidence])
        requirement_vectors, evidence_vectors = (
            vectors[: len(requirements)],
            vectors[len(requirements) :],
        )
        return retrieve_candidates(
            [r.text for r in requirements],
            requirement_vectors,
            [e.id for e in evidence],
            [e.text for e in evidence],
            evidence_vectors,
        )

    @staticmethod
    def build_matches(
        requirements: list[_Requirement],
        evidence: list[CandidateEvidence],
        candidates: list[list[RetrievedCandidate]],
        judgements: dict[str, RequirementJudgement],
        output_language: Language,
    ) -> list[RequirementMatch]:
        """Combine judgements with retrieval data and enforce grounding rules on the model output."""
        evidence_by_id = {item.id: item for item in evidence}
        matches = []
        for requirement, requirement_candidates in zip(requirements, candidates, strict=True):
            similarity_by_id = {c.evidence_id: c.similarity for c in requirement_candidates}
            judgement = judgements.get(requirement.id)
            if judgement is None:
                logger.warning("Judgement missing for %s; marking as missing", requirement.id)
                status, reasoning, cited_ids = (
                    "missing",
                    NOT_ASSESSED_REASONING[output_language],
                    [],
                )
            else:
                status, reasoning = judgement.status, judgement.reasoning
                cited_ids = [
                    eid for eid in judgement.supporting_evidence_ids if eid in similarity_by_id
                ]
                if status != "missing" and not cited_ids:
                    # An unsupported claim: the model asserted a match without citing retrieved evidence.
                    logger.info(
                        "Downgrading %s to missing: no grounded evidence cited", requirement.id
                    )
                    status = "missing"
                    reasoning = f"{reasoning} {UNGROUNDED_NOTE[output_language]}"
                if status == "missing":
                    cited_ids = []
            matches.append(
                RequirementMatch(
                    id=requirement.id,
                    text=requirement.text,
                    category=requirement.category,
                    importance=requirement.importance,
                    status=status,
                    reasoning=reasoning,
                    evidence=[
                        EvidenceReference(
                            evidence_id=eid,
                            quote=evidence_by_id[eid].text[:MAX_QUOTE_CHARS],
                            similarity=similarity_by_id[eid],
                        )
                        for eid in cited_ids
                    ],
                )
            )
        return matches

    @staticmethod
    def score(matches: list[RequirementMatch], output_language: Language) -> OverallMatch:
        score = compute_score([(m.importance, m.status) for m in matches])
        return OverallMatch(
            score=score,
            fit_level=fit_level_for(score),
            summary="",
            score_explanation=SCORE_EXPLANATIONS[output_language],
            limitations=[],
        )


def _evidence_text(text: str) -> str:
    """The copied statement without the "- " the normalizer puts in front of every bullet point."""
    return _LIST_MARKER.sub("", text.strip()).strip()


def _matches_as_json(matches: list[RequirementMatch]) -> str:
    compact = [
        {
            "id": m.id,
            "text": m.text,
            "category": m.category,
            "importance": m.importance,
            "status": m.status,
            "reasoning": m.reasoning,
            "evidence": [e.quote for e in m.evidence],
        }
        for m in matches
    ]
    return json.dumps(compact, ensure_ascii=False, indent=1)

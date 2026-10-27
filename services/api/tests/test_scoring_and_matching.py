# Unit tests for the deterministic parts of the AI pipeline: scoring, similarity, retrieval and grounding rules.

from typing import get_args

import pytest

from app.ai.matching import RetrievedCandidate, cosine_similarity, retrieve_candidates
from app.ai.pipeline import (
    NOT_ASSESSED_REASONING,
    PROMPT_LANGUAGES,
    UNGROUNDED_NOTE,
    AnalysisPipeline,
    _Requirement,
)
from app.ai.providers.fake import FakeProvider
from app.ai.schemas import RequirementJudgement
from app.ai.scoring import SCORE_EXPLANATIONS, compute_score, fit_level_for
from app.schemas.analysis import CandidateEvidence
from app.schemas.common import Language


def test_compute_score_weights_must_have_twice():
    # must_have matched (2*1) + nice_to_have missing (1*0) = 2 / 3 => 67
    assert compute_score([("must_have", "matched"), ("nice_to_have", "missing")]) == 67
    # must_have missing + nice_to_have matched = 1 / 3 => 33
    assert compute_score([("must_have", "missing"), ("nice_to_have", "matched")]) == 33


def test_compute_score_partial_and_empty():
    assert compute_score([("must_have", "partial")]) == 50
    assert compute_score([]) == 0
    assert compute_score([("must_have", "matched"), ("must_have", "matched")]) == 100


@pytest.mark.parametrize(
    "score,level",
    [
        (100, "strong"),
        (75, "strong"),
        (74, "moderate"),
        (45, "moderate"),
        (44, "weak"),
        (0, "weak"),
    ],
)
def test_fit_level_thresholds(score, level):
    assert fit_level_for(score) == level


def test_cosine_similarity_basics():
    assert cosine_similarity([1.0, 0.0], [1.0, 0.0]) == pytest.approx(1.0)
    assert cosine_similarity([1.0, 0.0], [0.0, 1.0]) == pytest.approx(0.0)
    assert cosine_similarity([0.0, 0.0], [1.0, 1.0]) == 0.0
    with pytest.raises(ValueError):
        cosine_similarity([1.0], [1.0, 2.0])


def test_retrieve_candidates_returns_top_k_best_first():
    requirement_vectors = [[1.0, 0.0]]
    evidence_ids = ["e1", "e2", "e3"]
    evidence_vectors = [[0.0, 1.0], [1.0, 0.0], [0.7, 0.7]]
    [candidates] = retrieve_candidates(requirement_vectors, evidence_ids, evidence_vectors, top_k=2)
    assert [c.evidence_id for c in candidates] == ["e2", "e3"]
    assert candidates[0].similarity == pytest.approx(1.0)


def test_retrieve_embeds_both_sides_in_one_call():
    # Separate calls could be served by different fallback models, whose vectors are not comparable.
    provider = FakeProvider()
    embed_calls: list[list[str]] = []
    real_embed = provider.embeddings.embed
    provider.embeddings.embed = lambda texts: embed_calls.append(texts) or real_embed(texts)

    evidence = [
        CandidateEvidence(
            id="e1", text="Built REST APIs with FastAPI", section="experience", skills=[]
        ),
        CandidateEvidence(id="e2", text="Led a chess club", section="other", skills=[]),
    ]
    [candidates] = AnalysisPipeline(provider).retrieve([_requirement("r1")], evidence)

    assert embed_calls == [["Requirement r1", "Built REST APIs with FastAPI", "Led a chess club"]]
    assert {c.evidence_id for c in candidates} == {"e1", "e2"}


def _requirement(rid: str, importance: str = "must_have") -> _Requirement:
    return _Requirement(
        id=rid, text=f"Requirement {rid}", category="technical_skill", importance=importance
    )


def test_build_matches_downgrades_unsupported_claims():
    requirements = [_requirement("r1"), _requirement("r2")]
    evidence = [CandidateEvidence(id="e1", text="Built APIs with FastAPI")]
    candidates = [[RetrievedCandidate("e1", 0.9)], [RetrievedCandidate("e1", 0.2)]]
    judgements = {
        # Claims matched but cites an evidence id that was never retrieved for r1 -> must be downgraded.
        "r1": RequirementJudgement(
            requirement_id="r1",
            status="matched",
            reasoning="Looks fine",
            supporting_evidence_ids=["e99"],
        ),
        # Legitimate partial match with a grounded citation.
        "r2": RequirementJudgement(
            requirement_id="r2",
            status="partial",
            reasoning="Related",
            supporting_evidence_ids=["e1"],
        ),
    }
    matches = AnalysisPipeline.build_matches(requirements, evidence, candidates, judgements, "en")
    assert matches[0].status == "missing"
    assert matches[0].evidence == []
    assert "treated as missing" in matches[0].reasoning
    assert matches[1].status == "partial"
    assert matches[1].evidence[0].evidence_id == "e1"
    assert matches[1].evidence[0].similarity == pytest.approx(0.2)


def test_build_matches_handles_missing_judgement():
    requirements = [_requirement("r1")]
    evidence = [CandidateEvidence(id="e1", text="Something")]
    matches = AnalysisPipeline.build_matches(
        requirements, evidence, [[RetrievedCandidate("e1", 0.5)]], {}, "en"
    )
    assert matches[0].status == "missing"
    assert matches[0].evidence == []


def test_every_output_language_has_the_text_the_server_writes_itself():
    for language in get_args(Language):
        assert SCORE_EXPLANATIONS[language]
        assert PROMPT_LANGUAGES[language]
        assert NOT_ASSESSED_REASONING[language]
        assert UNGROUNDED_NOTE[language]


def test_build_matches_writes_its_notes_in_the_output_language():
    requirements = [_requirement("r1"), _requirement("r2")]
    evidence = [CandidateEvidence(id="e1", text="SQL sorgularıyla raporlar hazırladım")]
    candidates = [[RetrievedCandidate("e1", 0.8)], [RetrievedCandidate("e1", 0.3)]]
    judgements = {
        "r1": RequirementJudgement(
            requirement_id="r1", status="matched", reasoning="Uygun görünüyor."
        ),
    }
    matches = AnalysisPipeline.build_matches(requirements, evidence, candidates, judgements, "tr")
    assert matches[0].reasoning == f"Uygun görünüyor. {UNGROUNDED_NOTE['tr']}"
    assert matches[1].reasoning == NOT_ASSESSED_REASONING["tr"]

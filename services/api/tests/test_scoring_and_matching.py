# Unit tests for the deterministic parts of the AI pipeline: scoring, similarity, retrieval and grounding rules.

import pytest

from app.ai.matching import RetrievedCandidate, cosine_similarity, retrieve_candidates
from app.ai.pipeline import AnalysisPipeline, _Requirement
from app.ai.schemas import RequirementJudgement
from app.ai.scoring import compute_score, fit_level_for
from app.schemas.analysis import CandidateEvidence


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
    matches = AnalysisPipeline.build_matches(requirements, evidence, candidates, judgements)
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
        requirements, evidence, [[RetrievedCandidate("e1", 0.5)]], {}
    )
    assert matches[0].status == "missing"
    assert matches[0].evidence == []

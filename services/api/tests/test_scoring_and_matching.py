# Unit tests for the deterministic parts of the AI pipeline: scoring, similarity, retrieval and grounding rules.

from typing import get_args

import pytest

from app.ai.lexical import BM25Index, keyword_terms
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


def test_retrieve_candidates_returns_closest_by_meaning_first():
    [candidates] = retrieve_candidates(
        ["Requirement"],
        [[1.0, 0.0]],
        ["e1", "e2", "e3"],
        ["alpha", "beta", "gamma"],  # No shared words, so only the meaning ranking contributes.
        [[0.0, 1.0], [1.0, 0.0], [0.7, 0.7]],
        top_k_by_meaning=2,
    )
    assert [c.evidence_id for c in candidates] == ["e2", "e3"]
    assert candidates[0].similarity == pytest.approx(1.0)


def test_retrieve_candidates_adds_keyword_matches_the_embedding_ranked_low():
    # The Turkish evaluation case: the literal match ranked last by embeddings and never reached the judge.
    evidence_texts = [
        "Endüstri Mühendisliği 3. sınıf öğrencisi",
        "SQL, Python (pandas, matplotlib), Excel, temel istatistik",
        "Öğrenci Asistanı, Olasılık ve İstatistik dersi (2024)",
        "Kampanya Etkisi Analizi: Python ve pandas ile satış verisi",
        "Talep Tahmini: Excel'de basit bir regresyon modeli",
    ]
    evidence_vectors = [[0.64, 0.77], [0.8, 0.6], [0.78, 0.63], [0.75, 0.66], [0.73, 0.68]]
    [candidates] = retrieve_candidates(
        [
            "İstatistik, Endüstri Mühendisliği veya ilgili bir bölümde 3. ya da 4. sınıf öğrencisi olmak"
        ],
        [[1.0, 0.0]],
        ["e1", "e2", "e3", "e4", "e5"],
        evidence_texts,
        evidence_vectors,
    )
    ids = [c.evidence_id for c in candidates]
    assert ids[:3] == ["e2", "e3", "e4"]  # The meaning ranking keeps its order.
    assert ids[3] == "e1"  # Added because it shares the rare words.
    assert len(ids) == len(set(ids)) <= 5
    assert candidates[3].similarity == pytest.approx(0.64, abs=0.01)  # Its own cosine, still low.


def test_retrieve_candidates_adds_nothing_without_shared_words():
    [candidates] = retrieve_candidates(
        ["Kubernetes in production"],
        [[1.0, 0.0]],
        ["e1", "e2", "e3", "e4"],
        ["Built REST APIs", "Wrote unit tests", "Led lab sessions", "Designed SQL schemas"],
        [[0.9, 0.1], [0.8, 0.2], [0.7, 0.3], [0.1, 0.9]],
    )
    assert [c.evidence_id for c in candidates] == ["e1", "e2", "e3"]


def test_keyword_terms_fold_case_accents_and_suffixes():
    assert keyword_terms("Endüstri Mühendisliği 3. sınıf öğrencisi") == [
        "endus",
        "muhen",
        "sinif",
        "ogren",
    ]
    assert keyword_terms("Öğrenci") == ["ogren"]
    assert keyword_terms("İLETİŞİM ve the iletişim") == ["ileti", "ileti"]
    assert keyword_terms("Developer, development") == ["devel", "devel"]


def test_bm25_weighs_words_that_are_rare_in_the_resume():
    index = BM25Index(["python fastapi", "python django", "python flask", "kubernetes cluster"])
    common, rare = index.scores("python kubernetes")[0], index.scores("python kubernetes")[3]
    assert rare > common > 0
    assert index.scores("rust") == [0.0, 0.0, 0.0, 0.0]


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

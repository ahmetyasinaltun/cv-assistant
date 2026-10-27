# Hybrid retrieval: for each requirement, the evidence closest in meaning (embedding cosine similarity) plus the
# evidence sharing the most words with it (BM25), so a near-literal match is never lost to the embedding ranking.

import math
from dataclasses import dataclass

from app.ai.lexical import BM25Index

TOP_K_BY_MEANING = 3
# Keyword matches are added only when not already among the meaning matches, so at most 5 candidates.
TOP_K_BY_KEYWORDS = 2


@dataclass(frozen=True)
class RetrievedCandidate:
    evidence_id: str
    similarity: float  # Cosine similarity, reported for every candidate however it was found.


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        raise ValueError("Vectors must have the same dimensionality")
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def clamp_unit(value: float) -> float:
    """Cosine similarity can be slightly negative or exceed 1 by float error; results are reported in [0, 1]."""
    return min(1.0, max(0.0, value))


def retrieve_candidates(
    requirement_texts: list[str],
    requirement_vectors: list[list[float]],
    evidence_ids: list[str],
    evidence_texts: list[str],
    evidence_vectors: list[list[float]],
    *,
    top_k_by_meaning: int = TOP_K_BY_MEANING,
    top_k_by_keywords: int = TOP_K_BY_KEYWORDS,
) -> list[list[RetrievedCandidate]]:
    """For each requirement: the closest evidence by meaning (best first), then keyword matches not yet included."""
    if not len(evidence_ids) == len(evidence_texts) == len(evidence_vectors):
        raise ValueError("evidence_ids, evidence_texts and evidence_vectors must align")
    if len(requirement_texts) != len(requirement_vectors):
        raise ValueError("requirement_texts and requirement_vectors must align")
    keyword_index = BM25Index(evidence_texts)
    positions = range(len(evidence_ids))
    results: list[list[RetrievedCandidate]] = []
    for text, vector in zip(requirement_texts, requirement_vectors, strict=True):
        similarities = [
            round(clamp_unit(cosine_similarity(vector, evidence_vector)), 4)
            for evidence_vector in evidence_vectors
        ]
        # sorted() is stable, so ties keep the resume order and retrieval stays deterministic.
        by_meaning = sorted(positions, key=lambda i: similarities[i], reverse=True)[
            :top_k_by_meaning
        ]
        keyword_scores = keyword_index.scores(text)
        by_keywords = [
            i
            for i in sorted(positions, key=lambda i: keyword_scores[i], reverse=True)
            if keyword_scores[i] > 0 and i not in by_meaning
        ][:top_k_by_keywords]
        results.append(
            [RetrievedCandidate(evidence_ids[i], similarities[i]) for i in by_meaning + by_keywords]
        )
    return results

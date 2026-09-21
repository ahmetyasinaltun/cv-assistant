# Semantic retrieval: cosine similarity between requirement and evidence embeddings, top-k candidates per requirement.

import math
from dataclasses import dataclass

TOP_K_CANDIDATES = 3
MIN_CANDIDATE_SIMILARITY = 0.0  # Kept permissive; the judgement step decides relevance from text.


@dataclass(frozen=True)
class RetrievedCandidate:
    evidence_id: str
    similarity: float


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
    requirement_vectors: list[list[float]],
    evidence_ids: list[str],
    evidence_vectors: list[list[float]],
    *,
    top_k: int = TOP_K_CANDIDATES,
) -> list[list[RetrievedCandidate]]:
    """For each requirement, return the top-k most similar evidence items, best first."""
    if len(evidence_ids) != len(evidence_vectors):
        raise ValueError("evidence_ids and evidence_vectors must align")
    results: list[list[RetrievedCandidate]] = []
    for requirement_vector in requirement_vectors:
        scored = [
            RetrievedCandidate(
                evidence_id=evidence_id,
                similarity=round(clamp_unit(cosine_similarity(requirement_vector, vector)), 4),
            )
            for evidence_id, vector in zip(evidence_ids, evidence_vectors, strict=True)
        ]
        scored = [c for c in scored if c.similarity >= MIN_CANDIDATE_SIMILARITY]
        scored.sort(key=lambda c: c.similarity, reverse=True)
        results.append(scored[:top_k])
    return results

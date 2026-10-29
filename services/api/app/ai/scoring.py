# Deterministic, explainable match score derived from per-requirement statuses and importance weights.

from app.schemas.analysis import FitLevel, Importance, MatchStatus
from app.schemas.common import Language

IMPORTANCE_WEIGHTS: dict[Importance, int] = {"must_have": 2, "nice_to_have": 1}
STATUS_VALUES: dict[MatchStatus, float] = {"matched": 1.0, "partial": 0.5, "missing": 0.0}
STRONG_FIT_THRESHOLD = 75
MODERATE_FIT_THRESHOLD = 45

# The Turkish wording reuses the status and importance labels of the Turkish interface.
SCORE_EXPLANATIONS: dict[Language, str] = {
    "en": (
        "Each requirement counts as matched (1), partial (0.5) or missing (0); must-have requirements "
        "weigh twice as much as nice-to-have ones. The score is the weighted percentage."
    ),
    "tr": (
        "Her şart karşılandı (1), kısmen (0,5) ya da eksik (0) sayılır; zorunlu şartlar, tercih sebebi "
        "olanların iki katı ağırlık taşır. Puan bu ağırlıklı yüzdedir."
    ),
}


def compute_score(items: list[tuple[Importance, MatchStatus]]) -> int:
    """Weighted percentage of satisfied requirements, rounded to an integer in [0, 100]."""
    if not items:
        return 0
    total_weight = sum(IMPORTANCE_WEIGHTS[importance] for importance, _ in items)
    earned = sum(
        IMPORTANCE_WEIGHTS[importance] * STATUS_VALUES[status] for importance, status in items
    )
    return round(100 * earned / total_weight)


def fit_level_for(score: int) -> FitLevel:
    if score >= STRONG_FIT_THRESHOLD:
        return "strong"
    if score >= MODERATE_FIT_THRESHOLD:
        return "moderate"
    return "weak"

# Deterministic, explainable match score derived from per-requirement statuses and importance weights.

from app.schemas.analysis import FitLevel, Importance, MatchStatus

IMPORTANCE_WEIGHTS: dict[Importance, int] = {"must_have": 2, "nice_to_have": 1}
STATUS_VALUES: dict[MatchStatus, float] = {"matched": 1.0, "partial": 0.5, "missing": 0.0}
STRONG_FIT_THRESHOLD = 75
MODERATE_FIT_THRESHOLD = 45

SCORE_EXPLANATION = (
    "Each requirement counts as matched (1), partial (0.5) or missing (0); must-have requirements "
    "weigh twice as much as nice-to-have ones. The score is the weighted percentage."
)


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

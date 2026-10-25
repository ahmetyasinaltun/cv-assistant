# Runs the manually reviewed evaluation cases through the pipeline and reports practical quality metrics.
# Usage: python -m app.ai.eval.run_eval [--provider fake|gemini] [--json path]

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path

from app.ai.pipeline import AnalysisInput, AnalysisPipeline
from app.ai.providers.base import AIProvider
from app.ai.providers.fake import FakeProvider
from app.core.config import get_settings
from app.core.errors import AIProviderError
from app.schemas.analysis import AnalysisResult

CASES_DIR = Path(__file__).parent / "cases"


@dataclass
class CaseReport:
    name: str
    completed: bool
    error: str | None = None
    score: int | None = None
    fit_level: str | None = None
    requirement_count: int = 0
    keyword_recall: float = 0.0
    status_accuracy: float | None = None
    importance_accuracy: float | None = None
    grounded_rate: float | None = None
    score_within_bound: bool | None = None
    notes: list[str] = field(default_factory=list)


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def _find_requirement(result: AnalysisResult, keyword: str):
    keyword = keyword.lower()
    return next((r for r in result.requirements if keyword in r.text.lower()), None)


def evaluate_case(pipeline: AnalysisPipeline, case: dict) -> CaseReport:
    report = CaseReport(name=case["name"], completed=False)
    try:
        result = pipeline.run(
            AnalysisInput(
                job_title=case["job_title"],
                job_description=case["job_description"],
                resume=case["resume"],
            )
        )
    except AIProviderError as exc:
        report.error = exc.message
        return report
    report.completed = True
    report.score = result.overall.score
    report.fit_level = result.overall.fit_level
    report.requirement_count = len(result.requirements)

    keywords = case.get("expected_requirement_keywords", [])
    if keywords:
        found = [k for k in keywords if _find_requirement(result, k)]
        report.keyword_recall = len(found) / len(keywords)
        missing = sorted(set(keywords) - set(found))
        if missing:
            report.notes.append(f"requirements not extracted: {missing}")

    report.status_accuracy = _labelled_accuracy(
        result, case.get("expected_statuses", []), "status", report
    )
    report.importance_accuracy = _labelled_accuracy(
        result, case.get("expected_importance", []), "importance", report
    )

    resume_text = _normalize(case["resume"])
    cited = [(m, e) for m in result.requirements for e in m.evidence]
    if cited:
        grounded = sum(1 for _, e in cited if _normalize(e.quote)[:80] in resume_text)
        report.grounded_rate = grounded / len(cited)
        if grounded < len(cited):
            report.notes.append(
                f"{len(cited) - grounded} cited quote(s) not found verbatim in resume"
            )
    else:
        report.grounded_rate = None

    max_score = case.get("max_expected_score")
    if max_score is not None:
        report.score_within_bound = result.overall.score <= max_score
        if not report.score_within_bound:
            report.notes.append(f"score {result.overall.score} exceeds expected max {max_score}")
    return report


def _labelled_accuracy(
    result: AnalysisResult, expectations: list[dict], attribute: str, report: CaseReport
):
    if not expectations:
        return None
    correct = 0
    for expectation in expectations:
        match = _find_requirement(result, expectation["keyword"])
        expected = expectation[attribute]
        if match is None:
            report.notes.append(
                f"{attribute}: requirement for '{expectation['keyword']}' not found"
            )
            continue
        actual = getattr(match, attribute)
        # A borderline case may list several acceptable answers instead of forcing one.
        accepted = expected if isinstance(expected, list) else [expected]
        if actual in accepted:
            correct += 1
        else:
            report.notes.append(
                f"{attribute}: '{expectation['keyword']}' expected {expected}, got {actual}"
            )
    return correct / len(expectations)


def load_cases() -> list[dict]:
    return [json.loads(p.read_text(encoding="utf-8")) for p in sorted(CASES_DIR.glob("*.json"))]


def build_provider(provider_name: str) -> AIProvider:
    if provider_name == "fake":
        return FakeProvider()
    from app.ai.providers.gemini import GeminiProvider

    return GeminiProvider(get_settings())


def build_pipeline(provider_name: str) -> AnalysisPipeline:
    return AnalysisPipeline(build_provider(provider_name))


def _mean(values: list[float | None]) -> float | None:
    present = [v for v in values if v is not None]
    return round(sum(present) / len(present), 3) if present else None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Evaluate the analysis pipeline on fixed cases.")
    parser.add_argument(
        "--provider", choices=["fake", "gemini"], default=get_settings().ai_provider
    )
    parser.add_argument("--json", type=Path, help="Write the full report to this path.")
    args = parser.parse_args(argv)

    provider = build_provider(args.provider)
    reports = [evaluate_case(AnalysisPipeline(provider), case) for case in load_cases()]

    print(f"provider: {args.provider}\n")
    header = f"{'case':<28}{'ok':<4}{'score':<7}{'reqs':<6}{'kw':<7}{'status':<8}{'imp':<7}{'grounded':<9}"
    print(header)
    print("-" * len(header))
    for r in reports:
        print(
            f"{r.name:<28}{'yes' if r.completed else 'NO':<4}{str(r.score):<7}{r.requirement_count:<6}"
            f"{r.keyword_recall:<7.2f}{_fmt(r.status_accuracy):<8}{_fmt(r.importance_accuracy):<7}"
            f"{_fmt(r.grounded_rate):<9}"
        )
        for note in r.notes:
            print(f"    - {note}")
        if r.error:
            print(f"    ! {r.error}")

    summary = {
        "provider": args.provider,
        "structured_output_validity": _mean([1.0 if r.completed else 0.0 for r in reports]),
        "keyword_recall": _mean([r.keyword_recall for r in reports]),
        "status_accuracy": _mean([r.status_accuracy for r in reports]),
        "importance_accuracy": _mean([r.importance_accuracy for r in reports]),
        "grounded_rate": _mean([r.grounded_rate for r in reports]),
    }
    # With a fallback chain the answering model can change between steps; record which ones did.
    models_used = getattr(provider, "models_used", None)
    if models_used is not None:
        summary["models_used"] = models_used()
    print("\nsummary:", json.dumps(summary))
    if args.json:
        args.json.write_text(
            json.dumps({"summary": summary, "cases": [asdict(r) for r in reports]}, indent=2),
            encoding="utf-8",
        )
    return 0 if all(r.completed for r in reports) else 1


def _fmt(value: float | None) -> str:
    return "-" if value is None else f"{value:.2f}"


if __name__ == "__main__":
    sys.exit(main())

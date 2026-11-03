# Evaluates CV tailoring on the fixed evaluation cases: each CV is structured, analysed and tailored in both modes
# (and the Turkish CVs also into English), then measured. Generated text is not deterministic, so the numbers are a
# repeatable check, not a guarantee.
# Usage: python -m app.ai.eval.run_tailor_eval [--provider fake|gemini] [--cases name ...] [--json path]

import argparse
import json
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path

from app.ai.eval.run_eval import build_provider, load_cases
from app.ai.language_guess import guess_language
from app.ai.pipeline import AnalysisInput, AnalysisPipeline
from app.ai.providers.base import AIProvider
from app.cv.content import CvContent, CvLine
from app.cv.render import CvRenderer
from app.cv.source_check import comparable
from app.cv.structuring import CvStructurer
from app.cv.tailoring import CvTailorer, TailoringMode, TailoringRequest
from app.schemas.common import Language

ADDED_ORIGINS = {"ai_added", "ai_embellished"}


@dataclass
class TailorReport:
    case: str
    mode: TailoringMode
    target_language: Language
    valid: bool = False
    error: str | None = None
    # Organizations, schools, dates, project and certificate names not in the source CV, plus raised titles.
    invented_entities: int | None = None
    added_share: float | None = None
    keywords_before: float | None = None
    keywords_after: float | None = None
    language_match: float | None = None
    pages: int | None = None
    notes: list[str] = field(default_factory=list)


def _lines(content: CvContent) -> list[CvLine]:
    return [
        *content.summary,
        *(line for job in content.experience for line in job.bullets),
        *(line for school in content.education for line in school.details),
        *(line for project in content.projects for line in project.bullets),
        *(item for group in content.skills for item in group.items),
    ]


def _text(content: CvContent) -> str:
    parts = [content.headline or "", *(line.text for line in _lines(content))]
    parts += [f"{job.role} {job.organization}" for job in content.experience]
    parts += [f"{school.degree} {school.school}" for school in content.education]
    parts += [project.name for project in content.projects]
    return comparable(" ".join(parts))


def invented_entities(base: CvContent, tailored: CvContent, same_language: bool) -> list[str]:
    """Entities the tailored CV has that the source does not; titles count only within one language."""

    def entities(content: CvContent, with_titles: bool) -> set[str]:
        found = {f"org:{job.organization}" for job in content.experience}
        found |= {
            f"date:{value}" for job in content.experience for value in (job.start, job.end) if value
        }
        found |= {f"school:{school.school}" for school in content.education}
        found |= {
            f"date:{v}" for school in content.education for v in (school.start, school.end) if v
        }
        found |= {f"project:{project.name}" for project in content.projects}
        found |= {f"certificate:{c.name}" for c in content.certificates}
        if with_titles:
            found |= {f"role:{job.role}" for job in content.experience}
            found |= {f"degree:{school.degree}" for school in content.education}
        return found

    return sorted(entities(tailored, same_language) - entities(base, same_language))


def _keyword_share(text: str, keywords: list[str]) -> float | None:
    if not keywords:
        return None
    return round(sum(comparable(keyword) in text for keyword in keywords) / len(keywords), 3)


def evaluate(
    provider: AIProvider,
    case: dict,
    base: CvContent,
    base_language: Language,
    mode: TailoringMode,
    target: Language,
    requirements: list,
) -> TailorReport:
    report = TailorReport(case=case["name"], mode=mode, target_language=target)
    try:
        result = CvTailorer(provider.llm).tailor(
            TailoringRequest(
                base=base,
                base_language=base_language,
                target_language=target,
                job_title=case["job_title"],
                company=None,
                posting=case["job_description"],
                requirements=requirements,
                mode=mode,
            )
        )
    except Exception as exc:  # noqa: BLE001 - a failed case is reported, not raised
        report.error = f"{type(exc).__name__}: {exc}"[:300]
        return report
    tailored = result.content
    same_language = base_language == target
    report.valid = True
    invented = invented_entities(base, tailored, same_language)
    report.invented_entities = len(invented)
    report.notes += [f"invented {entity}" for entity in invented]
    lines = _lines(tailored)
    report.added_share = (
        round(sum(line.origin in ADDED_ORIGINS for line in lines) / len(lines), 3) if lines else 0.0
    )
    if same_language:
        keywords = case.get("expected_requirement_keywords", [])
        report.keywords_before = _keyword_share(_text(base), keywords)
        report.keywords_after = _keyword_share(_text(tailored), keywords)
    written = [line.text for line in lines if line.origin != "cv" and len(line.text.split()) >= 4]
    guesses = [g for g in map(guess_language, written) if g is not None]
    report.language_match = (
        round(sum(g == target for g in guesses) / len(guesses), 3) if guesses else None
    )
    report.pages = CvRenderer().render(tailored, "classic", target).page_count
    if mode == "strict" and report.added_share:
        report.notes.append("strict mode kept an added line")
    return report


def run(provider: AIProvider, cases: list[dict]) -> list[TailorReport]:
    reports = []
    for case in cases:
        case_language: Language = case.get("output_language", "en")
        base_language = guess_language(case["resume"]) or case_language
        try:
            structured = CvStructurer(provider.llm).structure(case["resume"], "Candidate")
            analysis = AnalysisPipeline(provider).run(
                AnalysisInput(
                    job_title=case["job_title"],
                    job_description=case["job_description"],
                    resume=case["resume"],
                    output_language=case_language,
                )
            )
        except Exception as exc:  # noqa: BLE001 - a case whose setup failed is reported, not raised
            failed = TailorReport(case=case["name"], mode="flexible", target_language=base_language)
            failed.error = f"setup failed: {type(exc).__name__}: {exc}"[:300]
            reports.append(failed)
            continue
        runs: list[tuple[TailoringMode, Language]] = [
            ("flexible", base_language),
            ("strict", base_language),
        ]
        if base_language == "tr":
            runs.append(
                ("flexible", "en")
            )  # the translation case: a Turkish CV for an English posting
        for mode, target in runs:
            reports.append(
                evaluate(
                    provider,
                    case,
                    structured.content,
                    base_language,
                    mode,
                    target,
                    analysis.requirements,
                )
            )
    return reports


def _mean(values: list) -> float | None:
    present = [v for v in values if v is not None]
    return round(sum(present) / len(present), 3) if present else None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Evaluate CV tailoring on fixed cases.")
    parser.add_argument("--provider", choices=["fake", "gemini"], default="fake")
    parser.add_argument("--cases", nargs="*", help="Case names to run (default: all).")
    parser.add_argument("--json", type=Path, help="Write the full report to this path.")
    args = parser.parse_args(argv)

    cases = [c for c in load_cases() if not args.cases or c["name"] in args.cases]
    reports = run(build_provider(args.provider), cases)

    print(f"{'case':38} {'mode':9} lang valid invented added  kw-before kw-after lang-match pages")
    for r in reports:
        print(
            f"{r.case[:38]:38} {r.mode:9} {r.target_language:4} {int(r.valid):5} "
            f"{_fmt(r.invented_entities):8} {_fmt(r.added_share):6} {_fmt(r.keywords_before):9} "
            f"{_fmt(r.keywords_after):8} {_fmt(r.language_match):10} {_fmt(r.pages)}"
        )
        for note in [*r.notes, *([r.error] if r.error else [])]:
            print(f"    - {note}")
    strict = [r for r in reports if r.mode == "strict"]
    summary = {
        "validity": _mean([float(r.valid) for r in reports]),
        "invented_entities_total": sum(r.invented_entities or 0 for r in reports),
        "added_share_flexible": _mean([r.added_share for r in reports if r.mode == "flexible"]),
        "added_share_strict": _mean([r.added_share for r in strict]),
        "keywords_before": _mean([r.keywords_before for r in reports]),
        "keywords_after": _mean([r.keywords_after for r in reports]),
        "language_match": _mean([r.language_match for r in reports]),
        "one_page_rate": _mean([float(r.pages == 1) for r in reports if r.pages is not None]),
    }
    print(json.dumps(summary, indent=2))
    if args.json:
        args.json.write_text(
            json.dumps(
                {"summary": summary, "runs": [asdict(r) for r in reports]},
                indent=2,
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
    return 0 if summary["invented_entities_total"] == 0 and not summary["added_share_strict"] else 1


def _fmt(value: object) -> str:
    return "-" if value is None else str(value)


if __name__ == "__main__":
    sys.exit(main())

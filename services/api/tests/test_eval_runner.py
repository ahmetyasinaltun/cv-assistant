# Smoke test that the evaluation cases load and the runner completes with the fake provider.

from app.ai.eval.run_eval import build_pipeline, evaluate_case, load_cases


def test_eval_cases_run_with_fake_provider():
    cases = load_cases()
    assert len(cases) >= 3
    pipeline = build_pipeline("fake")
    for case in cases:
        report = evaluate_case(pipeline, case)
        assert report.completed, report.error
        assert report.keyword_recall == 1.0, report.notes
        assert report.grounded_rate in (None, 1.0)

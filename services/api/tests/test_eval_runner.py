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


def test_labels_may_accept_several_answers_for_borderline_cases():
    from app.ai.eval.run_eval import CaseReport, _labelled_accuracy
    from app.schemas.analysis import AnalysisResult

    result = AnalysisResult.model_validate(
        {
            "overall": {
                "score": 50,
                "fit_level": "moderate",
                "summary": "",
                "score_explanation": "",
                "limitations": [],
            },
            "requirements": [
                {
                    "id": "r1",
                    "text": "1+ years of Python",
                    "category": "technical_skill",
                    "importance": "must_have",
                    "status": "partial",
                    "reasoning": "",
                    "evidence": [],
                }
            ],
            "candidate_evidence": [],
            "suggestions": [],
        }
    )
    report = CaseReport(name="t", completed=True)
    strict = [{"keyword": "python", "status": "matched"}]
    flexible = [{"keyword": "python", "status": ["matched", "partial"]}]
    assert _labelled_accuracy(result, strict, "status", report) == 0.0
    assert _labelled_accuracy(result, flexible, "status", report) == 1.0


def test_guess_language_tells_english_from_turkish():
    from app.ai.language_guess import guess_language

    assert guess_language("Add a Docker example to the Projects section of your CV.") == "en"
    assert guess_language("CV’nde Docker ile ilgili bir proje örneği ekle.") == "tr"
    assert guess_language("İstatistik bilgin var ama A/B testi deneyimin yok.") == "tr"
    assert guess_language("Docker, Kubernetes") is None


def test_language_match_rate_counts_texts_in_the_wrong_language():
    from app.ai.eval.run_eval import CaseReport, _language_match_rate
    from app.schemas.analysis import AnalysisResult

    result = AnalysisResult.model_validate(
        {
            "overall": {
                "score": 50,
                "fit_level": "moderate",
                "summary": "CV’n SQL ve Python şartlarını karşılıyor, ama Power BI deneyimi yok.",
                "score_explanation": "",
                "limitations": ["The analysis cannot know how deep your SQL experience is."],
            },
            "requirements": [],
            "candidate_evidence": [],
            "suggestions": [],
        }
    )
    report = CaseReport(name="t", completed=True)
    assert _language_match_rate(result, "tr", report) == 0.5
    assert report.notes == ["1 generated text(s) not in 'tr'"]

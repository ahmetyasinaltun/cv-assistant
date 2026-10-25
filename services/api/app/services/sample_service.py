# Provides the fictional sample CV and job posting, taken from an evaluation case so the sample tells one story.

import json
from functools import lru_cache
from pathlib import Path

from app.schemas.sample import SampleAnalysisInput, SampleJobDescription, SampleResume

# The web client's pre-computed sample result was built from this case, so a live run of the
# sample input matches what reviewers already saw.
SAMPLE_CASE_PATH = (
    Path(__file__).parents[1] / "ai" / "eval" / "cases" / "backend_intern_good_fit.json"
)
SAMPLE_RESUME_TITLE = "Jane Doe — sample CV"


@lru_cache
def get_sample_analysis_input() -> SampleAnalysisInput:
    case = json.loads(SAMPLE_CASE_PATH.read_text(encoding="utf-8"))
    return SampleAnalysisInput(
        resume=SampleResume(title=SAMPLE_RESUME_TITLE, text=case["resume"]),
        job_description=SampleJobDescription(
            title=case["job_title"], company=None, text=case["job_description"]
        ),
    )

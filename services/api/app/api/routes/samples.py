# HTTP route for the fictional sample input; public because it holds no user data.

from fastapi import APIRouter

from app.schemas.sample import SampleAnalysisInput
from app.services.sample_service import get_sample_analysis_input

router = APIRouter(prefix="/samples", tags=["samples"])


@router.get("/analysis-input", response_model=SampleAnalysisInput)
def read_sample_analysis_input() -> SampleAnalysisInput:
    return get_sample_analysis_input()

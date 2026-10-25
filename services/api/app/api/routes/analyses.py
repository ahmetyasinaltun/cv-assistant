# HTTP routes for creating analyses (run in the background), polling results and generating interview questions.

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import sessionmaker

from app.ai.providers import get_ai_provider
from app.ai.providers.base import AIProvider
from app.api.deps import CurrentUser, DbSession
from app.db.session import get_session_factory
from app.schemas.analysis import (
    AnalysisCreateRequest,
    AnalysisDetailResponse,
    AnalysisSummaryResponse,
    InterviewQuestion,
)
from app.services.analysis_service import (
    AnalysisService,
    run_analysis_in_background,
    to_detail_response,
    to_summary_response,
)

router = APIRouter(prefix="/analyses", tags=["analyses"])

Provider = Annotated[AIProvider, Depends(get_ai_provider)]
SessionFactory = Annotated[sessionmaker, Depends(get_session_factory)]


@router.post("", response_model=AnalysisSummaryResponse, status_code=status.HTTP_202_ACCEPTED)
def create_analysis(
    payload: AnalysisCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
    provider: Provider,
    session_factory: SessionFactory,
    background_tasks: BackgroundTasks,
) -> AnalysisSummaryResponse:
    analysis = AnalysisService(db, provider).create(
        current_user.id, payload.resume_id, payload.job_description_id
    )
    background_tasks.add_task(run_analysis_in_background, analysis.id, session_factory, provider)
    return to_summary_response(analysis)


@router.get("", response_model=list[AnalysisSummaryResponse])
def list_analyses(
    current_user: CurrentUser, db: DbSession, provider: Provider
) -> list[AnalysisSummaryResponse]:
    return [
        to_summary_response(a) for a in AnalysisService(db, provider).list_for_user(current_user.id)
    ]


@router.get("/{analysis_id}", response_model=AnalysisDetailResponse)
def get_analysis(
    analysis_id: UUID, current_user: CurrentUser, db: DbSession, provider: Provider
) -> AnalysisDetailResponse:
    return to_detail_response(AnalysisService(db, provider).get(analysis_id, current_user.id))


@router.post("/{analysis_id}/interview-questions", response_model=list[InterviewQuestion])
def generate_interview_questions(
    analysis_id: UUID, current_user: CurrentUser, db: DbSession, provider: Provider
) -> list[InterviewQuestion]:
    return AnalysisService(db, provider).generate_interview_questions(analysis_id, current_user.id)

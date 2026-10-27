# Analysis use cases: create and run an analysis in the background, read results, generate interview questions.

import logging
from collections.abc import Callable
from uuid import UUID

from sqlalchemy.orm import Session

from app.ai.pipeline import AnalysisInput, AnalysisPipeline
from app.ai.providers.base import AIProvider
from app.core.errors import AppError, NotFoundError, ValidationFailedError
from app.db.base import utc_now
from app.models.analysis import Analysis, AnalysisStatus
from app.models.user import User
from app.repositories.analysis_repository import AnalysisRepository
from app.schemas.analysis import (
    AnalysisDetailResponse,
    AnalysisResult,
    AnalysisSummaryResponse,
    InterviewQuestion,
)
from app.schemas.common import Language
from app.services.document_service import JobDescriptionService, ResumeService

logger = logging.getLogger(__name__)

UNEXPECTED_FAILURE_CODE = "analysis_failed_unexpectedly"


class AnalysisService:
    def __init__(self, db: Session, provider: AIProvider):
        self.db = db
        self.analyses = AnalysisRepository(db)
        self.pipeline = AnalysisPipeline(provider)

    def create(
        self,
        user: User,
        resume_id: UUID,
        job_description_id: UUID,
        output_language: Language | None,
    ) -> Analysis:
        """Validate ownership and persist a pending analysis; the pipeline runs separately via `run`.

        Without an explicit language the account's preferred language is used, so a client that does
        not send one still gets text in the language the user chose.
        """
        ResumeService(self.db).get(resume_id, user.id)
        JobDescriptionService(self.db).get(job_description_id, user.id)
        analysis = Analysis(
            user_id=user.id,
            resume_id=resume_id,
            job_description_id=job_description_id,
            status=AnalysisStatus.PENDING,
            output_language=output_language or user.preferred_language,
        )
        return self.analyses.add(analysis)

    def run(self, analysis_id: UUID) -> None:
        """Execute the pipeline for a pending analysis and persist either the result or the failure."""
        analysis = self.analyses.get_with_documents(analysis_id)
        if analysis is None:
            logger.error("Analysis %s vanished before it could run", analysis_id)
            return
        analysis.status = AnalysisStatus.RUNNING
        self.analyses.save(analysis)
        try:
            result = self.pipeline.run(
                AnalysisInput(
                    job_title=analysis.job_description.title,
                    job_description=analysis.job_description.raw_text,
                    resume=analysis.resume.raw_text,
                    output_language=analysis.output_language,
                )
            )
        except AppError as exc:
            self._mark_failed(analysis, exc.code, exc.message)
            return
        except Exception:
            logger.exception("Unexpected failure while running analysis %s", analysis_id)
            self._mark_failed(
                analysis,
                UNEXPECTED_FAILURE_CODE,
                "The analysis failed unexpectedly. Please try again.",
            )
            return
        analysis.result = result.model_dump(mode="json")
        analysis.status = AnalysisStatus.COMPLETED
        analysis.completed_at = utc_now()
        analysis.error_code = None
        analysis.error_message = None
        self.analyses.save(analysis)

    def get(self, analysis_id: UUID, user_id: UUID) -> Analysis:
        analysis = self.analyses.get_for_user(analysis_id, user_id)
        if analysis is None:
            raise NotFoundError("Analysis not found.", code="analysis_not_found")
        return analysis

    def list_for_user(self, user_id: UUID) -> list[Analysis]:
        return self.analyses.list_for_user(user_id)

    def generate_interview_questions(
        self, analysis_id: UUID, user_id: UUID
    ) -> list[InterviewQuestion]:
        analysis = self.get(analysis_id, user_id)
        if analysis.status != AnalysisStatus.COMPLETED or analysis.result is None:
            raise ValidationFailedError(
                "Interview questions can only be generated for a completed analysis.",
                code="analysis_not_completed",
            )
        result = AnalysisResult.model_validate(analysis.result)
        # Questions use the analysis's own language, so one result page never mixes two languages.
        questions = self.pipeline.generate_interview_questions(
            analysis.job_description.title, result, analysis.output_language
        )
        analysis.interview_questions = [q.model_dump(mode="json") for q in questions]
        self.analyses.save(analysis)
        return questions

    def _mark_failed(self, analysis: Analysis, code: str, message: str) -> None:
        analysis.status = AnalysisStatus.FAILED
        analysis.error_code = code
        analysis.error_message = message
        analysis.completed_at = utc_now()
        self.analyses.save(analysis)


def run_analysis_in_background(
    analysis_id: UUID, session_factory: Callable[[], Session], provider: AIProvider
) -> None:
    """Entry point for FastAPI BackgroundTasks: owns its own session so the request session can close."""
    db = session_factory()
    try:
        AnalysisService(db, provider).run(analysis_id)
    finally:
        db.close()


def to_summary_response(analysis: Analysis) -> AnalysisSummaryResponse:
    overall = (analysis.result or {}).get("overall") or {}
    return AnalysisSummaryResponse(
        id=analysis.id,
        status=analysis.status,
        output_language=analysis.output_language,
        resume_id=analysis.resume_id,
        job_description_id=analysis.job_description_id,
        resume_title=analysis.resume.title,
        job_title=analysis.job_description.title,
        company=analysis.job_description.company,
        score=overall.get("score"),
        fit_level=overall.get("fit_level"),
        created_at=analysis.created_at,
        completed_at=analysis.completed_at,
    )


def to_detail_response(analysis: Analysis) -> AnalysisDetailResponse:
    return AnalysisDetailResponse(
        **to_summary_response(analysis).model_dump(),
        result=analysis.result,
        interview_questions=analysis.interview_questions,
        error_code=analysis.error_code,
        error_message=analysis.error_message,
    )

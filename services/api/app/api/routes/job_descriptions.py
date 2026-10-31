# HTTP routes for creating, listing, reading and deleting job descriptions, and drafting one from a link.

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import CurrentUser, DbSession
from app.models.job_description import JobDescription
from app.schemas.job_description import (
    JobDescriptionCreateRequest,
    JobDescriptionDetailResponse,
    JobDescriptionDraftResponse,
    JobDescriptionImportRequest,
    JobDescriptionResponse,
)
from app.services.document_service import JobDescriptionService
from app.services.posting_import.service import PostingImportService

router = APIRouter(prefix="/job-descriptions", tags=["job-descriptions"])


def _to_response(job: JobDescription) -> JobDescriptionResponse:
    return JobDescriptionResponse(
        id=job.id,
        title=job.title,
        company=job.company,
        character_count=len(job.raw_text),
        created_at=job.created_at,
    )


def _to_detail(job: JobDescription) -> JobDescriptionDetailResponse:
    return JobDescriptionDetailResponse(**_to_response(job).model_dump(), raw_text=job.raw_text)


@router.post("", response_model=JobDescriptionDetailResponse, status_code=status.HTTP_201_CREATED)
def create_job_description(
    payload: JobDescriptionCreateRequest, current_user: CurrentUser, db: DbSession
) -> JobDescriptionDetailResponse:
    job = JobDescriptionService(db).create(
        current_user.id, payload.title, payload.company, payload.text
    )
    return _to_detail(job)


def get_posting_import_service() -> PostingImportService:
    return PostingImportService()


@router.post("/import", response_model=JobDescriptionDraftResponse)
def import_job_description(
    payload: JobDescriptionImportRequest,
    _: CurrentUser,
    importer: Annotated[PostingImportService, Depends(get_posting_import_service)],
) -> JobDescriptionDraftResponse:
    """Reads the posting behind a link so the client can fill its form; nothing is saved. Signed-in users only,
    so the endpoint is not an open proxy."""
    draft = importer.draft_from_link(payload.url)
    return JobDescriptionDraftResponse(
        title=draft.title, company=draft.company, text=draft.text, source_url=draft.source_url
    )


@router.get("", response_model=list[JobDescriptionResponse])
def list_job_descriptions(current_user: CurrentUser, db: DbSession) -> list[JobDescriptionResponse]:
    return [_to_response(j) for j in JobDescriptionService(db).list_for_user(current_user.id)]


@router.get("/{job_id}", response_model=JobDescriptionDetailResponse)
def get_job_description(
    job_id: UUID, current_user: CurrentUser, db: DbSession
) -> JobDescriptionDetailResponse:
    return _to_detail(JobDescriptionService(db).get(job_id, current_user.id))


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_description(job_id: UUID, current_user: CurrentUser, db: DbSession) -> None:
    JobDescriptionService(db).delete(job_id, current_user.id)

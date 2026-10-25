# HTTP routes for creating, listing, reading and deleting job descriptions.

from uuid import UUID

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.models.job_description import JobDescription
from app.schemas.job_description import (
    JobDescriptionCreateRequest,
    JobDescriptionDetailResponse,
    JobDescriptionResponse,
)
from app.services.document_service import JobDescriptionService

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

# HTTP routes for creating (text, or a PDF or Word upload), listing, reading and deleting resumes.

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, File, Form, UploadFile, status

from app.api.deps import CurrentUser, DbSession
from app.core.config import get_settings
from app.models.resume import Resume
from app.schemas.resume import ResumeCreateTextRequest, ResumeDetailResponse, ResumeResponse
from app.services.document_service import ResumeService

router = APIRouter(prefix="/resumes", tags=["resumes"])


def _to_response(resume: Resume) -> ResumeResponse:
    return ResumeResponse(
        id=resume.id,
        title=resume.title,
        source_type=resume.source_type,
        original_filename=resume.original_filename,
        character_count=len(resume.raw_text),
        created_at=resume.created_at,
    )


def _to_detail(resume: Resume) -> ResumeDetailResponse:
    return ResumeDetailResponse(**_to_response(resume).model_dump(), raw_text=resume.raw_text)


@router.post("", response_model=ResumeDetailResponse, status_code=status.HTTP_201_CREATED)
def create_resume_from_text(
    payload: ResumeCreateTextRequest, current_user: CurrentUser, db: DbSession
) -> ResumeDetailResponse:
    resume = ResumeService(db).create_from_text(current_user.id, payload.title, payload.text)
    return _to_detail(resume)


@router.post("/upload", response_model=ResumeDetailResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume_file(
    current_user: CurrentUser,
    db: DbSession,
    file: Annotated[UploadFile, File()],
    title: Annotated[str, Form(min_length=1, max_length=150)],
) -> ResumeDetailResponse:
    # One byte past the limit is enough to know the file is too large; the rest is never held in memory.
    file_bytes = await file.read(get_settings().max_upload_size_bytes + 1)
    resume = ResumeService(db).create_from_upload(
        current_user.id, title, file.filename or "resume", file_bytes
    )
    return _to_detail(resume)


@router.get("", response_model=list[ResumeResponse])
def list_resumes(current_user: CurrentUser, db: DbSession) -> list[ResumeResponse]:
    return [_to_response(r) for r in ResumeService(db).list_for_user(current_user.id)]


@router.get("/{resume_id}", response_model=ResumeDetailResponse)
def get_resume(resume_id: UUID, current_user: CurrentUser, db: DbSession) -> ResumeDetailResponse:
    return _to_detail(ResumeService(db).get(resume_id, current_user.id))


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(resume_id: UUID, current_user: CurrentUser, db: DbSession) -> None:
    ResumeService(db).delete(resume_id, current_user.id)

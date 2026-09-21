# Use cases for creating, listing and deleting resumes and job descriptions owned by a user.

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import NotFoundError, ValidationFailedError
from app.models.job_description import JobDescription
from app.models.resume import Resume
from app.repositories.document_repository import JobDescriptionRepository, ResumeRepository
from app.services.pdf_extraction import extract_text_from_pdf
from app.services.text_normalization import normalize_document_text

MIN_DOCUMENT_CHARS = 50


def normalize_or_reject(text: str) -> str:
    normalized = normalize_document_text(text, max_chars=get_settings().max_document_chars)
    if len(normalized) < MIN_DOCUMENT_CHARS:
        raise ValidationFailedError(
            "The document text is too short to analyze.", code="document_too_short"
        )
    return normalized


class ResumeService:
    def __init__(self, db: Session):
        self.resumes = ResumeRepository(db)
        self.settings = get_settings()

    def create_from_text(self, user_id: UUID, title: str, text: str) -> Resume:
        return self.resumes.add(
            Resume(
                user_id=user_id,
                title=title.strip(),
                source_type="text",
                raw_text=normalize_or_reject(text),
            )
        )

    def create_from_pdf(
        self, user_id: UUID, title: str, filename: str, file_bytes: bytes
    ) -> Resume:
        if len(file_bytes) > self.settings.max_upload_size_bytes:
            raise ValidationFailedError("The uploaded file is too large.", code="file_too_large")
        if not file_bytes.startswith(b"%PDF"):
            raise ValidationFailedError(
                "Only PDF uploads are supported.", code="unsupported_file_type"
            )
        return self.resumes.add(
            Resume(
                user_id=user_id,
                title=title.strip(),
                source_type="pdf",
                original_filename=filename[:255],
                raw_text=normalize_or_reject(extract_text_from_pdf(file_bytes)),
            )
        )

    def list(self, user_id: UUID) -> list[Resume]:
        return self.resumes.list_for_user(user_id)

    def get(self, resume_id: UUID, user_id: UUID) -> Resume:
        resume = self.resumes.get_for_user(resume_id, user_id)
        if resume is None:
            raise NotFoundError("Resume not found.", code="resume_not_found")
        return resume

    def delete(self, resume_id: UUID, user_id: UUID) -> None:
        self.resumes.delete(self.get(resume_id, user_id))


class JobDescriptionService:
    def __init__(self, db: Session):
        self.jobs = JobDescriptionRepository(db)

    def create(self, user_id: UUID, title: str, company: str | None, text: str) -> JobDescription:
        return self.jobs.add(
            JobDescription(
                user_id=user_id,
                title=title.strip(),
                company=company.strip() if company else None,
                raw_text=normalize_or_reject(text),
            )
        )

    def list(self, user_id: UUID) -> list[JobDescription]:
        return self.jobs.list_for_user(user_id)

    def get(self, job_id: UUID, user_id: UUID) -> JobDescription:
        job = self.jobs.get_for_user(job_id, user_id)
        if job is None:
            raise NotFoundError("Job description not found.", code="job_description_not_found")
        return job

    def delete(self, job_id: UUID, user_id: UUID) -> None:
        self.jobs.delete(self.get(job_id, user_id))

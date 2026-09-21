# Database access for user-owned documents (resumes and job descriptions), always scoped by owner.

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.job_description import JobDescription
from app.models.resume import Resume


class ResumeRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, resume: Resume) -> Resume:
        self.db.add(resume)
        self.db.commit()
        self.db.refresh(resume)
        return resume

    def list_for_user(self, user_id: UUID) -> list[Resume]:
        stmt = select(Resume).where(Resume.user_id == user_id).order_by(Resume.created_at.desc())
        return list(self.db.scalars(stmt))

    def get_for_user(self, resume_id: UUID, user_id: UUID) -> Resume | None:
        stmt = select(Resume).where(Resume.id == resume_id, Resume.user_id == user_id)
        return self.db.scalar(stmt)

    def delete(self, resume: Resume) -> None:
        self.db.delete(resume)
        self.db.commit()


class JobDescriptionRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, job: JobDescription) -> JobDescription:
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def list_for_user(self, user_id: UUID) -> list[JobDescription]:
        stmt = (
            select(JobDescription)
            .where(JobDescription.user_id == user_id)
            .order_by(JobDescription.created_at.desc())
        )
        return list(self.db.scalars(stmt))

    def get_for_user(self, job_id: UUID, user_id: UUID) -> JobDescription | None:
        stmt = select(JobDescription).where(
            JobDescription.id == job_id, JobDescription.user_id == user_id
        )
        return self.db.scalar(stmt)

    def delete(self, job: JobDescription) -> None:
        self.db.delete(job)
        self.db.commit()

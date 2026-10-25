# ORM model for one resume-vs-job analysis run, including its validated structured result.

import enum
import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AnalysisStatus(enum.StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Analysis(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "analyses"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    resume_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False
    )
    job_description_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("job_descriptions.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[AnalysisStatus] = mapped_column(
        Enum(
            AnalysisStatus, name="analysis_status", values_callable=lambda e: [m.value for m in e]
        ),
        default=AnalysisStatus.PENDING,
        nullable=False,
    )
    # Structured pipeline output (requirements, matches, suggestions). Shape: schemas.analysis.AnalysisResult
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # Generated on demand after the analysis completes. Shape: list[schemas.analysis.InterviewQuestion]
    interview_questions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # Stable machine-readable reason (e.g. "ai_quota_exhausted") that clients map to localized text.
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    owner = relationship("User", back_populates="analyses")
    resume = relationship("Resume")
    job_description = relationship("JobDescription")

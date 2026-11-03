# ORM model for an editable CV document: structured CV content plus the language and template it prints with.

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, utc_now


class CvDocument(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "cv_documents"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # "maker" (written in the CV Maker, from scratch or from a saved CV) or "tailored" (written for an analysis).
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    # The saved CV it was built from. The document is the user's own copy, so it outlives that CV.
    resume_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True
    )
    # The analysis a tailored CV was written for; the CV outlives it too.
    analysis_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("analyses.id", ondelete="SET NULL"), nullable=True
    )
    # "flexible" or "strict" for a tailored CV, null for a CV Maker document.
    tailoring_mode: Mapped[str | None] = mapped_column(String(16), nullable=True)
    # Strict mode's yes/no questions and their answers. Shape: list[app.schemas.cv.TailoringQuestion]
    questions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    # Language of the CV text (schemas.common.Language): sets section titles and date words in the PDF.
    language: Mapped[str] = mapped_column(String(8), nullable=False)
    template: Mapped[str] = mapped_column(String(32), nullable=False)
    # Shape: app.cv.content.CvContent. JSON, like analyses.result, because nothing queries inside it.
    content: Mapped[dict] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

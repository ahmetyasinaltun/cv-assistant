# ORM model for registered users; owns resumes, job descriptions and analyses.

from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    # Language code (schemas.common.Language) kept on the account so every client opens in the same
    # language; also the default language of AI-written text when a client does not send one.
    preferred_language: Mapped[str] = mapped_column(String(8), nullable=False, server_default="en")
    # Set once the user enters the code sent to their address; AI actions stay locked until then.
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # The current code is kept only as a keyed hash, with its expiry and the wrong guesses made against it.
    verification_code_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    verification_code_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    verification_attempts: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )

    resumes = relationship("Resume", back_populates="owner", cascade="all, delete-orphan")
    job_descriptions = relationship(
        "JobDescription", back_populates="owner", cascade="all, delete-orphan"
    )
    analyses = relationship("Analysis", back_populates="owner", cascade="all, delete-orphan")

    @property
    def email_verified(self) -> bool:
        return self.email_verified_at is not None

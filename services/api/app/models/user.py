# ORM model for registered users; owns resumes, job descriptions and analyses.

from sqlalchemy import String
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

    resumes = relationship("Resume", back_populates="owner", cascade="all, delete-orphan")
    job_descriptions = relationship(
        "JobDescription", back_populates="owner", cascade="all, delete-orphan"
    )
    analyses = relationship("Analysis", back_populates="owner", cascade="all, delete-orphan")

# Request/response schemas for creating and listing resumes.

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class ResumeCreateTextRequest(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    text: str = Field(min_length=50, description="Plain resume text; whitespace is normalized.")


class ResumeResponse(ORMModel):
    id: UUID
    title: str
    source_type: str
    original_filename: str | None
    character_count: int
    created_at: datetime


class ResumeDetailResponse(ResumeResponse):
    raw_text: str

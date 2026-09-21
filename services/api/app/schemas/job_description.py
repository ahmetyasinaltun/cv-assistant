# Request/response schemas for creating and listing job descriptions.

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class JobDescriptionCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    company: str | None = Field(default=None, max_length=150)
    text: str = Field(
        min_length=50, description="Plain job posting text; whitespace is normalized."
    )


class JobDescriptionResponse(ORMModel):
    id: UUID
    title: str
    company: str | None
    character_count: int
    created_at: datetime


class JobDescriptionDetailResponse(JobDescriptionResponse):
    raw_text: str

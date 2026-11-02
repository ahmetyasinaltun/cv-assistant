# Request and response schemas for CV templates, CV documents and rendering a CV to PDF.

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AfterValidator, BaseModel, Field

from app.cv.content import CvContent
from app.cv.render import CV_TEMPLATES
from app.cv.source_check import FactKind
from app.schemas.common import Language

DEFAULT_TEMPLATE = "classic"


def _known_template(value: str) -> str:
    if value not in CV_TEMPLATES:
        raise ValueError(f"Unknown CV template; choose one of: {', '.join(CV_TEMPLATES)}")
    return value


TemplateId = Annotated[str, AfterValidator(_known_template)]
CvDocumentKind = Literal["maker", "tailored"]
DocumentTitle = Annotated[str, Field(min_length=1, max_length=150)]


class CvTemplateResponse(BaseModel):
    id: str
    name: str


class CvRenderRequest(BaseModel):
    # The CV's own language: it sets section titles, month names and uppercasing, not the interface.
    language: Language
    content: CvContent


class CvDocumentCreateRequest(BaseModel):
    """A CV written from scratch. Without content it starts with the account's name and nothing else."""

    title: DocumentTitle
    language: Language
    template: TemplateId = DEFAULT_TEMPLATE
    content: CvContent | None = None


class CvDocumentFromResumeRequest(BaseModel):
    template: TemplateId = DEFAULT_TEMPLATE


class CvDocumentUpdateRequest(BaseModel):
    """Only the fields sent are changed; `content` replaces the whole CV."""

    title: DocumentTitle | None = None
    language: Language | None = None
    template: TemplateId | None = None
    content: CvContent | None = None


class CvDocumentSummaryResponse(BaseModel):
    id: UUID
    kind: CvDocumentKind
    title: str
    language: Language
    template: str
    resume_id: UUID | None
    created_at: datetime
    updated_at: datetime


class CvDocumentResponse(CvDocumentSummaryResponse):
    content: CvContent


class UnsupportedFactResponse(BaseModel):
    kind: FactKind
    value: str


class CvDocumentFromResumeResponse(CvDocumentResponse):
    """Also says what the user should look at once: facts the CV text did not show (dates among them were
    left out, names were kept) and sections that had no place in the structured CV."""

    unsupported_facts: list[UnsupportedFactResponse]
    omitted_sections: list[str]

# Request and response schemas for CV templates and rendering a CV to PDF.

from pydantic import BaseModel

from app.cv.content import CvContent
from app.schemas.common import Language


class CvTemplateResponse(BaseModel):
    id: str
    name: str


class CvRenderRequest(BaseModel):
    # The CV's own language: it sets section titles, month names and uppercasing, not the interface.
    language: Language
    content: CvContent

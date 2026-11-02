# HTTP routes for CV documents: write one from scratch or from a saved CV, list, read, edit, delete and download it.

import re
from typing import Annotated
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status

from app.ai.providers import get_ai_provider
from app.ai.providers.base import AIProvider
from app.api.deps import CurrentUser, DbSession
from app.api.routes.cv_templates import PAGE_COUNT_HEADER
from app.core.rate_limit import CV_AI_WRITES, CV_RENDERS
from app.cv.render import CvRenderer, get_cv_renderer
from app.models.cv_document import CvDocument
from app.schemas.cv import (
    CvDocumentCreateRequest,
    CvDocumentFromResumeRequest,
    CvDocumentFromResumeResponse,
    CvDocumentResponse,
    CvDocumentSummaryResponse,
    CvDocumentUpdateRequest,
    UnsupportedFactResponse,
)
from app.services.cv_document_service import CvDocumentService
from app.services.text_normalization import fold_for_matching

router = APIRouter(tags=["cv-documents"])

Provider = Annotated[AIProvider, Depends(get_ai_provider)]
Renderer = Annotated[CvRenderer, Depends(get_cv_renderer)]


def _to_summary(document: CvDocument) -> CvDocumentSummaryResponse:
    return CvDocumentSummaryResponse.model_validate(document, from_attributes=True)


def _to_response(document: CvDocument) -> CvDocumentResponse:
    return CvDocumentResponse.model_validate(document, from_attributes=True)


@router.post(
    "/cv-documents", response_model=CvDocumentResponse, status_code=status.HTTP_201_CREATED
)
def create_cv_document(
    payload: CvDocumentCreateRequest, current_user: CurrentUser, db: DbSession
) -> CvDocumentResponse:
    document = CvDocumentService(db).create_blank(
        current_user, payload.title, payload.language, payload.template, payload.content
    )
    return _to_response(document)


@router.post(
    "/resumes/{resume_id}/cv-documents",
    response_model=CvDocumentFromResumeResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_cv_document_from_resume(
    resume_id: UUID,
    payload: CvDocumentFromResumeRequest,
    current_user: CurrentUser,
    db: DbSession,
    provider: Provider,
) -> CvDocumentFromResumeResponse:
    """Copies a saved CV into an editable, structured CV with one model call; nothing is reworded."""
    # Checked first and counted only once the model has answered, so a refused request costs nothing.
    CV_AI_WRITES.check(str(current_user.id))
    document, result = CvDocumentService(db).create_from_resume(
        current_user, resume_id, payload.template, provider.llm
    )
    CV_AI_WRITES.record(str(current_user.id))
    return CvDocumentFromResumeResponse(
        **_to_response(document).model_dump(),
        unsupported_facts=[
            UnsupportedFactResponse(kind=fact.kind, value=fact.value) for fact in result.unsupported
        ],
        omitted_sections=result.omitted_sections,
    )


@router.get("/cv-documents", response_model=list[CvDocumentSummaryResponse])
def list_cv_documents(current_user: CurrentUser, db: DbSession) -> list[CvDocumentSummaryResponse]:
    return [_to_summary(d) for d in CvDocumentService(db).list_for_user(current_user.id)]


@router.get("/cv-documents/{document_id}", response_model=CvDocumentResponse)
def get_cv_document(
    document_id: UUID, current_user: CurrentUser, db: DbSession
) -> CvDocumentResponse:
    return _to_response(CvDocumentService(db).get(document_id, current_user.id))


@router.patch("/cv-documents/{document_id}", response_model=CvDocumentResponse)
def update_cv_document(
    document_id: UUID, payload: CvDocumentUpdateRequest, current_user: CurrentUser, db: DbSession
) -> CvDocumentResponse:
    return _to_response(CvDocumentService(db).update(document_id, current_user.id, payload))


@router.delete("/cv-documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cv_document(document_id: UUID, current_user: CurrentUser, db: DbSession) -> None:
    CvDocumentService(db).delete(document_id, current_user.id)


@router.get(
    "/cv-documents/{document_id}/pdf",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}, "description": "The CV as a PDF."}},
)
def download_cv_document(
    document_id: UUID, current_user: CurrentUser, db: DbSession, renderer: Renderer
) -> Response:
    CV_RENDERS.hit(str(current_user.id))
    document, rendered = CvDocumentService(db).render(document_id, current_user.id, renderer)
    return Response(
        content=rendered.pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": attachment_disposition(document.title),
            PAGE_COUNT_HEADER: str(rendered.page_count),
        },
    )


def attachment_disposition(title: str) -> str:
    """A plain ASCII file name for old clients plus the exact UTF-8 name ("Deniz Aydın CV.pdf") for the rest."""
    ascii_name = re.sub(r"[^a-z0-9]+", "-", fold_for_matching(title)).strip("-") or "cv"
    return f"attachment; filename=\"{ascii_name}.pdf\"; filename*=UTF-8''{quote(title)}.pdf"

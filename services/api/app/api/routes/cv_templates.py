# HTTP routes for listing CV templates and rendering given CV content to a PDF (used for previews and downloads).

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response

from app.api.deps import CurrentUser
from app.core.rate_limit import CV_RENDERS
from app.cv.render import CV_TEMPLATES, PREVIEW_PPI, CvRenderer, get_cv_renderer
from app.schemas.common import Language
from app.schemas.cv import CvRenderRequest, CvTemplateResponse

router = APIRouter(prefix="/cv-templates", tags=["cv-templates"])

PAGE_COUNT_HEADER = "X-Page-Count"


@router.get("", response_model=list[CvTemplateResponse])
def list_cv_templates(
    current_user: CurrentUser, language: Language = "en"
) -> list[CvTemplateResponse]:
    return [
        CvTemplateResponse(id=template.id, name=template.names[language])
        for template in CV_TEMPLATES.values()
    ]


@router.post(
    "/{template_id}/pdf",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}, "description": "The rendered CV."}},
)
def render_cv_pdf(
    template_id: str,
    payload: CvRenderRequest,
    current_user: CurrentUser,
    renderer: Annotated[CvRenderer, Depends(get_cv_renderer)],
) -> Response:
    """Renders the given content without saving it. The page count comes back in a header so clients can
    warn when a CV runs past one page."""
    CV_RENDERS.hit(str(current_user.id))
    rendered = renderer.render(payload.content, template_id, payload.language)
    return Response(
        content=rendered.pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="cv-{template_id}.pdf"',
            PAGE_COUNT_HEADER: str(rendered.page_count),
        },
    )


@router.post(
    "/{template_id}/preview",
    response_class=Response,
    responses={
        200: {"content": {"image/png": {}}, "description": "One page of the CV as an image."}
    },
)
def preview_cv_page(
    template_id: str,
    payload: CvRenderRequest,
    current_user: CurrentUser,
    renderer: Annotated[CvRenderer, Depends(get_cv_renderer)],
    page: Annotated[int, Query(ge=1, le=20)] = 1,
) -> Response:
    """One page of the given content as a PNG for the editor's live preview; nothing is saved."""
    CV_RENDERS.hit(str(current_user.id))
    rendered = renderer.render_page(
        payload.content, template_id, payload.language, page=page, ppi=PREVIEW_PPI
    )
    return Response(
        content=rendered.png,
        media_type="image/png",
        headers={PAGE_COUNT_HEADER: str(rendered.page_count), "Cache-Control": "no-store"},
    )

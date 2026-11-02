# Renders a CV to PDF with Typst: one cached compiler per template, bundled fonts only, CV data passed as JSON.

import json
import logging
import threading
from dataclasses import dataclass
from functools import lru_cache
from io import BytesIO
from pathlib import Path

import typst
from pypdf import PdfReader

from app.core.errors import CvRenderError, NotFoundError
from app.cv.content import CvContent
from app.cv.print_view import build_print_view
from app.schemas.common import Language

CV_DIR = Path(__file__).parent
TEMPLATES_DIR = CV_DIR / "templates"
FONTS_DIR = CV_DIR / "fonts"

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CvTemplate:
    id: str
    names: dict[Language, str]


CV_TEMPLATES: dict[str, CvTemplate] = {
    template.id: template
    for template in (
        CvTemplate("classic", {"en": "Classic", "tr": "Klasik"}),
        CvTemplate("modern", {"en": "Modern", "tr": "Modern"}),
        CvTemplate("standard", {"en": "Standard", "tr": "Standart"}),
    )
}


@dataclass(frozen=True)
class RenderedCv:
    pdf: bytes
    page_count: int


@dataclass(frozen=True)
class RenderedPage:
    png: bytes
    page_count: int


# Pixels per inch for page images: sharp at about 520 CSS pixels wide on a 2x screen, and a small list thumbnail.
PREVIEW_PPI = 128.0
THUMBNAIL_PPI = 60.0


def get_template(template_id: str) -> CvTemplate:
    template = CV_TEMPLATES.get(template_id)
    if template is None:
        raise NotFoundError("Unknown CV template.", code="template_not_found")
    return template


class CvRenderer:
    """Compiles CVs. Fonts are loaded once and system fonts are ignored, so a PDF looks the same on a laptop
    and on the server."""

    def __init__(self, templates_dir: Path = TEMPLATES_DIR, fonts_dir: Path = FONTS_DIR):
        self._templates_dir = templates_dir
        self._fonts = typst.Fonts(
            include_system_fonts=False, include_embedded_fonts=True, font_paths=[str(fonts_dir)]
        )
        self._compilers: dict[str, typst.Compiler] = {}
        # A compiler keeps state between runs; renders take tens of milliseconds, so one at a time is enough.
        self._lock = threading.Lock()

    def render(self, content: CvContent, template_id: str, language: Language) -> RenderedCv:
        pdf = self._compile(content, template_id, language, format="pdf")
        assert isinstance(pdf, bytes)
        return RenderedCv(pdf=pdf, page_count=len(PdfReader(BytesIO(pdf)).pages))

    def render_page(
        self, content: CvContent, template_id: str, language: Language, *, page: int, ppi: float
    ) -> RenderedPage:
        """One page as a PNG, for the editor's preview and the list's thumbnails: the same in every browser,
        with no PDF viewer around it. A page past the end gives the last one."""
        output = self._compile(content, template_id, language, format="png", ppi=ppi)
        pages = output if isinstance(output, list) else [output]
        index = min(max(page, 1), len(pages)) - 1
        return RenderedPage(png=pages[index], page_count=len(pages))

    def _compile(
        self,
        content: CvContent,
        template_id: str,
        language: Language,
        *,
        format: str,
        ppi: float | None = None,
    ) -> bytes | list[bytes]:
        template = get_template(template_id)
        data = json.dumps(build_print_view(content, language), ensure_ascii=False)
        with self._lock:
            compiler = self._compiler_for(template)
            try:
                output = compiler.compile(format=format, ppi=ppi, sys_inputs={"cv": data})
            except typst.TypstError as exc:
                # The diagnostic names the template line; the CV text itself is not logged.
                logger.error("CV template %r failed to compile: %s", template.id, exc.message)
                raise CvRenderError("The CV could not be rendered.") from exc
        assert output is not None
        return output

    def _compiler_for(self, template: CvTemplate) -> typst.Compiler:
        compiler = self._compilers.get(template.id)
        if compiler is None:
            compiler = typst.Compiler(
                str(self._templates_dir / template.id / "main.typ"),
                # The template folder is the root: a template cannot read files outside it.
                root=str(self._templates_dir / template.id),
                font_paths=self._fonts,
                ignore_system_fonts=True,
            )
            self._compilers[template.id] = compiler
        return compiler


@lru_cache
def get_cv_renderer() -> CvRenderer:
    return CvRenderer()

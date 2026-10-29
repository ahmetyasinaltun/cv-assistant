# Extracts plain text and link targets from uploaded PDF resumes; treats the upload as untrusted input.

import io
from collections.abc import Iterator

from pypdf import PageObject, PdfReader
from pypdf.errors import PdfReadError
from pypdf.generic import ArrayObject, DictionaryObject

from app.core.errors import ValidationFailedError

MAX_PDF_PAGES = 15
MAX_PDF_LINKS = 20
MAX_LINK_CHARS = 300


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        if reader.is_encrypted:
            raise ValidationFailedError(
                "Encrypted PDF files are not supported.", code="pdf_encrypted"
            )
        pages = reader.pages[:MAX_PDF_PAGES]
        text = "\n\n".join((page.extract_text() or "") for page in pages)
        links = _hidden_links(pages, text)
    except PdfReadError as exc:
        raise ValidationFailedError(
            "The uploaded file is not a readable PDF.", code="pdf_invalid"
        ) from exc
    if not text.strip():
        raise ValidationFailedError(
            "No text could be extracted from this PDF. Scanned images are not supported; paste the text instead.",
            code="pdf_no_text",
        )
    if links:
        text += "\n\nLinks\n" + "\n".join(f"- {link}" for link in links)
    return text


def _hidden_links(pages: list[PageObject], visible_text: str) -> list[str]:
    """Web addresses behind clickable text or icons (e.g. a ↗ next to a project) that the text does not show.

    A link is skipped when the page text already shows it, so a printed "github.com/jane" is not repeated.
    """
    shown = _comparable(visible_text)
    links: list[str] = []
    for page in pages:
        for uri in _link_uris(page):
            if uri not in links and _comparable(uri) not in shown:
                links.append(uri)
                if len(links) == MAX_PDF_LINKS:
                    return links
    return links


def _link_uris(page: PageObject) -> Iterator[str]:
    annotations = page.get("/Annots")
    annotations = annotations.get_object() if annotations is not None else None
    if not isinstance(annotations, ArrayObject):
        return
    for annotation in annotations:
        annotation = annotation.get_object()
        action = annotation.get("/A") if isinstance(annotation, DictionaryObject) else None
        action = action.get_object() if action is not None else None
        if not isinstance(action, DictionaryObject) or action.get("/S") != "/URI":
            continue
        uri = action.get("/URI")
        uri = uri.get_object() if uri is not None else None
        if isinstance(uri, bytes):
            uri = uri.decode("latin-1")
        if isinstance(uri, str) and _is_web_address(uri.strip()):
            yield uri.strip()


def _is_web_address(uri: str) -> bool:
    """Only plain http(s) links; mailto:, tel:, javascript: and oversized values are dropped."""
    return (
        uri.lower().startswith(("http://", "https://"))
        and len(uri) <= MAX_LINK_CHARS
        and not any(c.isspace() or not c.isprintable() for c in uri)
    )


def _comparable(text: str) -> str:
    """Lowercase without scheme, "www." and a trailing slash, so a link can be found in the page text."""
    text = text.lower().replace("https://", "").replace("http://", "").replace("www.", "")
    return text.rstrip("/")

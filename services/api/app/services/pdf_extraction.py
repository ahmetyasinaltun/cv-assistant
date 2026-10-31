# Extracts plain text and link targets from uploaded PDF resumes; treats the upload as untrusted input.

import io
from collections.abc import Iterator

from pypdf import PageObject, PdfReader
from pypdf.errors import PdfReadError
from pypdf.generic import ArrayObject, DictionaryObject

from app.core.errors import ValidationFailedError
from app.services.document_links import hidden_links, with_links_block

MAX_PDF_PAGES = 15


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        if reader.is_encrypted:
            raise ValidationFailedError(
                "Encrypted PDF files are not supported.", code="pdf_encrypted"
            )
        pages = reader.pages[:MAX_PDF_PAGES]
        text = "\n\n".join((page.extract_text() or "") for page in pages)
        # Web addresses behind clickable text or icons, read while the file is still open.
        links = hidden_links((uri for page in pages for uri in _link_uris(page)), text)
    except PdfReadError as exc:
        raise ValidationFailedError(
            "The uploaded file is not a readable PDF.", code="pdf_invalid"
        ) from exc
    if not text.strip():
        raise ValidationFailedError(
            "No text could be extracted from this PDF. Scanned images are not supported; paste the text instead.",
            code="pdf_no_text",
        )
    return with_links_block(text, links)


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
        if isinstance(uri, str):
            yield uri

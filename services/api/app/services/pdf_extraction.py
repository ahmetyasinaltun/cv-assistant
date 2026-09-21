# Extracts plain text from uploaded PDF resumes; treats the upload as untrusted input.

import io

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.core.errors import ValidationFailedError

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
    except PdfReadError as exc:
        raise ValidationFailedError(
            "The uploaded file is not a readable PDF.", code="pdf_invalid"
        ) from exc
    if not text.strip():
        raise ValidationFailedError(
            "No text could be extracted from this PDF. Scanned images are not supported; paste the text instead.",
            code="pdf_no_text",
        )
    return text

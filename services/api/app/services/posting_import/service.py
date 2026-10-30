# Turns a pasted link into a job-description draft (title, company, text) for the user to check before starting an
# analysis; nothing is stored, so a wrong guess costs nothing.

from collections.abc import Callable
from dataclasses import dataclass

from app.core.config import get_settings
from app.core.errors import ValidationFailedError
from app.services.posting_import.extract import extract_posting
from app.services.posting_import.fetch import FetchedPage, fetch_page
from app.services.posting_import.urls import canonical_link, parse_link
from app.services.text_normalization import normalize_document_text

# Mirrors the limits of a created job description.
MAX_FIELD_CHARS = 150


@dataclass(frozen=True)
class PostingDraft:
    title: str | None
    company: str | None
    text: str


class PostingImportService:
    def __init__(self, fetch: Callable[[str], FetchedPage] = fetch_page):
        self._fetch = fetch

    def draft_from_link(self, raw_url: str) -> PostingDraft:
        page = self._fetch(canonical_link(parse_link(raw_url)))
        posting = extract_posting(page.content, page.url, page.encoding)
        if posting is None:
            raise ValidationFailedError(
                "No job posting text was found on this page.", code="link_no_posting"
            )
        return PostingDraft(
            title=_field(posting.title),
            company=_field(posting.company),
            text=normalize_document_text(posting.text, max_chars=get_settings().max_document_chars),
        )


def _field(value: str | None) -> str | None:
    return value[:MAX_FIELD_CHARS].rstrip() if value else None

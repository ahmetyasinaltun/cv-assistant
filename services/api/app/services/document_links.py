# Link targets a document hides behind clickable text or icons (a ↗ next to a project), added to its text as a
# "Links" block so the analysis can cite them; shared by the PDF and Word readers. The file is untrusted, so only
# plain http(s) links of a sane length are kept, at most a fixed number of them.

from collections.abc import Iterable

MAX_DOCUMENT_LINKS = 20
MAX_LINK_CHARS = 300


def hidden_links(uris: Iterable[str], visible_text: str) -> list[str]:
    """Web addresses the text does not already show, in document order, without repeats.

    A link is skipped when the text shows it, so a printed "github.com/jane" is not repeated.
    """
    shown = _comparable(visible_text)
    links: list[str] = []
    for uri in (raw.strip() for raw in uris):
        if _is_web_address(uri) and uri not in links and _comparable(uri) not in shown:
            links.append(uri)
            if len(links) == MAX_DOCUMENT_LINKS:
                break
    return links


def with_links_block(text: str, links: list[str]) -> str:
    return text + "\n\nLinks\n" + "\n".join(f"- {link}" for link in links) if links else text


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

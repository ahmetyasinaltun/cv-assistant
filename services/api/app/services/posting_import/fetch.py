# Downloads one public web page for posting import with the guards a user-supplied URL needs: every redirect hop is
# re-checked against private addresses, and time, size and content type are capped.

from dataclasses import dataclass
from urllib.parse import urlsplit

import httpx

from app.core.errors import ExternalPageError, ValidationFailedError
from app.services.posting_import.urls import (
    Resolver,
    ensure_public_host,
    is_public_address,
    parse_link,
    resolve_host,
)

MAX_REDIRECTS = 5
MAX_PAGE_BYTES = 3 * 1024 * 1024
TIMEOUT = httpx.Timeout(10.0, connect=5.0)
# The app says who it is instead of posing as a browser; every site tested answered it like a browser.
HEADERS = {
    "User-Agent": "CVAssistant/0.1 (+https://cvassistant-app.vercel.app)",
    "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
}
# LinkedIn answers 999 to requests it treats as automated.
_REFUSED_STATUSES = {401, 403, 407, 429, 999}
_GONE_STATUSES = {404, 410}
_LOGIN_PATHS = ("/authwall", "/login", "/uas/login", "/signin", "/checkpoint")


@dataclass(frozen=True)
class FetchedPage:
    url: str
    content: bytes
    encoding: str | None


def fetch_page(
    url: str,
    *,
    resolve: Resolver = resolve_host,
    transport: httpx.BaseTransport | None = None,
) -> FetchedPage:
    with httpx.Client(
        headers=HEADERS, timeout=TIMEOUT, follow_redirects=False, transport=transport
    ) as client:
        for _ in range(MAX_REDIRECTS + 1):
            ensure_public_host(url, resolve)
            try:
                with client.stream("GET", url) as response:
                    _ensure_connected_to_public_address(response)
                    location = response.headers.get("location")
                    if response.is_redirect and location:
                        url = parse_link(str(response.url.join(location)))
                        continue
                    _check_response(response)
                    return FetchedPage(
                        str(response.url), _read_capped(response), response.charset_encoding
                    )
            except httpx.TimeoutException as exc:
                raise ExternalPageError(
                    "The site took too long to answer.", code="link_unreachable"
                ) from exc
            except httpx.HTTPError as exc:
                raise ExternalPageError(
                    "The site could not be reached.", code="link_unreachable"
                ) from exc
    raise ExternalPageError("The link redirects too many times.", code="link_unreachable")


def _ensure_connected_to_public_address(response: httpx.Response) -> None:
    """The host was checked before connecting, but DNS can answer differently a moment later (DNS rebinding),
    so the address actually connected to is checked again before anything of the response is used."""
    stream = response.extensions.get("network_stream")
    peer = stream.get_extra_info("server_addr") if stream is not None else None
    if peer and not is_public_address(peer[0]):
        raise ValidationFailedError("This address cannot be fetched.", code="link_not_allowed")


def _check_response(response: httpx.Response) -> None:
    status = response.status_code
    if status in _REFUSED_STATUSES or urlsplit(str(response.url)).path.startswith(_LOGIN_PATHS):
        raise ExternalPageError("The site did not let us read this page.", code="link_blocked")
    if status in _GONE_STATUSES:
        raise ValidationFailedError("The page no longer exists.", code="link_not_found")
    if status >= 400:
        raise ExternalPageError(
            f"The site answered with an error ({status}).", code="link_unreachable"
        )
    content_type = response.headers.get("content-type", "text/html").lower()
    if "html" not in content_type:
        raise ValidationFailedError(
            "The link does not point to a web page.", code="link_no_posting"
        )


def _read_capped(response: httpx.Response) -> bytes:
    chunks: list[bytes] = []
    size = 0
    for chunk in response.iter_bytes():
        size += len(chunk)
        if size > MAX_PAGE_BYTES:
            raise ValidationFailedError("The page is too large to read.", code="link_no_posting")
        chunks.append(chunk)
    return b"".join(chunks)

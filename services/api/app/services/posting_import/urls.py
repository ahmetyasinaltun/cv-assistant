# Checks links pasted for import, refuses addresses inside private networks (SSRF guard) and reduces LinkedIn job
# links of any shape to the public job page.

import ipaddress
import re
import socket
from collections.abc import Callable
from urllib.parse import parse_qs, urlsplit

from app.core.errors import ExternalPageError, ValidationFailedError

MAX_URL_CHARS = 2_000

_HAS_SCHEME = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.-]*:")

# "/jobs/view/4475250238", "/jobs/view/software-intern-at-acme-4475250238/"
_LINKEDIN_JOB_PATH = re.compile(r"^/jobs/view/(?:[^/]*-)?(\d{6,})/?$")

Resolver = Callable[[str, int], list[str]]


def parse_link(raw: str) -> str:
    """Returns the link as an absolute http(s) URL, or raises link_invalid."""
    url = raw.strip()
    if not url or len(url) > MAX_URL_CHARS or any(c.isspace() for c in url):
        raise _invalid()
    # People often copy "kariyer.net/is-ilani/..." without the scheme. Only a link with no scheme at all gets one:
    # "file:/etc/passwd" or "javascript:..." keep theirs and are refused below.
    if not _HAS_SCHEME.match(url):
        url = f"https://{url}"
    parts = urlsplit(url)
    if (
        parts.scheme not in ("http", "https")
        or not parts.hostname
        or parts.username
        or parts.password
    ):
        raise _invalid()
    try:
        _ = parts.port  # raises ValueError for a port outside 0-65535
    except ValueError as exc:
        raise _invalid() from exc
    return url


def canonical_link(url: str) -> str:
    """The URL worth fetching: LinkedIn job links ("/jobs/view/<slug>-<id>", "?currentJobId=<id>") become the
    public job page, which shows the posting without a login; other links stay as they are."""
    parts = urlsplit(url)
    host = parts.hostname or ""
    if host == "linkedin.com" or host.endswith(".linkedin.com"):
        job_id = _linkedin_job_id(parts.path, parts.query)
        if job_id:
            return f"https://www.linkedin.com/jobs/view/{job_id}/"
    return url


def ensure_public_host(url: str, resolve: Resolver) -> None:
    """Refuses a URL whose host resolves to a loopback, private, link-local or otherwise non-public address, so a
    pasted link cannot make the server call itself, the cloud metadata service or another internal machine."""
    parts = urlsplit(url)
    port = parts.port or (443 if parts.scheme == "https" else 80)
    try:
        addresses = resolve(parts.hostname or "", port)
    except OSError as exc:
        raise ExternalPageError(
            "The site's address could not be found.", code="link_unreachable"
        ) from exc
    if not addresses or not all(_is_public(address) for address in addresses):
        raise ValidationFailedError("This address cannot be fetched.", code="link_not_allowed")


def resolve_host(host: str, port: int) -> list[str]:
    return [info[4][0] for info in socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)]


def _linkedin_job_id(path: str, query: str) -> str | None:
    match = _LINKEDIN_JOB_PATH.match(path)
    if match:
        return match.group(1)
    current = parse_qs(query).get("currentJobId", [""])[0]
    return current if current.isdigit() else None


def _is_public(address: str) -> bool:
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return False
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    return ip.is_global


def _invalid() -> ValidationFailedError:
    return ValidationFailedError(
        "Enter a full web address that starts with http or https.", code="link_invalid"
    )

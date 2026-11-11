# Works out which network address a request came from, for per-address limits, and turns it into a key that does
# not store the address itself.

import hashlib
import hmac

from fastapi import Request

from app.core.config import Settings

# Sent only by the web server: the visitor's address, and the secret that proves the web server sent it.
FORWARDED_CLIENT_HEADER = "x-client-address"
PROXY_SECRET_HEADER = "x-proxy-secret"


def client_address(request: Request, settings: Settings) -> str | None:
    """The address a limit should count.

    1. A request from the web server carries its visitor's address, which counts only with the shared secret;
       anyone else could write any address into that header.
    2. Otherwise CF-Connecting-IP: Render's edge is Cloudflare, which sets it to the address that connected and
       does not keep a value the caller sent.
    3. Otherwise the first X-Forwarded-For entry (local proxies). Behind Cloudflare it is not used, because the
       caller's own X-Forwarded-For stays in front of the address Cloudflare adds.
    4. Otherwise the socket address (local development, tests).
    """
    secret = settings.web_proxy_secret
    sent_secret = request.headers.get(PROXY_SECRET_HEADER, "")
    if secret and sent_secret and hmac.compare_digest(sent_secret, secret):
        forwarded_client = request.headers.get(FORWARDED_CLIENT_HEADER, "").strip()
        if forwarded_client:
            return forwarded_client
    connecting = request.headers.get("cf-connecting-ip", "").strip()
    if connecting:
        return connecting
    forwarded_for = request.headers.get("x-forwarded-for", "")
    first = forwarded_for.split(",")[0].strip()
    if first:
        return first
    return request.client.host if request.client else None


def address_key(address: str | None, settings: Settings) -> str | None:
    """A keyed hash of the address: equal addresses give equal keys, and the stored key does not reveal the
    address to someone who reads the database without the server's secret."""
    if not address:
        return None
    digest = hmac.new(settings.jwt_secret_key.encode(), address.encode(), hashlib.sha256)
    return digest.hexdigest()[:32]

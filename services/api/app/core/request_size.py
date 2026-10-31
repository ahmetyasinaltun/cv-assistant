# Refuses a request whose declared body is larger than the API ever needs, before any of the body is read, so one
# oversized upload or JSON body cannot fill the memory of a small free instance.

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

# The largest legitimate request is a 5 MB PDF upload plus its form fields.
MAX_REQUEST_BYTES = 6 * 1024 * 1024


class RequestSizeLimit:
    """Checks Content-Length only; a body sent without one still meets the per-field limits further in."""

    def __init__(self, app: ASGIApp, max_bytes: int = MAX_REQUEST_BYTES):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            declared = dict(scope["headers"]).get(b"content-length")
            if declared is not None and (not declared.isdigit() or int(declared) > self.max_bytes):
                response = JSONResponse(
                    status_code=413,
                    content={
                        "error": {
                            "code": "request_too_large",
                            "message": "The request is too large.",
                        }
                    },
                )
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)

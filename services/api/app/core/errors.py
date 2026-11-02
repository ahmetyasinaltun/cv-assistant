# Application-level exception types and the FastAPI handlers that map them to predictable JSON errors.

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base class for errors that should surface to the client with a stable error code."""

    status_code = 400
    code = "bad_request"

    def __init__(self, message: str, *, code: str | None = None, status_code: int | None = None):
        super().__init__(message)
        self.message = message
        if code is not None:
            self.code = code
        if status_code is not None:
            self.status_code = status_code


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class ConflictError(AppError):
    status_code = 409
    code = "conflict"


class UnauthorizedError(AppError):
    status_code = 401
    code = "unauthorized"


class ValidationFailedError(AppError):
    status_code = 422
    code = "validation_failed"


class AIProviderError(AppError):
    status_code = 502
    code = "ai_provider_error"


class TooManyRequestsError(AppError):
    """A per-user or per-account limit is used up; clients learn from Retry-After when to try again."""

    status_code = 429
    code = "rate_limited"

    def __init__(self, message: str, *, retry_after_seconds: int):
        super().__init__(message)
        self.retry_after_seconds = retry_after_seconds


class ExternalPageError(AppError):
    """A web page the user linked to could not be read: the site refused, failed or did not answer."""

    status_code = 502
    code = "link_unreachable"


class CvRenderError(AppError):
    """A CV template failed to produce a PDF. Content is validated first, so this points to a template bug."""

    status_code = 500
    code = "cv_render_failed"


def _error_body(code: str, message: str, details: object | None = None) -> dict:
    body: dict = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return body


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        headers = {"WWW-Authenticate": "Bearer"} if exc.status_code == 401 else None
        if isinstance(exc, TooManyRequestsError):
            headers = {"Retry-After": str(exc.retry_after_seconds)}
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(exc.code, exc.message),
            headers=headers,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            # jsonable_encoder: a custom validator's ValueError sits in the details and is not plain JSON.
            content=_error_body(
                "validation_failed", "Request validation failed.", jsonable_encoder(exc.errors())
            ),
        )

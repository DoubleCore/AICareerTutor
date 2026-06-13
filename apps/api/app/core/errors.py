from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger

logger = get_logger("app.errors")


def _envelope(code: str, message: str, details=None) -> dict:
    error: dict = {"code": code, "message": message}
    if details is not None:
        error["details"] = details
    return {"error": error}


class AppError(HTTPException):
    """Application error carrying a stable machine-readable code."""

    def __init__(self, status_code: int, code: str, message: str, details=None) -> None:
        super().__init__(status_code=status_code, detail=message)
        self.code = code
        self.message = message
        self.details = details


async def _app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=_envelope(exc.code, exc.message, exc.details))


async def _http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = {
        400: "bad_request",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        405: "method_not_allowed",
        409: "conflict",
    }.get(exc.status_code, "http_error")
    message = exc.detail if isinstance(exc.detail, str) else "HTTP error"
    return JSONResponse(status_code=exc.status_code, content=_envelope(code, message))


async def _validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=_envelope("validation_error", "Request validation failed", exc.errors()),
    )


async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content=_envelope("internal_error", "Internal server error"))


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _app_error_handler)
    app.add_exception_handler(StarletteHTTPException, _http_exception_handler)
    app.add_exception_handler(RequestValidationError, _validation_exception_handler)
    app.add_exception_handler(Exception, _unhandled_exception_handler)

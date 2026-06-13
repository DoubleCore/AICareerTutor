from typing import Any

from pydantic import BaseModel


class StatusResponse(BaseModel):
    ok: bool = True
    message: str = "ok"


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Any | None = None


class ErrorResponse(BaseModel):
    """Unified error envelope returned for all handled exceptions."""

    error: ErrorDetail

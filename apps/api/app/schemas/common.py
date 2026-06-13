from typing import Any

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base model exposing camelCase aliases over the wire.

    FastAPI serializes ``response_model`` with ``by_alias=True`` by default,
    so responses emit camelCase. ``populate_by_name=True`` keeps snake_case
    constructor calls (e.g. ``Model(session_id=...)``) and snake_case request
    bodies working too.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class StatusResponse(CamelModel):
    ok: bool = True
    message: str = "ok"


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Any | None = None


class ErrorResponse(BaseModel):
    """Unified error envelope returned for all handled exceptions."""

    error: ErrorDetail

from pydantic import BaseModel


class StatusResponse(BaseModel):
    ok: bool = True
    message: str = "ok"

from pydantic import BaseModel

from app.schemas.explore import CurrentPathResponse
from app.schemas.interview import InterviewReport


class ProfileHome(BaseModel):
    nickname: str = "Archer"
    current_focus: str
    explore: CurrentPathResponse
    interview: InterviewReport
    abilities: list[str]

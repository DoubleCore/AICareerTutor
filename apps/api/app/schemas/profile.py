from app.schemas.common import CamelModel
from app.schemas.explore import CurrentPathResponse
from app.schemas.interview import InterviewReport


class ProfileHome(CamelModel):
    nickname: str = "Archer"
    current_focus: str
    explore: CurrentPathResponse
    interview: InterviewReport
    abilities: list[str]

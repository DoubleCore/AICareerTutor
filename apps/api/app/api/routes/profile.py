from fastapi import APIRouter

from app.schemas.profile import ProfileHome
from app.services import mock_state

router = APIRouter()


@router.get("/home", response_model=ProfileHome)
def profile_home() -> ProfileHome:
    direction_name = mock_state.CURRENT_PATH.direction.title if mock_state.CURRENT_PATH.direction else "AI产品经理"
    return ProfileHome(
        current_focus=f"你正在探索方向：{direction_name}",
        explore=mock_state.CURRENT_PATH,
        interview=mock_state.get_report(),
        abilities=["结构化表达", "沟通协作", "项目推进", "数据理解", "逻辑分析"],
    )

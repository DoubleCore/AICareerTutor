from fastapi import APIRouter

from app.schemas.profile import ProfileHome
from app.services import mock_state

router = APIRouter()


@router.get("/home", response_model=ProfileHome)
def profile_home() -> ProfileHome:
    # 探索链路做实:CURRENT_PATH 全局已删,改读落库的当前路径(get_current_path)。
    current_path = mock_state.get_current_path()
    direction_name = current_path.direction.title if current_path.direction else "AI产品经理"
    return ProfileHome(
        current_focus=f"你正在探索方向：{direction_name}",
        explore=current_path,
        interview=mock_state.get_report(),
        abilities=["结构化表达", "沟通协作", "项目推进", "数据理解", "逻辑分析"],
    )

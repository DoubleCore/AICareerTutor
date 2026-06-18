from fastapi import APIRouter, Depends

from app.api.routes.auth import get_optional_user_id
from app.schemas.common import StatusResponse
from app.schemas.explore import CurrentPathResponse, ExploreProfile, ExploreResult, FollowupRequest, FollowupResponse, SavePathRequest
from app.services import ai_service, mock_state

router = APIRouter()

# 探索链路做实:LATEST_PROFILE 全局已删 —— 画像改落 SQLite(mock_state.save_explore_profile,按 user_id upsert)。
# B7:各端点接入可选鉴权(get_optional_user_id)—— 带 token 用真实 user_id、不带回退 DEV_USER_ID,
# 透传给 mock_state / ai_service。未登录的旧调用仍可用,不一刀切打断现有链路。


@router.post("/basic-profile", response_model=StatusResponse)
def submit_basic_profile(profile: ExploreProfile, user_id: str = Depends(get_optional_user_id)) -> StatusResponse:
    mock_state.save_explore_profile(profile, user_id)
    return StatusResponse(message="basic profile saved")


@router.post("/experience", response_model=StatusResponse)
def submit_experience(profile: ExploreProfile, user_id: str = Depends(get_optional_user_id)) -> StatusResponse:
    mock_state.save_explore_profile(profile, user_id)
    return StatusResponse(message="experience saved")


@router.post("/followup", response_model=FollowupResponse)
def generate_followup(payload: FollowupRequest, user_id: str = Depends(get_optional_user_id)) -> FollowupResponse:
    # 多轮追问:持久化本次画像(后续结果基于落库画像),基于画像 + 已问历史生成下一题(或 done)。
    mock_state.save_explore_profile(payload.profile, user_id)
    return ai_service.generate_followup(payload.profile, payload.history)


@router.post("/confirm", response_model=ExploreProfile)
def confirm_profile(profile: ExploreProfile, user_id: str = Depends(get_optional_user_id)) -> ExploreProfile:
    # 画像确认即落库,并失效旧的方向推荐缓存 —— 画像可能已变更,下次 generate-result 重新生成(real 模式基于最新画像重算)。
    mock_state.save_explore_profile(profile, user_id)
    mock_state.clear_explore_result(user_id)
    return profile


@router.post("/generate-result", response_model=ExploreResult)
def generate_result(profile: ExploreProfile | None = None, user_id: str = Depends(get_optional_user_id)) -> ExploreResult:
    # 若带画像则先持久化;生成方向推荐(当前 mock)并入缓存,刷新/聚合页纯读不重构造。
    if profile is not None:
        mock_state.save_explore_profile(profile, user_id)
    return ai_service.generate_explore_result(profile, user_id)


@router.post("/save-path", response_model=CurrentPathResponse)
def save_path(payload: SavePathRequest, user_id: str = Depends(get_optional_user_id)) -> CurrentPathResponse:
    return mock_state.save_path(payload.direction_id, user_id)


@router.get("/current-path", response_model=CurrentPathResponse)
def current_path(user_id: str = Depends(get_optional_user_id)) -> CurrentPathResponse:
    return mock_state.get_current_path(user_id)

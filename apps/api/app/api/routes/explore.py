from fastapi import APIRouter

from app.schemas.common import StatusResponse
from app.schemas.explore import CurrentPathResponse, ExploreProfile, ExploreResult, FollowupQuestion, SavePathRequest
from app.services import ai_service, mock_state

router = APIRouter()

# 探索链路做实:LATEST_PROFILE 全局已删 —— 画像改落 SQLite(mock_state.save_explore_profile,按 user_id upsert)。


@router.post("/basic-profile", response_model=StatusResponse)
def submit_basic_profile(profile: ExploreProfile) -> StatusResponse:
    mock_state.save_explore_profile(profile)
    return StatusResponse(message="basic profile saved")


@router.post("/experience", response_model=StatusResponse)
def submit_experience(profile: ExploreProfile) -> StatusResponse:
    mock_state.save_explore_profile(profile)
    return StatusResponse(message="experience saved")


@router.post("/followup", response_model=list[FollowupQuestion])
def generate_followup(profile: ExploreProfile) -> list[FollowupQuestion]:
    # 先持久化本次画像(核心收益:后续追问/结果都基于落库画像),再返回追问(当前 mock)。
    mock_state.save_explore_profile(profile)
    return ai_service.generate_followups(profile)


@router.post("/confirm", response_model=ExploreProfile)
def confirm_profile(profile: ExploreProfile) -> ExploreProfile:
    # 画像确认即落库,并失效旧的方向推荐缓存 —— 画像可能已变更,下次 generate-result 重新生成(real 模式基于最新画像重算)。
    mock_state.save_explore_profile(profile)
    mock_state.clear_explore_result()
    return profile


@router.post("/generate-result", response_model=ExploreResult)
def generate_result(profile: ExploreProfile | None = None) -> ExploreResult:
    # 若带画像则先持久化;生成方向推荐(当前 mock)并入缓存,刷新/聚合页纯读不重构造。
    if profile is not None:
        mock_state.save_explore_profile(profile)
    return ai_service.generate_explore_result(profile)


@router.post("/save-path", response_model=CurrentPathResponse)
def save_path(payload: SavePathRequest) -> CurrentPathResponse:
    return mock_state.save_path(payload.direction_id)


@router.get("/current-path", response_model=CurrentPathResponse)
def current_path() -> CurrentPathResponse:
    return mock_state.get_current_path()

from fastapi import APIRouter

from app.schemas.common import StatusResponse
from app.schemas.explore import CurrentPathResponse, ExploreProfile, ExploreResult, FollowupQuestion, SavePathRequest
from app.services import ai_service, mock_state

router = APIRouter()

LATEST_PROFILE = ExploreProfile()


@router.post("/basic-profile", response_model=StatusResponse)
def submit_basic_profile(profile: ExploreProfile) -> StatusResponse:
    global LATEST_PROFILE
    LATEST_PROFILE = profile
    return StatusResponse(message="basic profile saved")


@router.post("/experience", response_model=StatusResponse)
def submit_experience(profile: ExploreProfile) -> StatusResponse:
    global LATEST_PROFILE
    LATEST_PROFILE = profile
    return StatusResponse(message="experience saved")


@router.post("/followup", response_model=list[FollowupQuestion])
def generate_followup(profile: ExploreProfile) -> list[FollowupQuestion]:
    global LATEST_PROFILE
    LATEST_PROFILE = profile
    return ai_service.generate_followups(profile)


@router.post("/confirm", response_model=ExploreProfile)
def confirm_profile(profile: ExploreProfile) -> ExploreProfile:
    global LATEST_PROFILE
    LATEST_PROFILE = profile
    return profile


@router.post("/generate-result", response_model=ExploreResult)
def generate_result(profile: ExploreProfile | None = None) -> ExploreResult:
    return ai_service.generate_explore_result(profile or LATEST_PROFILE)


@router.post("/save-path", response_model=CurrentPathResponse)
def save_path(payload: SavePathRequest) -> CurrentPathResponse:
    return mock_state.save_path(payload.direction_id)


@router.get("/current-path", response_model=CurrentPathResponse)
def current_path() -> CurrentPathResponse:
    return mock_state.CURRENT_PATH

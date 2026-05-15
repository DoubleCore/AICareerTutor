from app.schemas.explore import ExploreProfile, ExploreResult, FollowupQuestion
from app.schemas.interview import InterviewAnalysis, InterviewReport
from app.services import mock_state


def generate_followups(profile: ExploreProfile) -> list[FollowupQuestion]:
    return mock_state.get_followups(profile)


def generate_explore_result(_: ExploreProfile | None = None) -> ExploreResult:
    return mock_state.get_explore_result()


def analyze_interview(session_id: str) -> InterviewReport:
    return mock_state.get_report(session_id)


def generate_interview_analysis(_: str) -> InterviewAnalysis:
    return mock_state.get_analysis()

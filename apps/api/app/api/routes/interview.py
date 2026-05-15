from fastapi import APIRouter, HTTPException

from app.schemas.common import StatusResponse
from app.schemas.interview import InterviewAnalysis, InterviewReport, InterviewUpload, TrainingTask, UpdateTrainingTaskRequest, UploadResponse
from app.services import ai_service, file_service, mock_state

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
def upload_interview(upload: InterviewUpload) -> UploadResponse:
    stored = file_service.store_upload_metadata(upload)
    session_id = mock_state.upload_interview(stored)
    return UploadResponse(session_id=session_id, upload=stored)


@router.post("/analyze", response_model=InterviewReport)
def analyze_interview(session_id: str = "mock-session") -> InterviewReport:
    return ai_service.analyze_interview(session_id)


@router.get("/overview/{session_id}", response_model=InterviewReport)
def overview(session_id: str) -> InterviewReport:
    return mock_state.get_report(session_id)


@router.get("/analysis/{session_id}", response_model=InterviewAnalysis)
def analysis(session_id: str) -> InterviewAnalysis:
    return ai_service.generate_interview_analysis(session_id)


@router.get("/training/{session_id}", response_model=list[TrainingTask])
def training(session_id: str) -> list[TrainingTask]:
    return mock_state.TRAINING_TASKS


@router.patch("/training/task/{task_id}", response_model=TrainingTask)
def update_task(task_id: str, payload: UpdateTrainingTaskRequest) -> TrainingTask:
    task = mock_state.update_training_task(task_id, payload.status)
    if not task:
        raise HTTPException(status_code=404, detail="Training task not found")
    return task


@router.post("/reset", response_model=StatusResponse)
def reset_interview() -> StatusResponse:
    return StatusResponse(message="P0 reset endpoint placeholder")

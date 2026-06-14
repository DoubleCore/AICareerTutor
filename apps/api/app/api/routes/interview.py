from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.schemas.common import StatusResponse
from app.schemas.interview import AnalysisStatusResponse, InterviewAnalysis, InterviewReport, InterviewUpload, TrainingTask, UpdateTrainingTaskRequest, UploadResponse
from app.services import ai_service, file_service, mock_state

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
def upload_interview(upload: InterviewUpload) -> UploadResponse:
    # P1-04:文本上传做实 —— transcript 为空直接拒绝(走统一错误信封 422)。
    if not upload.transcript.strip():
        raise HTTPException(status_code=422, detail="面试转写文本不能为空")
    stored = file_service.store_upload_metadata(upload)
    session_id = mock_state.upload_interview(stored)
    return UploadResponse(session_id=session_id)


@router.post("/analyze", response_model=AnalysisStatusResponse)
def analyze_interview(session_id: str = "mock-session", *, background_tasks: BackgroundTasks) -> AnalysisStatusResponse:
    # 方案C:异步生成 —— 先置 generating,把全量生成(可能真调 LLM,耗时 15~24s)丢到后台,
    # 立即返回,避免前端请求超时。前端轮询 /status,ready 后再读 /overview。
    mock_state.set_report_status(session_id, "generating")
    background_tasks.add_task(ai_service.run_analysis, session_id)
    return AnalysisStatusResponse(session_id=session_id, status="generating")


@router.get("/status/{session_id}", response_model=AnalysisStatusResponse)
def analysis_status(session_id: str) -> AnalysisStatusResponse:
    # 方案C:供前端轮询报告生成进度(generating / ready / idle)。
    return AnalysisStatusResponse(session_id=session_id, status=ai_service.get_analysis_status(session_id))


@router.get("/overview/{session_id}", response_model=InterviewReport)
def overview(session_id: str) -> InterviewReport:
    # P1-06:纯读 —— 经 ai_service 读缓存报告,未命中回退 mock,绝不触发 real LLM。
    return ai_service.get_interview_report(session_id)


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

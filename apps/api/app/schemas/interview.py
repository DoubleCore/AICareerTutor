from typing import Literal

from app.schemas.common import CamelModel

TaskStatus = Literal["未开始", "进行中", "已完成"]


class InterviewUpload(CamelModel):
    file_name: str = "mock_interview_note.txt"
    job_title: str = "AI产品经理"
    company: str = "字节跳动"
    jd: str = "负责 AI 产品需求分析、方案设计、跨团队协作和项目落地。"
    transcript: str = "面试中主要讲述了一段校园产品项目经历，但个人贡献和结果量化表达不够清晰。"


class UploadResponse(CamelModel):
    session_id: str
    status: str = "uploaded"


class TrainingTask(CamelModel):
    id: str
    title: str
    description: str
    status: TaskStatus


class InterviewerView(CamelModel):
    impression: str
    positives: list[str]
    concerns: list[str]


class InterviewReport(CamelModel):
    session_id: str = "mock-session"
    title: str
    overall: str
    conclusion: str
    pass_possibility: int
    pass_level: Literal["低", "中", "高"]
    core_problems: list[str]
    interviewer_view: InterviewerView
    priority_tasks: list[TrainingTask]


class AnalysisQuestion(CamelModel):
    question: str
    intent: str
    answer: str


class InterviewerAnalysis(CamelModel):
    summary: str
    hesitations: list[str]
    questions: list[AnalysisQuestion]


class RiskAnalysis(CamelModel):
    risks: list[str]
    positives: list[str]
    negatives: list[str]


class InterviewAnalysis(CamelModel):
    logic: list[dict[str, str]]
    star: list[dict[str, str]]
    interviewer: InterviewerAnalysis
    risks: RiskAnalysis


class UpdateTrainingTaskRequest(CamelModel):
    status: TaskStatus

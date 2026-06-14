from datetime import datetime, timezone

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel

DEV_USER_ID = "dev-user"


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ExploreProfileRecord(SQLModel, table=True):
    """A submitted career-exploration profile (basic info + experience + followups)."""

    __tablename__ = "explore_profile"

    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(default=DEV_USER_ID, index=True)
    stage: str = ""
    education: str = ""
    major: str = ""
    goal: str = ""
    constraints: str = ""
    interests: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    work_preferences: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    experiences: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    work_types: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    preferred_states: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    followups: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


# ---------------------------------------------------------------------------
# P1-08:面试链路落库(把 mock_state 的进程内 SESSIONS / REPORTS / REPORT_STATUS
# 三块 dict 持久化进 SQLite,跨重启存活)。
#
# 报告 JSON 整列存:InterviewReport 是深度嵌套结构(interviewerView 对象 +
# coreProblems/priorityTasks 数组),整体 model_dump_json() 序列化进一个 TEXT 列,
# 不拆嵌套表 —— 嵌套数组不适合关系列存,P1 拆表收益低;将来迁 Postgres 可平滑切 JSONB。
# ---------------------------------------------------------------------------


class InterviewSessionRow(SQLModel, table=True):
    """每次上传的面试材料,主键 session_id(对齐 InterviewUpload 的 5 个扁平字段)。"""

    __tablename__ = "interview_sessions"

    session_id: str = Field(primary_key=True)
    file_name: str
    job_title: str
    company: str
    jd: str
    transcript: str


class ReportRow(SQLModel, table=True):
    """报告生成状态 + 已生成报告(整列 JSON),主键 session_id。

    status + report_json 同表同生命周期:/analyze 先建行(status=generating,
    report_json=None),后台生成后填 report_json + status=ready。无需跨表协调一致性。
    report_json 为 InterviewReport.model_dump_json() 结果(snake_case 内部表示);
    读出时 InterviewReport.model_validate_json 还原。status: generating|ready|failed|idle。
    """

    __tablename__ = "interview_reports"

    session_id: str = Field(primary_key=True)
    status: str = "idle"
    report_json: str | None = None

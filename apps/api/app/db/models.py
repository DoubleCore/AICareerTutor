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
    # 探索链路做实:constraints 与 schema 的 list[str] 对齐(原 str="" 是脚手架遗留 bug)。
    constraints: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    interests: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    work_preferences: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    experiences: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    work_types: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    preferred_states: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    followups: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


# ---------------------------------------------------------------------------
# 探索链路做实:方向推荐结果 + 已保存路径落库(照 P1-08 ReportRow「整列 JSON」范式)。
#
# ExploreResult / CurrentPathResponse 都是深度嵌套结构(directions 含 portrait 对象 +
# weekly_tasks 数组),整体 model_dump_json() 进一个 TEXT 列,不拆嵌套表 —— 与报告同理。
# 维度按 user_id(P0 单用户 dev-user,非并发),每用户单行 upsert,跨重启存活。
# ---------------------------------------------------------------------------


class ExploreResultRow(SQLModel, table=True):
    """某用户的方向推荐结果(整列 JSON),主键 user_id。

    result_json 为 ExploreResult.model_dump_json() 结果;读出时 model_validate_json 还原。
    默认 None(未生成时为空,读时回退 build_mock_explore_result)。
    """

    __tablename__ = "explore_result"

    user_id: str = Field(default=DEV_USER_ID, primary_key=True)
    result_json: str | None = None


class CurrentPathRow(SQLModel, table=True):
    """某用户已保存的探索路径快照(整列 JSON),主键 user_id。

    path_json 为 CurrentPathResponse.model_dump_json() 结果(含所选 direction + 当时 tasks 状态);
    读出时 model_validate_json 还原。默认 None(未保存时为空,读时回退空 CurrentPathResponse)。
    """

    __tablename__ = "current_path"

    user_id: str = Field(default=DEV_USER_ID, primary_key=True)
    path_json: str | None = None


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

    P1-09:analysis_json 追加列 —— 同一次 analyze 产出的「深入分析」(InterviewAnalysis,
    逻辑/STAR/面试官/风险四维),与 report_json 同 session 同生命周期(一起 generating→一起 ready)。
    复用本表(而非新建)避免跨表一致性协调;默认 None(老行/未生成时为空,读时回退 mock)。
    """

    __tablename__ = "interview_reports"

    session_id: str = Field(primary_key=True)
    status: str = "idle"
    report_json: str | None = None
    analysis_json: str | None = None


# ---------------------------------------------------------------------------
# P1-07:训练任务状态按 session 持久化(修掉 overview 点击任务状态、刷新即重置)。
#
# 设计延续 P1-08「report_json 只读」:不改写报告 JSON。任务**清单**(id/title/
# description)仍来自报告的 priority_tasks(只读),任务**状态**独立存这张表。
# 读 overview/training 时把状态叠加到报告任务上(未命中用报告里的初始 status)。
#
# 复合主键 (session_id, task_id):mock 模式下多个 session 的 priority_tasks 共用同一组
# task_id(quantify-result 等),必须按 session 隔离,否则跨 session 撞状态。
# ---------------------------------------------------------------------------


class TrainingTaskStatusRow(SQLModel, table=True):
    """单个训练任务在某 session 下的完成状态。主键 (session_id, task_id)。"""

    __tablename__ = "training_task_status"

    session_id: str = Field(primary_key=True)
    task_id: str = Field(primary_key=True)
    status: str  # 未开始 | 进行中 | 已完成

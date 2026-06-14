from typing import Literal

from pydantic import Field

from app.schemas.common import CamelModel

TaskStatus = Literal["未开始", "进行中", "已完成"]
MatchLevel = Literal["高", "较高", "可尝试"]


class ExploreProfile(CamelModel):
    stage: str = "应届毕业生"
    education: str = "本科"
    major: str = "市场营销"
    interests: list[str] = Field(default_factory=lambda: ["产品设计", "沟通表达", "创意策划"])
    work_preferences: list[str] = Field(default_factory=lambda: ["高成长", "强逻辑", "创新感"])
    goal: str = "想知道自己适合什么工作"
    constraints: list[str] = Field(
        default_factory=lambda: ["希望尽快就业", "可接受加班", "可接受从基础岗位开始"]
    )
    experiences: list[str] = Field(default_factory=lambda: ["项目经历", "实习经历"])
    work_types: list[str] = Field(default_factory=lambda: ["做数据分析", "做产品设计", "协调沟通", "研究分析"])
    preferred_states: list[str] = Field(default_factory=lambda: ["团队协作", "沟通表达", "推进项目落地", "创意构思"])
    followups: list[str] = Field(default_factory=list)


class FollowupQuestion(CamelModel):
    id: str
    question: str


# 多轮追问(对话式):每轮把画像 + 已问问答历史发回后端,后端生成下一题或判定结束。
# 状态在前端(无状态后端,符合 P0 进程内架构);history 只活在 followup 屏,不入库。
class FollowupTurn(CamelModel):
    """一轮已问答(问题文本 + 用户回答),作为生成下一题的上下文。"""

    question: str
    answer: str


class FollowupRequest(CamelModel):
    """多轮追问请求:当前画像 + 已问问答历史(首轮 history 为空)。"""

    profile: ExploreProfile
    history: list[FollowupTurn] = Field(default_factory=list)


class FollowupResponse(CamelModel):
    """多轮追问响应:下一题(question)或结束(done=True 且 question 为 None)。"""

    question: FollowupQuestion | None = None
    done: bool = False


class ExploreTask(CamelModel):
    id: str
    title: str
    status: TaskStatus = "未开始"


class JobPortrait(CamelModel):
    daily_work: list[str]
    challenges: list[str]
    abilities: list[str]
    path: str


class DirectionRecommendation(CamelModel):
    id: str
    title: str
    match: MatchLevel
    reason: str
    portrait: JobPortrait
    why_first: list[str]
    abilities_to_build: list[dict[str, str]]
    weekly_tasks: list[ExploreTask]


class ExploreResult(CamelModel):
    conclusion: str
    directions: list[DirectionRecommendation]
    transferable_abilities: list[str]
    not_recommended: list[dict[str, str]]


class SavePathRequest(CamelModel):
    direction_id: str


class CurrentPathResponse(CamelModel):
    direction: DirectionRecommendation | None = None
    tasks: list[ExploreTask] = Field(default_factory=list)

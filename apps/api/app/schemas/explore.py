from typing import Literal

from pydantic import BaseModel, Field

TaskStatus = Literal["未开始", "进行中", "已完成"]
MatchLevel = Literal["高", "较高", "可尝试"]


class ExploreProfile(BaseModel):
    stage: str = "应届毕业生"
    education: str = "本科"
    major: str = "市场营销"
    interests: list[str] = Field(default_factory=lambda: ["产品设计", "沟通表达", "创意策划"])
    work_preferences: list[str] = Field(default_factory=lambda: ["高成长", "强逻辑", "创新感"])
    goal: str = "想知道自己适合什么工作"
    constraints: str = "希望尽快就业，可接受加班，可接受从基础岗位开始"
    experiences: list[str] = Field(default_factory=lambda: ["项目经历", "实习经历"])
    work_types: list[str] = Field(default_factory=lambda: ["做数据分析", "做产品设计", "协调沟通", "研究分析"])
    preferred_states: list[str] = Field(default_factory=lambda: ["团队协作", "沟通表达", "推进项目落地", "创意构思"])
    followups: list[str] = Field(default_factory=list)


class FollowupQuestion(BaseModel):
    id: str
    question: str


class ExploreTask(BaseModel):
    id: str
    title: str
    status: TaskStatus = "未开始"


class JobPortrait(BaseModel):
    daily_work: list[str]
    challenges: list[str]
    abilities: list[str]
    path: str


class DirectionRecommendation(BaseModel):
    id: str
    title: str
    match: MatchLevel
    reason: str
    portrait: JobPortrait
    why_first: list[str]
    abilities_to_build: list[dict[str, str]]
    weekly_tasks: list[ExploreTask]


class ExploreResult(BaseModel):
    conclusion: str
    directions: list[DirectionRecommendation]
    transferable_abilities: list[str]
    not_recommended: list[dict[str, str]]


class SavePathRequest(BaseModel):
    direction_id: str


class CurrentPathResponse(BaseModel):
    direction: DirectionRecommendation | None = None
    tasks: list[ExploreTask] = Field(default_factory=list)

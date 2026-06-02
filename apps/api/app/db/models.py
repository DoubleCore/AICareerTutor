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

from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings

# Local-first: SQLite by default (settings.database_url 锚定 apps/api/career_tutor.db,
# 绝对路径,不随 cwd 漂移)。可被 .env 的 DATABASE_URL 覆盖(smoke 临时库、将来 Postgres)。
# check_same_thread=False:/analyze 的 BackgroundTask 在线程池另一线程写库,必须放开。
engine = create_engine(settings.database_url, echo=False, connect_args={"check_same_thread": False})


def init_db() -> None:
    """Create tables from the SQLModel metadata. Safe to call repeatedly."""
    # Import models so they register on SQLModel.metadata before create_all.
    from app.db import models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    """FastAPI dependency yielding a scoped DB session."""
    with Session(engine) as session:
        yield session

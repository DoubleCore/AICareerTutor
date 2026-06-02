from collections.abc import Iterator
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

# Local-first: a single SQLite file next to the api app. Swapped for Supabase/Postgres later.
DB_PATH = Path(__file__).resolve().parent.parent.parent / "career_tutor.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# check_same_thread=False so FastAPI's threadpool can share the connection pool.
engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})


def init_db() -> None:
    """Create tables from the SQLModel metadata. Safe to call repeatedly."""
    # Import models so they register on SQLModel.metadata before create_all.
    from app.db import models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    """FastAPI dependency yielding a scoped DB session."""
    with Session(engine) as session:
        yield session

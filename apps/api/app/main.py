from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import explore, health, interview, profile
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging import get_logger, setup_logging
from app.db.database import init_db
from app.services import mock_state

setup_logging()
logger = get_logger("app.main")


@asynccontextmanager
async def lifespan(_: FastAPI):
    # P1-08:启动时建表(幂等)并从 DB 回灌 sessionId 计数器(跨重启不撞号)。
    init_db()
    mock_state._seed_session_counter()
    logger.info(
        "%s v%s started (env=%s, cors=%s, db=%s)",
        settings.app_name,
        settings.app_version,
        settings.environment,
        settings.cors_origin_list,
        settings.database_url,
    )
    yield


app = FastAPI(title=settings.app_name, version=settings.app_version, debug=settings.debug, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(health.router)
app.include_router(explore.router, prefix="/explore", tags=["explore"])
app.include_router(interview.router, prefix="/interview", tags=["interview"])
app.include_router(profile.router, prefix="/profile", tags=["profile"])

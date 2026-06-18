from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# apps/api 目录(config.py 在 app/core/ 下,parents[2] 即 apps/api)。
# 数据库默认路径锚定在此,不随进程 cwd 漂移(uvicorn / smoke / pytest 启动目录可能不同)。
_APPS_API_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application configuration loaded from environment variables / .env."""

    # env_file 用绝对路径锚定 apps/api/.env,不随进程 cwd 漂移。
    # npm run api 从仓库根启动(--app-dir apps/api),相对 ".env" 会去根目录找而读不到,
    # 故与 database_url 一样用 _APPS_API_DIR 锚定。
    model_config = SettingsConfigDict(
        env_file=str(_APPS_API_DIR / ".env"), env_file_encoding="utf-8", extra="ignore"
    )

    # App metadata
    app_name: str = "AI Career Tutor API"
    app_version: str = "0.1.0"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = True

    # CORS: comma-separated list of allowed origins, or "*" for all.
    cors_origins: str = "*"

    # Logging
    log_level: str = "INFO"

    # Supabase (wired in a later phase)
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # AI / LLM
    # ai_mode: "mock"(默认,零依赖零密钥,演示/CI 安全) | "real"(走真实模型结构化输出)。
    # real 模式还需配置 ai_api_key;缺 key 或调用失败时 ai_service 会自动回退 mock。
    # ai_provider: real 模式下用哪家 SDK ——
    #   "anthropic":官方 Claude(Anthropic SDK,tool-use)。
    #   "openai":任何 OpenAI 兼容端点(DeepSeek 等),用 openai SDK + function calling;
    #            配合 ai_base_url 指向对应服务(DeepSeek 为 https://api.deepseek.com)。
    ai_mode: Literal["mock", "real"] = "mock"
    ai_provider: Literal["anthropic", "openai"] = "anthropic"
    ai_base_url: str = ""  # 仅 openai provider 用;留空走 openai 官方默认
    ai_model: str = "claude-sonnet-4-6"
    ai_api_key: str = ""
    ai_max_tokens: int = 2000

    # 文件上传 / MP3 转写:单文件大小上限(MB)。/interview/transcribe 据此拒绝超大文件。
    # 真实 ASR(阿里云 Paraformer)接入见 spec mp3-asr-aliyun.md;本轮端点仅桩。
    max_upload_mb: int = 25

    # 账号 / 鉴权(Group B)。jwt_secret 只进 .env,绝不硬编码默认;缺失时 security 层拒绝签发。
    # 字段对齐 Supabase Auth 以便日后迁移(见 spec)。SQLite 锁定不变。
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 天

    # P1-08:数据库连接串。默认本地 SQLite(apps/api/career_tutor.db,绝对路径)。
    # 可被 .env 的 DATABASE_URL 覆盖(如 smoke 用临时库、将来迁 Postgres)。
    database_url: str = f"sqlite:///{(_APPS_API_DIR / 'career_tutor.db').as_posix()}"

    @property
    def cors_origin_list(self) -> list[str]:
        origins = self.cors_origins.strip()
        if origins == "*":
            return ["*"]
        return [origin.strip() for origin in origins.split(",") if origin.strip()]

    @field_validator("log_level")
    @classmethod
    def _normalize_log_level(cls, value: str) -> str:
        return value.upper()


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

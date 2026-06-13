from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables / .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

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

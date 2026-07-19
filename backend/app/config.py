from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent

# Docker Compose already injects the root .env. Loading it here also makes
# `uvicorn app.main:app` behave the same way when run directly from /backend.
load_dotenv(PROJECT_DIR / ".env", override=False)
load_dotenv(BACKEND_DIR / ".env", override=False)


def _as_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _as_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


def _as_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5432/ken_memorial",
    )
    admin_email: str = os.getenv("ADMIN_EMAIL", "admin@kenmemorial.local")
    admin_password: str = os.getenv("ADMIN_PASSWORD", "change-me")
    admin_jwt_secret: str = os.getenv(
        "ADMIN_JWT_SECRET", "change-this-admin-jwt-secret"
    )
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_chat_model: str = os.getenv("OPENAI_CHAT_MODEL", "gpt-5.6-terra")
    openai_embedding_model: str = os.getenv(
        "OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"
    )
    openai_moderation_model: str = os.getenv(
        "OPENAI_MODERATION_MODEL", "omni-moderation-latest"
    )
    ai_chat_enabled: bool = _as_bool("AI_CHAT_ENABLED", False)
    ai_chat_daily_limit: int = _as_int("AI_CHAT_DAILY_LIMIT", 50)
    ai_chat_burst_limit: int = _as_int("AI_CHAT_BURST_LIMIT", 10)
    ai_safety_hmac_secret: str = os.getenv("AI_SAFETY_HMAC_SECRET", "")
    ai_retrieval_threshold: float = _as_float("AI_RETRIEVAL_THRESHOLD", 0.28)
    ai_request_timeout_seconds: int = _as_int("AI_REQUEST_TIMEOUT_SECONDS", 30)
    ai_notice_version: str = os.getenv("AI_NOTICE_VERSION", "2026-07-20")
    ai_consent_policy_version: str = os.getenv(
        "AI_CONSENT_POLICY_VERSION", "2026-07-01"
    )


settings = Settings()

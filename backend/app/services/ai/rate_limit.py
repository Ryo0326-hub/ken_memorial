from __future__ import annotations

import hashlib
import hmac
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.ai import ChatRateEventModel


class RateLimitExceeded(Exception):
    pass


def privacy_hash(value: str) -> str:
    secret = settings.ai_safety_hmac_secret.encode("utf-8")
    return hmac.new(secret, value.encode("utf-8"), hashlib.sha256).hexdigest()


def enforce_rate_limit(db: Session, session_id: str, client_host: str) -> str:
    now = datetime.now(timezone.utc)
    session_key = privacy_hash(f"session:{session_id}")
    network_key = privacy_hash(f"network:{client_host or 'unknown'}")
    burst_since = now - timedelta(minutes=10)
    daily_since = now - timedelta(days=1)

    burst_count = db.scalar(
        select(func.count(ChatRateEventModel.id)).where(
            ChatRateEventModel.rate_key == session_key,
            ChatRateEventModel.scope == "burst",
            ChatRateEventModel.created_at >= burst_since,
        )
    ) or 0
    daily_count = db.scalar(
        select(func.count(ChatRateEventModel.id)).where(
            ChatRateEventModel.rate_key == network_key,
            ChatRateEventModel.scope == "daily",
            ChatRateEventModel.created_at >= daily_since,
        )
    ) or 0
    if burst_count >= settings.ai_chat_burst_limit or daily_count >= settings.ai_chat_daily_limit:
        raise RateLimitExceeded

    db.add_all(
        [
            ChatRateEventModel(rate_key=session_key, scope="burst", created_at=now),
            ChatRateEventModel(rate_key=network_key, scope="daily", created_at=now),
        ]
    )
    db.execute(delete(ChatRateEventModel).where(ChatRateEventModel.created_at < now - timedelta(days=2)))
    db.commit()
    return session_key

from __future__ import annotations

import json
import re
from collections.abc import Iterator

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal, get_db
from app.models.ai import ChatFeedbackModel, ChatGenerationModel, PersonaProfileModel
from app.schemas.chat import (
    AI_MEMORIAL_NOTICE,
    ChatConfig,
    ChatMessageRequest,
    ChatMessageResponse,
    FeedbackCreate,
)
from app.services.ai.chat import create_chat_response
from app.services.ai.persona import get_active_persona
from app.services.ai.rate_limit import RateLimitExceeded, enforce_rate_limit

router = APIRouter(prefix="/ai-chat", tags=["ai-chat"])

STARTER_PROMPTS = [
    "What sports did Ken enjoy?",
    "What kind of friend was Ken?",
    "Where did Ken live and go to school?",
    "Tell me about a memory someone shared about Ken.",
]


def encode_stream_event(event: dict) -> str:
    return json.dumps(
        event,
        ensure_ascii=False,
        separators=(",", ":"),
    ) + "\n"


def iter_answer_chunks(message: str) -> Iterator[str]:
    """Yield complete words while preserving the answer's original spacing."""
    yield from re.findall(r"\S+\s*|\s+", message)


@router.get("/config", response_model=ChatConfig)
def get_chat_config(db: Session = Depends(get_db)) -> ChatConfig:
    active = get_active_persona(db)
    ready = bool(
        settings.ai_chat_enabled
        and settings.openai_api_key
        and settings.ai_safety_hmac_secret
        and active
    )
    return ChatConfig(
        enabled=ready,
        persona_version=active.version if active else None,
        notice_version=settings.ai_notice_version,
        notice=AI_MEMORIAL_NOTICE,
        starter_prompts=STARTER_PROMPTS,
    )


@router.post("/messages", response_model=ChatMessageResponse)
def post_chat_message(
    payload: ChatMessageRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ChatMessageResponse:
    active = get_active_persona(db)
    if not settings.ai_chat_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The memory guide is resting right now. Please visit the tribute wall.",
        )
    if not active or not settings.openai_api_key or not settings.ai_safety_hmac_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The memory guide is not ready yet.",
        )

    try:
        safety_identifier = enforce_rate_limit(
            db,
            payload.session_id,
            request.client.host if request.client else "unknown",
        )
    except RateLimitExceeded as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Let's pause here for a little while. The memory guide has reached its message limit.",
        ) from exc

    try:
        return create_chat_response(db, payload, active, safety_identifier)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The memory guide couldn't reach the approved sources just now. Please try again later.",
        ) from exc


@router.post("/messages/stream")
def post_chat_message_stream(
    payload: ChatMessageRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    active = get_active_persona(db)
    if not settings.ai_chat_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The memory guide is resting right now. Please visit the tribute wall.",
        )
    if not active or not settings.openai_api_key or not settings.ai_safety_hmac_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The memory guide is not ready yet.",
        )

    try:
        safety_identifier = enforce_rate_limit(
            db,
            payload.session_id,
            request.client.host if request.client else "unknown",
        )
    except RateLimitExceeded as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Let's pause here for a little while. The memory guide has reached its message limit.",
        ) from exc

    active_persona_id = active.id

    def event_stream() -> Iterator[str]:
        yield encode_stream_event(
            {
                "type": "status",
                "message": "Looking through Ken's profile and shared memories...",
            }
        )

        try:
            # The stream owns this session; the request-scoped session may close
            # before a long-lived response iterator has finished.
            with SessionLocal() as stream_db:
                stream_persona = stream_db.get(PersonaProfileModel, active_persona_id)
                if stream_persona is None:
                    raise RuntimeError("The active Ken Profile is unavailable")

                result = create_chat_response(
                    stream_db,
                    payload,
                    stream_persona,
                    safety_identifier,
                )

            yield encode_stream_event(
                {
                    "type": "status",
                    "message": "Preparing the answer...",
                }
            )

            # Only release answer text after the existing output moderation,
            # grounding, source, and anti-impersonation checks have passed.
            # Word-aligned events avoid visibly splitting a word in the UI.
            for chunk in iter_answer_chunks(result.message):
                yield encode_stream_event(
                    {
                        "type": "delta",
                        "text": chunk,
                    }
                )

            yield encode_stream_event(
                {
                    "type": "final",
                    "request_id": result.request_id,
                    "grounding_mode": result.grounding_mode.value,
                    "sources": [
                        source.model_dump(mode="json") for source in result.sources
                    ],
                }
            )
        except Exception:
            yield encode_stream_event(
                {
                    "type": "error",
                    "message": (
                        "The memory guide couldn't reach the approved sources "
                        "just now. Please try again later."
                    ),
                }
            )

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/feedback", status_code=201)
def post_chat_feedback(payload: FeedbackCreate, db: Session = Depends(get_db)) -> dict[str, str]:
    generation = db.get(ChatGenerationModel, payload.request_id)
    if generation is None:
        raise HTTPException(status_code=404, detail="Chat response not found")

    feedback = ChatFeedbackModel(
        request_id=generation.request_id,
        rating=payload.rating,
        comment=payload.comment.strip() if payload.comment else None,
        reported_exchange=(
            payload.reported_exchange.model_dump(mode="json")
            if payload.attach_exchange and payload.reported_exchange
            else None
        ),
        source_tribute_ids=generation.source_tribute_ids,
        persona_version=generation.persona_version,
        generation_model=generation.generation_model,
    )
    db.add(feedback)
    db.commit()
    return {"status": "received"}

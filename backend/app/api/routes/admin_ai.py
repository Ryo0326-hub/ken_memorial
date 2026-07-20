from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.ai import ChatFeedbackModel, PersonaProfileModel
from app.schemas.admin import AdminAIIncludeRequest, AdminFeedbackPatch
from app.schemas.chat import Feedback
from app.schemas.persona import PersonaCreate, PersonaPatch, PersonaProfile
from app.schemas.tribute import AIUseStatus, Tribute, TributeStatus, Visibility
from app.security import require_admin
from app.services.ai.memory import remove_memory_chunks, sync_tribute_memory
from app.services.ai.persona import (
    activate_persona,
    create_persona,
    list_personas,
    patch_persona,
)
from app.services.tributes import get_by_id

router = APIRouter(tags=["admin-ai"], dependencies=[Depends(require_admin)])


@router.get("/ai/personas", response_model=list[PersonaProfile])
def get_personas(db: Session = Depends(get_db)) -> list[PersonaProfileModel]:
    return list_personas(db)


@router.post("/ai/personas", response_model=PersonaProfile, status_code=201)
def post_persona(
    payload: PersonaCreate,
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
) -> PersonaProfileModel:
    return create_persona(db, payload, str(admin.get("sub", "admin")))


@router.patch("/ai/personas/{persona_id}", response_model=PersonaProfile)
def update_persona(
    persona_id: str,
    payload: PersonaPatch,
    db: Session = Depends(get_db),
) -> PersonaProfileModel:
    persona = db.get(PersonaProfileModel, persona_id)
    if persona is None:
        raise HTTPException(status_code=404, detail="Ken Profile not found")
    try:
        return patch_persona(db, persona, payload)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/ai/personas/{persona_id}/activate", response_model=PersonaProfile)
def activate_persona_version(
    persona_id: str,
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
) -> PersonaProfileModel:
    persona = db.get(PersonaProfileModel, persona_id)
    if persona is None:
        raise HTTPException(status_code=404, detail="Ken Profile not found")
    return activate_persona(db, persona, str(admin.get("sub", "admin")))


@router.post("/tributes/{tribute_id}/ai-include", response_model=Tribute)
def include_tribute_memory(
    tribute_id: str,
    payload: AdminAIIncludeRequest,
    db: Session = Depends(get_db),
) -> Tribute:
    tribute = get_by_id(db, tribute_id)
    if tribute is None:
        raise HTTPException(status_code=404, detail="Tribute not found")
    tribute.ai_redacted_content = payload.ai_redacted_content.strip()
    tribute.ai_use_status = AIUseStatus.included
    tribute.ai_index_error = None
    db.add(tribute)
    db.commit()
    db.refresh(tribute)
    if not tribute.ai_consent or tribute.ai_consent_basis is None:
        tribute.ai_use_status = AIUseStatus.pending_review if tribute.ai_consent else AIUseStatus.excluded
        db.add(tribute)
        db.commit()
        raise HTTPException(status_code=409, detail="Valid contributor AI consent is required")
    if tribute.status != TributeStatus.approved or tribute.visibility != Visibility.public:
        tribute.ai_use_status = AIUseStatus.pending_review
        db.add(tribute)
        db.commit()
        raise HTTPException(status_code=409, detail="Only approved, public tributes can be included")
    return sync_tribute_memory(db, tribute)


@router.post("/tributes/{tribute_id}/ai-exclude", response_model=Tribute)
def exclude_tribute_memory(tribute_id: str, db: Session = Depends(get_db)) -> Tribute:
    tribute = get_by_id(db, tribute_id)
    if tribute is None:
        raise HTTPException(status_code=404, detail="Tribute not found")
    tribute.ai_use_status = AIUseStatus.excluded
    remove_memory_chunks(db, tribute)
    db.refresh(tribute)
    return tribute


@router.post("/tributes/{tribute_id}/ai-reindex", response_model=Tribute)
def reindex_tribute_memory(tribute_id: str, db: Session = Depends(get_db)) -> Tribute:
    tribute = get_by_id(db, tribute_id)
    if tribute is None:
        raise HTTPException(status_code=404, detail="Tribute not found")
    if not tribute.ai_consent or tribute.ai_consent_basis is None:
        raise HTTPException(status_code=409, detail="Valid contributor AI consent is required")
    if tribute.status != TributeStatus.approved or tribute.visibility != Visibility.public:
        raise HTTPException(status_code=409, detail="Only approved, public tributes can be indexed")
    if not (tribute.ai_redacted_content or "").strip():
        raise HTTPException(status_code=409, detail="Sanitized AI memory text is required")
    tribute.ai_use_status = AIUseStatus.included
    return sync_tribute_memory(db, tribute)


@router.get("/ai/feedback", response_model=list[Feedback])
def get_feedback(db: Session = Depends(get_db)) -> list[ChatFeedbackModel]:
    return list(db.scalars(select(ChatFeedbackModel).order_by(ChatFeedbackModel.created_at.desc())))


@router.patch("/ai/feedback/{feedback_id}", response_model=Feedback)
def update_feedback(
    feedback_id: str,
    payload: AdminFeedbackPatch,
    db: Session = Depends(get_db),
) -> ChatFeedbackModel:
    feedback = db.get(ChatFeedbackModel, feedback_id)
    if feedback is None:
        raise HTTPException(status_code=404, detail="Feedback not found")
    feedback.reviewed_at = datetime.now(timezone.utc) if payload.reviewed else None
    feedback.resolution_notes = (
        payload.resolution_notes.strip() if payload.resolution_notes else None
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback

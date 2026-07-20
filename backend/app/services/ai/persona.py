from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models.ai import PersonaProfileModel
from app.schemas.persona import PersonaCreate, PersonaPatch, PersonaStatus


def list_personas(db: Session) -> list[PersonaProfileModel]:
    return list(db.scalars(select(PersonaProfileModel).order_by(PersonaProfileModel.version.desc())))


def get_active_persona(db: Session) -> PersonaProfileModel | None:
    return db.scalars(
        select(PersonaProfileModel).where(PersonaProfileModel.status == PersonaStatus.active)
    ).first()


def create_persona(db: Session, payload: PersonaCreate, created_by: str) -> PersonaProfileModel:
    next_version = (db.scalar(select(func.max(PersonaProfileModel.version))) or 0) + 1
    persona = PersonaProfileModel(
        version=next_version,
        status=PersonaStatus.draft,
        profile=payload.profile.model_dump(mode="json"),
        change_note=payload.change_note.strip(),
        created_by=created_by,
    )
    db.add(persona)
    db.commit()
    db.refresh(persona)
    return persona


def patch_persona(
    db: Session, persona: PersonaProfileModel, payload: PersonaPatch
) -> PersonaProfileModel:
    if persona.status != PersonaStatus.draft:
        raise ValueError("Active or archived Ken Profile versions are immutable; create a new draft instead")
    if payload.profile is not None:
        persona.profile = payload.profile.model_dump(mode="json")
    if payload.change_note is not None:
        persona.change_note = payload.change_note.strip()
    persona.updated_at = datetime.now(timezone.utc)
    db.add(persona)
    db.commit()
    db.refresh(persona)
    return persona


def activate_persona(
    db: Session, persona: PersonaProfileModel, activated_by: str
) -> PersonaProfileModel:
    now = datetime.now(timezone.utc)
    db.execute(
        update(PersonaProfileModel)
        .where(
            PersonaProfileModel.status == PersonaStatus.active,
            PersonaProfileModel.id != persona.id,
        )
        .values(status=PersonaStatus.archived, updated_at=now)
    )
    persona.status = PersonaStatus.active
    persona.activated_by = activated_by
    persona.activated_at = now
    persona.updated_at = now
    db.add(persona)
    db.commit()
    db.refresh(persona)
    return persona

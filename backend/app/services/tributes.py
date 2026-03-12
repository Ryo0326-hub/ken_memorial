from datetime import datetime

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models.tribute import TributeModel
from app.schemas.tribute import DisplayMode, SubmissionCreate, TributeStatus


def create_submission(db: Session, payload: SubmissionCreate) -> TributeModel:
    display_name = payload.submitted_name.strip() if payload.submitted_name else "Anonymous"
    if payload.display_mode == DisplayMode.anonymous:
        display_name = "Anonymous"

    tribute = TributeModel(
        type=payload.type,
        content=payload.content.strip(),
        submitted_name=payload.submitted_name.strip() if payload.submitted_name else None,
        display_mode=payload.display_mode,
        public_display_name=display_name,
        status=TributeStatus.pending,
    )

    db.add(tribute)
    db.commit()
    db.refresh(tribute)
    return tribute


def list_public_tributes(db: Session) -> list[TributeModel]:
    query: Select[tuple[TributeModel]] = (
        select(TributeModel)
        .where(TributeModel.status == TributeStatus.approved)
        .order_by(TributeModel.is_featured.desc(), TributeModel.submitted_at.desc())
    )
    return list(db.scalars(query).all())


def list_tributes_by_status(db: Session, status: TributeStatus) -> list[TributeModel]:
    query: Select[tuple[TributeModel]] = (
        select(TributeModel)
        .where(TributeModel.status == status)
        .order_by(TributeModel.submitted_at.asc())
    )
    return list(db.scalars(query).all())


def get_by_id(db: Session, tribute_id: str) -> TributeModel | None:
    query: Select[tuple[TributeModel]] = select(TributeModel).where(TributeModel.id == tribute_id)
    return db.scalars(query).first()


def set_status(db: Session, tribute: TributeModel, status: TributeStatus) -> TributeModel:
    tribute.status = status
    tribute.reviewed_at = datetime.utcnow()
    if status == TributeStatus.approved:
        tribute.published_at = datetime.utcnow()
    db.add(tribute)
    db.commit()
    db.refresh(tribute)
    return tribute

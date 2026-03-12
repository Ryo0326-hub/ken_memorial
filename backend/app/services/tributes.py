from datetime import datetime

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models.tribute import TributeModel
from app.schemas.tribute import DisplayMode, SubmissionCreate, TributeStatus, TributeType


def create_submission(db: Session, payload: SubmissionCreate) -> TributeModel:
    display_name = payload.submitted_name.strip() if payload.submitted_name else "Anonymous"
    if payload.display_mode == DisplayMode.anonymous:
        display_name = "Anonymous"

    tribute = TributeModel(
        type=payload.type,
        title=payload.title.strip() if payload.title else None,
        content=payload.content.strip(),
        submitted_name=payload.submitted_name.strip() if payload.submitted_name else None,
        display_mode=payload.display_mode,
        relationship_to_ken=(
            payload.relationship_to_ken.strip() if payload.relationship_to_ken else None
        ),
        year_tag=payload.year_tag,
        occasion_date=payload.occasion_date,
        public_display_name=display_name,
        status=TributeStatus.pending,
    )

    db.add(tribute)
    db.commit()
    db.refresh(tribute)
    return tribute


def list_public_tributes(
    db: Session,
    tribute_type: TributeType | None = None,
    year_tag: int | None = None,
    author_visibility: DisplayMode | None = None,
    featured_only: bool = False,
) -> list[TributeModel]:
    query: Select[tuple[TributeModel]] = select(TributeModel).where(
        TributeModel.status == TributeStatus.approved
    )

    if tribute_type:
        query = query.where(TributeModel.type == tribute_type)
    if year_tag:
        query = query.where(TributeModel.year_tag == year_tag)
    if author_visibility:
        query = query.where(TributeModel.display_mode == author_visibility)
    if featured_only:
        query = query.where(TributeModel.is_featured.is_(True))

    query = query.order_by(TributeModel.is_featured.desc(), TributeModel.submitted_at.desc())
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


def get_public_by_id(db: Session, tribute_id: str) -> TributeModel | None:
    query: Select[tuple[TributeModel]] = select(TributeModel).where(
        TributeModel.id == tribute_id, TributeModel.status == TributeStatus.approved
    )
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


def set_featured(db: Session, tribute: TributeModel, is_featured: bool) -> TributeModel:
    tribute.is_featured = is_featured
    db.add(tribute)
    db.commit()
    db.refresh(tribute)
    return tribute

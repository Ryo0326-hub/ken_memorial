from datetime import datetime

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models.tribute import TributeModel
from app.schemas.admin import AdminTributePatch
from app.schemas.tribute import (
    DisplayMode,
    SubmissionCreate,
    TributeStatus,
    TributeType,
    Visibility,
)


def create_submission(db: Session, payload: SubmissionCreate) -> TributeModel:
    if payload.display_mode == DisplayMode.anonymous:
        display_name = "Anonymous"
    else:
        display_name = payload.submitted_name.strip() if payload.submitted_name else "A Friend"

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
        image_data_url=payload.image_data_url,
        public_display_name=display_name,
        status=TributeStatus.pending,
        visibility=Visibility.public,
    )

    db.add(tribute)
    db.commit()
    db.refresh(tribute)
    return tribute


def list_public_tributes(
    db: Session,
    tribute_type: TributeType | None = None,
    year_tag: int | None = None,
    anonymous: bool | None = None,
    featured_only: bool = False,
    page: int = 1,
    page_size: int = 20,
) -> list[TributeModel]:
    page = max(1, page)
    page_size = min(max(1, page_size), 100)

    query: Select[tuple[TributeModel]] = select(TributeModel).where(
        TributeModel.status == TributeStatus.approved,
        TributeModel.visibility == Visibility.public,
    )

    if tribute_type:
        query = query.where(TributeModel.type == tribute_type)
    if year_tag:
        query = query.where(TributeModel.year_tag == year_tag)
    if anonymous is not None:
        mode = DisplayMode.anonymous if anonymous else DisplayMode.named
        query = query.where(TributeModel.display_mode == mode)
    if featured_only:
        query = query.where(TributeModel.is_featured.is_(True))

    query = query.order_by(TributeModel.is_featured.desc(), TributeModel.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    return list(db.scalars(query).all())


def list_tributes_by_status(
    db: Session,
    status: TributeStatus | None = None,
    page: int = 1,
    page_size: int = 50,
) -> list[TributeModel]:
    page = max(1, page)
    page_size = min(max(1, page_size), 100)

    query: Select[tuple[TributeModel]] = select(TributeModel)
    if status:
        query = query.where(TributeModel.status == status)

    query = query.order_by(TributeModel.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    return list(db.scalars(query).all())


def get_by_id(db: Session, tribute_id: str) -> TributeModel | None:
    query: Select[tuple[TributeModel]] = select(TributeModel).where(TributeModel.id == tribute_id)
    return db.scalars(query).first()


def get_public_by_id(db: Session, tribute_id: str) -> TributeModel | None:
    query: Select[tuple[TributeModel]] = select(TributeModel).where(
        TributeModel.id == tribute_id,
        TributeModel.status == TributeStatus.approved,
        TributeModel.visibility == Visibility.public,
    )
    return db.scalars(query).first()


def set_status(db: Session, tribute: TributeModel, status: TributeStatus) -> TributeModel:
    tribute.status = status
    tribute.reviewed_at = datetime.utcnow()
    if status == TributeStatus.approved:
        now = datetime.utcnow()
        tribute.published_at = now
        tribute.approved_at = now
    tribute.updated_at = datetime.utcnow()

    db.add(tribute)
    db.commit()
    db.refresh(tribute)
    return tribute


def set_featured(db: Session, tribute: TributeModel, is_featured: bool) -> TributeModel:
    tribute.is_featured = is_featured
    tribute.updated_at = datetime.utcnow()
    db.add(tribute)
    db.commit()
    db.refresh(tribute)
    return tribute


def apply_admin_patch(db: Session, tribute: TributeModel, payload: AdminTributePatch) -> TributeModel:
    if payload.title is not None:
        tribute.title = payload.title.strip() or None
    if payload.content is not None:
        tribute.content = payload.content.strip()
    if payload.relationship_to_ken is not None:
        tribute.relationship_to_ken = payload.relationship_to_ken.strip() or None
    if payload.year_tag is not None:
        tribute.year_tag = payload.year_tag

    # `occasion_date` needs explicit update even when null is intended.
    if "occasion_date" in payload.model_fields_set:
        tribute.occasion_date = payload.occasion_date
    if "image_data_url" in payload.model_fields_set:
        tribute.image_data_url = payload.image_data_url

    if payload.moderation_notes is not None:
        tribute.moderation_notes = payload.moderation_notes.strip() or None
    if payload.visibility is not None:
        tribute.visibility = payload.visibility
    if payload.featured is not None:
        tribute.is_featured = payload.featured
    if payload.moderation_status is not None:
        tribute.status = payload.moderation_status
        tribute.reviewed_at = datetime.utcnow()
        if payload.moderation_status == TributeStatus.approved:
            now = datetime.utcnow()
            tribute.published_at = now
            tribute.approved_at = now

    tribute.updated_at = datetime.utcnow()

    db.add(tribute)
    db.commit()
    db.refresh(tribute)
    return tribute

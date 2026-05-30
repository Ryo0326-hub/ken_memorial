import base64
import binascii
from datetime import datetime
from typing import Any

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
        sticky_note_color=payload.sticky_note_color,
        pen_style=payload.pen_style,
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
    include_images: bool = True,
) -> list[TributeModel | dict[str, Any]]:
    page = max(1, page)
    page_size = min(max(1, page_size), 100)

    filters = [
        TributeModel.status == TributeStatus.approved,
        TributeModel.visibility == Visibility.public,
    ]

    if tribute_type:
        filters.append(TributeModel.type == tribute_type)
    if year_tag:
        filters.append(TributeModel.year_tag == year_tag)
    if anonymous is not None:
        mode = DisplayMode.anonymous if anonymous else DisplayMode.named
        filters.append(TributeModel.display_mode == mode)
    if featured_only:
        filters.append(TributeModel.is_featured.is_(True))

    if include_images:
        query: Select[tuple[TributeModel]] = select(TributeModel).where(*filters)
        query = query.order_by(TributeModel.is_featured.desc(), TributeModel.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        return list(db.scalars(query).all())

    query = select(
        TributeModel.id,
        TributeModel.type,
        TributeModel.title,
        TributeModel.content,
        TributeModel.display_mode,
        TributeModel.submitted_name,
        TributeModel.relationship_to_ken,
        TributeModel.year_tag,
        TributeModel.occasion_date,
        TributeModel.sticky_note_color,
        TributeModel.pen_style,
        TributeModel.public_display_name,
        TributeModel.status,
        TributeModel.visibility,
        TributeModel.moderation_notes,
        TributeModel.submitted_at,
        TributeModel.is_featured,
        TributeModel.created_at,
        TributeModel.updated_at,
        TributeModel.approved_at,
        TributeModel.image_data_url.is_not(None).label("has_image"),
    ).where(*filters)
    query = query.order_by(TributeModel.is_featured.desc(), TributeModel.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    rows = db.execute(query).mappings().all()
    tributes: list[dict[str, Any]] = []
    for row in rows:
        tribute = dict(row)
        tribute["image_data_url"] = None
        tributes.append(tribute)
    return tributes


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


def get_public_image_data(db: Session, tribute_id: str) -> tuple[str, bytes] | None:
    query = select(TributeModel.image_data_url).where(
        TributeModel.id == tribute_id,
        TributeModel.status == TributeStatus.approved,
        TributeModel.visibility == Visibility.public,
    )
    image_data_url = db.scalars(query).first()
    if not image_data_url:
        return None
    return decode_image_data_url(image_data_url)


def decode_image_data_url(image_data_url: str) -> tuple[str, bytes] | None:
    if not image_data_url.startswith("data:image/") or ";base64," not in image_data_url:
        return None

    header, encoded = image_data_url.split(",", 1)
    media_type = header[5:].split(";")[0]
    if media_type not in {"image/jpeg", "image/png", "image/webp"}:
        return None

    try:
        return media_type, base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        return None


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

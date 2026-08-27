from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes.public import get_tribute_detail, get_tributes
from app.db import Base
from app.schemas.admin import AdminTributePatch
from app.schemas.tribute import (
    DisplayMode,
    PaperTheme,
    SubmissionCreate,
    PublicTribute,
    TributeStatus,
    TributeType,
)
from app.services.tributes import apply_admin_patch, create_submission, set_status


def make_session() -> tuple[Session, object]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, class_=Session)
    return factory(), engine


def memory_payload() -> SubmissionCreate:
    return SubmissionCreate(
        type=TributeType.memory_recollection,
        content="Ken and I once stayed late talking while the evening light faded.",
        display_mode=DisplayMode.named,
        submitted_name="Ryo",
        paper_theme=PaperTheme.wildflower_corners,
        decorations=[
            {
                "instance_id": "daisy-1",
                "asset": "daisy",
                "x": 0.12,
                "y": 0.18,
                "scale": 1,
                "rotation": -8,
            }
        ],
    )


def test_memory_style_round_trips_through_public_list_without_image_data() -> None:
    db, engine = make_session()
    try:
        tribute = set_status(db, create_submission(db, memory_payload()), TributeStatus.approved)
        rows = get_tributes(
            type="memory_recollection",
            year=None,
            featured=False,
            anonymous=None,
            page=1,
            page_size=20,
            include_images=False,
            db=db,
        )

        public_list_item = PublicTribute.model_validate(rows[0])
        public_detail = PublicTribute.model_validate(get_tribute_detail(tribute.id, db=db))
        assert public_list_item.id == tribute.id
        assert public_list_item.paper_theme == PaperTheme.wildflower_corners
        assert public_list_item.decorations[0].asset.value == "daisy"
        assert public_list_item.image_data_url is None
        assert public_detail.paper_theme == public_list_item.paper_theme
        assert public_detail.decorations == public_list_item.decorations
    finally:
        db.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_public_legacy_filter_aliases_both_select_messages() -> None:
    db, engine = make_session()
    try:
        message = create_submission(
            db,
            SubmissionCreate(
                type=TributeType.message,
                content="A thoughtful message for Ken that is long enough.",
                display_mode=DisplayMode.anonymous,
            ),
        )
        set_status(db, message, TributeStatus.approved)
        for legacy_type in ("birthday", "yearly_letter"):
            rows = get_tributes(
                type=legacy_type,
                year=None,
                featured=False,
                anonymous=None,
                page=1,
                page_size=20,
                include_images=True,
                db=db,
            )
            assert [row.id for row in rows] == [message.id]
    finally:
        db.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_admin_can_change_theme_and_remove_decorations() -> None:
    db, engine = make_session()
    try:
        tribute = create_submission(db, memory_payload())
        updated = apply_admin_patch(
            db,
            tribute,
            AdminTributePatch(paper_theme=PaperTheme.lavender_edge, decorations=[]),
        )

        assert updated.paper_theme == PaperTheme.lavender_edge
        assert updated.decorations == []
    finally:
        db.close()
        Base.metadata.drop_all(engine)
        engine.dispose()

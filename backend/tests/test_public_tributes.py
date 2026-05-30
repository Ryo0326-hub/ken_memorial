import base64
import inspect
import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes import public
from app.db import Base
from app.models.tribute import TributeModel
from app.schemas.tribute import (
    DisplayMode,
    PenStyle,
    StickyNoteColor,
    Tribute,
    TributeStatus,
    TributeType,
    Visibility,
)


class PublicTributePerformanceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(
            bind=self.engine,
            autoflush=False,
            autocommit=False,
            class_=Session,
        )

    def tearDown(self) -> None:
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def create_public_tribute(self, image_data_url: str | None = None) -> str:
        with self.session_factory() as db:
            tribute = TributeModel(
                type=TributeType.birthday,
                title="A bright memory",
                content="A warm birthday memory that is long enough to pass validation.",
                display_mode=DisplayMode.named,
                submitted_name="Ryo",
                public_display_name="Ryo",
                sticky_note_color=StickyNoteColor.mint,
                pen_style=PenStyle.classic,
                status=TributeStatus.approved,
                visibility=Visibility.public,
                image_data_url=image_data_url,
            )
            db.add(tribute)
            db.commit()
            db.refresh(tribute)
            return tribute.id

    def test_public_list_can_skip_embedded_image_data(self) -> None:
        large_image_data_url = make_image_data_url(b"x" * 40_000)
        self.create_public_tribute(image_data_url=large_image_data_url)

        self.assertIn("include_images", inspect.signature(public.get_tributes).parameters)
        with self.session_factory() as db:
            payload = [
                Tribute.model_validate(tribute).model_dump(mode="json")
                for tribute in public.get_tributes(include_images=False, db=db)
            ]

        self.assertEqual(len(payload), 1)
        self.assertIsNone(payload[0]["image_data_url"])
        self.assertTrue(payload[0]["has_image"])
        self.assertNotIn(large_image_data_url, str(payload))

    def test_public_tribute_image_endpoint_streams_image_bytes(self) -> None:
        image_bytes = b"tribute-image-bytes"
        tribute_id = self.create_public_tribute(image_data_url=make_image_data_url(image_bytes))

        image_endpoint = getattr(public, "get_tribute_image", None)
        self.assertTrue(callable(image_endpoint))
        with self.session_factory() as db:
            response = image_endpoint(tribute_id, db=db)

        self.assertEqual(response.media_type, "image/png")
        self.assertEqual(response.body, image_bytes)


def make_image_data_url(raw: bytes) -> str:
    return f"data:image/png;base64,{base64.b64encode(raw).decode('ascii')}"

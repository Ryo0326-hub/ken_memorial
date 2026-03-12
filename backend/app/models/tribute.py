from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import Boolean, Date, DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.schemas.tribute import (
    DisplayMode,
    PenStyle,
    StickyNoteColor,
    TributeStatus,
    TributeType,
    Visibility,
)


class TributeModel(Base):
    __tablename__ = "tributes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    type: Mapped[TributeType] = mapped_column(
        Enum(TributeType, name="tribute_type", native_enum=False), nullable=False
    )
    title: Mapped[str | None] = mapped_column(String(140), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    submitted_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    display_mode: Mapped[DisplayMode] = mapped_column(
        Enum(DisplayMode, name="display_mode", native_enum=False), nullable=False
    )
    relationship_to_ken: Mapped[str | None] = mapped_column(String(80), nullable=True)
    year_tag: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    occasion_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    image_data_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    sticky_note_color: Mapped[StickyNoteColor] = mapped_column(
        Enum(StickyNoteColor, name="sticky_note_color", native_enum=False),
        nullable=False,
        default=StickyNoteColor.sunshine,
    )
    pen_style: Mapped[PenStyle] = mapped_column(
        Enum(PenStyle, name="pen_style", native_enum=False),
        nullable=False,
        default=PenStyle.classic,
    )
    public_display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    visibility: Mapped[Visibility] = mapped_column(
        Enum(Visibility, name="tribute_visibility", native_enum=False),
        nullable=False,
        default=Visibility.public,
    )
    status: Mapped[TributeStatus] = mapped_column(
        Enum(TributeStatus, name="tribute_status", native_enum=False),
        nullable=False,
        default=TributeStatus.pending,
    )
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    moderation_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

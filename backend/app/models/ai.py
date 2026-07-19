from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.schemas.chat import FeedbackRating
from app.schemas.persona import PersonaStatus


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class PersonaProfileModel(Base):
    __tablename__ = "persona_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    version: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    status: Mapped[PersonaStatus] = mapped_column(
        Enum(PersonaStatus, name="persona_status", native_enum=False), nullable=False
    )
    profile: Mapped[dict] = mapped_column(JSON, nullable=False)
    change_note: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[str] = mapped_column(String(200), nullable=False)
    activated_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class MemoryChunkModel(Base):
    __tablename__ = "memory_chunks"
    __table_args__ = (
        UniqueConstraint(
            "tribute_id", "chunk_index", "content_hash", "embedding_model",
            name="uq_memory_chunk_content_model",
        ),
        Index("ix_memory_chunks_tribute", "tribute_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tribute_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tributes.id", ondelete="CASCADE"), nullable=False
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(1536), nullable=False)
    embedding_model: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    tribute = relationship("TributeModel")


class ChatGenerationModel(Base):
    __tablename__ = "chat_generations"

    request_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    source_tribute_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    persona_version: Mapped[int] = mapped_column(Integer, nullable=False)
    generation_model: Mapped[str] = mapped_column(String(100), nullable=False)
    grounding_mode: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class ChatFeedbackModel(Base):
    __tablename__ = "chat_feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    request_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("chat_generations.request_id", ondelete="CASCADE"), nullable=False
    )
    rating: Mapped[FeedbackRating] = mapped_column(
        Enum(FeedbackRating, name="feedback_rating", native_enum=False), nullable=False
    )
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    reported_exchange: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    source_tribute_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    persona_version: Mapped[int] = mapped_column(Integer, nullable=False)
    generation_model: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class ChatRateEventModel(Base):
    __tablename__ = "chat_rate_events"
    __table_args__ = (Index("ix_chat_rate_events_key_created", "rate_key", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    rate_key: Mapped[str] = mapped_column(String(64), nullable=False)
    scope: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

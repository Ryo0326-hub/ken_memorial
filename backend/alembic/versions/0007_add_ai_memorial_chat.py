"""add governed AI memorial chat data model

Revision ID: 0007_ai_memorial_chat
Revises: 0006_public_wall_index
Create Date: 2026-07-19 00:00:00.000000
"""

from collections.abc import Sequence
import json

from alembic import op
from pgvector.sqlalchemy import Vector
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0007_ai_memorial_chat"
down_revision: str | None = "0006_public_wall_index"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


EMPTY_PROFILE = {
    "identity_and_life_context": [],
    "voice_and_speaking_style": [],
    "vocabulary_expressions_languages": [],
    "values": [],
    "strengths": [],
    "weaknesses_and_imperfections": [],
    "habits_and_mannerisms": [],
    "hobbies_and_interests": [],
    "humor_style": [],
    "relationships": [],
    "important_places_and_periods": [],
    "known_sayings": [],
    "insufficient_evidence_topics": [],
    "hard_boundaries": [],
    "example_responses": [],
    "counterexamples": [],
}


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.add_column(
        "tributes", sa.Column("ai_consent", sa.Boolean(), nullable=False, server_default=sa.false())
    )
    op.add_column("tributes", sa.Column("ai_consent_policy_version", sa.String(length=40)))
    op.add_column("tributes", sa.Column("ai_consent_at", sa.DateTime(timezone=True)))
    op.add_column(
        "tributes",
        sa.Column(
            "ai_consent_basis",
            sa.Enum(
                "submitter_opt_in", "contributor_confirmed", "owner_authored",
                name="ai_consent_basis", native_enum=False,
            ),
        ),
    )
    op.add_column(
        "tributes",
        sa.Column(
            "ai_use_status",
            sa.Enum(
                "excluded", "pending_review", "included", "index_error",
                name="ai_use_status", native_enum=False,
            ),
            nullable=False,
            server_default="excluded",
        ),
    )
    op.add_column("tributes", sa.Column("ai_redacted_content", sa.Text()))
    op.add_column("tributes", sa.Column("ai_indexed_at", sa.DateTime(timezone=True)))
    op.add_column("tributes", sa.Column("ai_index_error", sa.Text()))

    op.create_table(
        "persona_profiles",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("version", sa.Integer(), nullable=False, unique=True),
        sa.Column(
            "status",
            sa.Enum("draft", "active", "archived", name="persona_status", native_enum=False),
            nullable=False,
        ),
        sa.Column("profile", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("change_note", sa.Text(), nullable=False),
        sa.Column("created_by", sa.String(length=200), nullable=False),
        sa.Column("activated_by", sa.String(length=200)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("activated_at", sa.DateTime(timezone=True)),
    )
    op.create_index(
        "uq_persona_one_active",
        "persona_profiles",
        ["status"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )

    op.create_table(
        "memory_chunks",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("tribute_id", sa.String(length=36), sa.ForeignKey("tributes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("embedding", Vector(1536), nullable=False),
        sa.Column("embedding_model", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint(
            "tribute_id", "chunk_index", "content_hash", "embedding_model",
            name="uq_memory_chunk_content_model",
        ),
    )
    op.create_index("ix_memory_chunks_tribute", "memory_chunks", ["tribute_id"])
    op.execute(
        "CREATE INDEX ix_memory_chunks_embedding_hnsw ON memory_chunks "
        "USING hnsw (embedding vector_cosine_ops)"
    )

    op.create_table(
        "chat_generations",
        sa.Column("request_id", sa.String(length=36), primary_key=True),
        sa.Column("source_tribute_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("persona_version", sa.Integer(), nullable=False),
        sa.Column("generation_model", sa.String(length=100), nullable=False),
        sa.Column("grounding_mode", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "chat_feedback",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("request_id", sa.String(length=36), sa.ForeignKey("chat_generations.request_id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "rating",
            sa.Enum(
                "helpful", "inaccurate", "inappropriate", "too_personal",
                name="feedback_rating", native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("comment", sa.Text()),
        sa.Column("reported_exchange", postgresql.JSONB(astext_type=sa.Text())),
        sa.Column("source_tribute_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("persona_version", sa.Integer(), nullable=False),
        sa.Column("generation_model", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("resolution_notes", sa.Text()),
    )
    op.create_table(
        "chat_rate_events",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("rate_key", sa.String(length=64), nullable=False),
        sa.Column("scope", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_chat_rate_events_key_created", "chat_rate_events", ["rate_key", "created_at"])

    op.execute(
        sa.text(
            "INSERT INTO persona_profiles "
            "(id, version, status, profile, change_note, created_by) "
            "VALUES (:id, 1, 'draft', CAST(:profile AS jsonb), :note, :creator)"
        ).bindparams(
            id="00000000-0000-0000-0000-000000000001",
            profile=json.dumps(EMPTY_PROFILE),
            note="Inactive structured placeholder. Complete and approve before activation.",
            creator="migration",
        )
    )


def downgrade() -> None:
    op.drop_index("ix_chat_rate_events_key_created", table_name="chat_rate_events")
    op.drop_table("chat_rate_events")
    op.drop_table("chat_feedback")
    op.drop_table("chat_generations")
    op.execute("DROP INDEX IF EXISTS ix_memory_chunks_embedding_hnsw")
    op.drop_index("ix_memory_chunks_tribute", table_name="memory_chunks")
    op.drop_table("memory_chunks")
    op.drop_index("uq_persona_one_active", table_name="persona_profiles")
    op.drop_table("persona_profiles")

    op.drop_column("tributes", "ai_index_error")
    op.drop_column("tributes", "ai_indexed_at")
    op.drop_column("tributes", "ai_redacted_content")
    op.drop_column("tributes", "ai_use_status")
    op.drop_column("tributes", "ai_consent_basis")
    op.drop_column("tributes", "ai_consent_at")
    op.drop_column("tributes", "ai_consent_policy_version")
    op.drop_column("tributes", "ai_consent")

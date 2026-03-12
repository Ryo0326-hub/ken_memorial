"""create tributes table

Revision ID: 0001_create_tributes
Revises: 
Create Date: 2026-03-12 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0001_create_tributes"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "tributes",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("type", sa.Enum("birthday", "yearly_letter", name="tribute_type", native_enum=False), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("submitted_name", sa.String(length=100), nullable=True),
        sa.Column("display_mode", sa.Enum("named", "anonymous", name="display_mode", native_enum=False), nullable=False),
        sa.Column("public_display_name", sa.String(length=100), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "approved", "rejected", "hidden", name="tribute_status", native_enum=False),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("moderation_notes", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("tributes")

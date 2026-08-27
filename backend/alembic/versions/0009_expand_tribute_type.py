"""expand tribute type storage for memory recollections

Revision ID: 0009_expand_tribute_type
Revises: 0008_message_memory
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0009_expand_tribute_type"
down_revision: str | None = "0008_message_memory"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "tributes",
        "type",
        existing_type=sa.String(length=13),
        type_=sa.String(length=32),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.execute("UPDATE tributes SET type = 'message' WHERE type = 'memory_recollection'")
    op.alter_column(
        "tributes",
        "type",
        existing_type=sa.String(length=32),
        type_=sa.String(length=13),
        existing_nullable=False,
    )

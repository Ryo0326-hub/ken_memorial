"""add public tribute wall index

Revision ID: 0006_public_wall_index
Revises: 0005_merge_tribute_heads
Create Date: 2026-05-30 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op


revision: str = "0006_public_wall_index"
down_revision: str | None = "0005_merge_tribute_heads"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "ix_tributes_public_wall",
        "tributes",
        ["status", "visibility", "is_featured", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_tributes_public_wall", table_name="tributes")

"""add visibility and audit fields

Revision ID: 0003_visibility_audit
Revises: 0002_add_extended_tribute_fields
Create Date: 2026-03-12 05:10:00.000000

"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0003_visibility_audit"
down_revision: str | None = "0002_add_extended_tribute_fields"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "tributes",
        sa.Column(
            "visibility",
            sa.Enum("public", "private", name="tribute_visibility", native_enum=False),
            nullable=False,
            server_default="public",
        ),
    )
    op.add_column(
        "tributes",
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.add_column(
        "tributes",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.add_column("tributes", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))

    op.execute("UPDATE tributes SET created_at = submitted_at WHERE created_at IS NULL")
    op.execute("UPDATE tributes SET updated_at = submitted_at WHERE updated_at IS NULL")
    op.execute("UPDATE tributes SET approved_at = published_at WHERE approved_at IS NULL")


def downgrade() -> None:
    op.drop_column("tributes", "approved_at")
    op.drop_column("tributes", "updated_at")
    op.drop_column("tributes", "created_at")
    op.drop_column("tributes", "visibility")

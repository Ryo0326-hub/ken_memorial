"""add optional tribute image data

Revision ID: 0004_image_data
Revises: 0003_visibility_audit
Create Date: 2026-03-12 06:05:00.000000

"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0004_image_data"
down_revision: str | None = "0003_visibility_audit"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tributes", sa.Column("image_data_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("tributes", "image_data_url")

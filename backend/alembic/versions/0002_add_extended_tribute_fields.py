"""add extended tribute fields

Revision ID: 0002_add_extended_tribute_fields
Revises: 0001_create_tributes
Create Date: 2026-03-12 00:30:00.000000

"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0002_add_extended_tribute_fields"
down_revision: str | None = "0001_create_tributes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tributes", sa.Column("title", sa.String(length=140), nullable=True))
    op.add_column("tributes", sa.Column("relationship_to_ken", sa.String(length=80), nullable=True))
    op.add_column("tributes", sa.Column("year_tag", sa.Integer(), nullable=True))
    op.add_column("tributes", sa.Column("occasion_date", sa.Date(), nullable=True))
    op.create_index(op.f("ix_tributes_year_tag"), "tributes", ["year_tag"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_tributes_year_tag"), table_name="tributes")
    op.drop_column("tributes", "occasion_date")
    op.drop_column("tributes", "year_tag")
    op.drop_column("tributes", "relationship_to_ken")
    op.drop_column("tributes", "title")

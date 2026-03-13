"""add sticky note color and pen style

Revision ID: 0003_sticky_pen_style
Revises: 0002_add_extended_tribute_fields
Create Date: 2026-03-12 01:05:00.000000

"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0003_sticky_pen_style"
down_revision: str | None = "0002_add_extended_tribute_fields"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "tributes",
        sa.Column(
            "sticky_note_color",
            sa.Enum(
                "sunshine",
                "sky",
                "blossom",
                "mint",
                "lavender",
                name="sticky_note_color",
                native_enum=False,
            ),
            nullable=False,
            server_default="sunshine",
        ),
    )
    op.add_column(
        "tributes",
        sa.Column(
            "pen_style",
            sa.Enum("classic", "marker", "fountain", "gel", name="pen_style", native_enum=False),
            nullable=False,
            server_default="classic",
        ),
    )


def downgrade() -> None:
    op.drop_column("tributes", "pen_style")
    op.drop_column("tributes", "sticky_note_color")

"""merge tribute migration heads

Revision ID: 0005_merge_tribute_heads
Revises: 0004_image_data, 0003_sticky_pen_style
Create Date: 2026-03-13 00:00:00.000000

"""

from collections.abc import Sequence


revision: str = "0005_merge_tribute_heads"
down_revision: tuple[str, str] = ("0004_image_data", "0003_sticky_pen_style")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Merge-only revision to linearize history for `alembic upgrade head`.
    pass


def downgrade() -> None:
    pass

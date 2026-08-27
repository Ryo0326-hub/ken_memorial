"""add message and memory recollection tribute formats

Revision ID: 0008_message_memory
Revises: 0007_ai_memorial_chat
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0008_message_memory"
down_revision: str | None = "0007_ai_memorial_chat"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _drop_type_checks() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    for constraint in sa.inspect(bind).get_check_constraints("tributes"):
        sqltext = (constraint.get("sqltext") or "").lower()
        name = constraint.get("name")
        if name and "type" in sqltext and any(
            value in sqltext
            for value in ("birthday", "yearly_letter", "message", "memory_recollection")
        ):
            op.drop_constraint(name, "tributes", type_="check")


def upgrade() -> None:
    _drop_type_checks()
    op.execute("UPDATE tributes SET type = 'message' WHERE type IN ('birthday', 'yearly_letter')")
    op.create_check_constraint(
        "ck_tributes_type_v2",
        "tributes",
        "type IN ('message', 'memory_recollection')",
    )
    op.add_column(
        "tributes",
        sa.Column("paper_theme", sa.String(length=40), nullable=False, server_default="plain"),
    )
    op.add_column(
        "tributes",
        sa.Column(
            "decorations",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.create_check_constraint(
        "ck_tributes_paper_theme",
        "tributes",
        "paper_theme IN ('plain', 'wildflower_corners', 'eucalyptus_frame', 'lavender_edge')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_tributes_paper_theme", "tributes", type_="check")
    op.drop_column("tributes", "decorations")
    op.drop_column("tributes", "paper_theme")
    op.drop_constraint("ck_tributes_type_v2", "tributes", type_="check")
    op.execute("UPDATE tributes SET type = 'birthday' WHERE type = 'message'")
    op.execute("UPDATE tributes SET type = 'yearly_letter' WHERE type = 'memory_recollection'")
    op.create_check_constraint(
        "ck_tributes_type_legacy",
        "tributes",
        "type IN ('birthday', 'yearly_letter')",
    )

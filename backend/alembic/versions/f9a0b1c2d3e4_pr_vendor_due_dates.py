"""pr vendor due dates table

Revision ID: f9a0b1c2d3e4
Revises: d4e5f6a7b8c9
Create Date: 2026-06-24

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f9a0b1c2d3e4"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pr_vendor_due_dates",
        sa.Column(
            "pr_id",
            sa.String(length=36),
            sa.ForeignKey("purchase_requisitions.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "vendor_id",
            sa.String(length=36),
            sa.ForeignKey("vendors.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("pr_vendor_due_dates")

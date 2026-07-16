"""po and pr item due date

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-23

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("pr_items", sa.Column("due_date", sa.Date(), nullable=True))
    op.add_column("purchase_orders", sa.Column("due_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("purchase_orders", "due_date")
    op.drop_column("pr_items", "due_date")

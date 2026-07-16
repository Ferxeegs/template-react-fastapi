"""add minimum_stock to products

Revision ID: i9j0k1l2m3n4
Revises: h8i9j0k1l2m3
Create Date: 2026-06-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "i9j0k1l2m3n4"
down_revision: Union[str, None] = "h8i9j0k1l2m3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column(
            "minimum_stock",
            sa.Numeric(15, 4),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("products", "minimum_stock")

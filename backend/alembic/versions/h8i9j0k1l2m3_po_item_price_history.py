"""po item original price snapshot and price change audit log

Revision ID: h8i9j0k1l2m3
Revises: g7h8i9j0k1l2
Create Date: 2026-06-24

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "h8i9j0k1l2m3"
down_revision: Union[str, None] = "g7h8i9j0k1l2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "purchase_items",
        sa.Column("original_real_price", sa.Numeric(15, 2), nullable=True),
    )
    op.add_column(
        "purchase_items",
        sa.Column("original_real_total", sa.Numeric(15, 2), nullable=True),
    )
    op.execute(
        """
        UPDATE purchase_items
        SET
            original_real_price = real_price,
            original_real_total = real_total
        WHERE original_real_price IS NULL
        """
    )

    op.create_table(
        "po_price_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("po_id", sa.String(length=36), nullable=False),
        sa.Column("purchase_item_id", sa.String(length=36), nullable=False),
        sa.Column("old_price", sa.Numeric(15, 2), nullable=False),
        sa.Column("new_price", sa.Numeric(15, 2), nullable=False),
        sa.Column("old_total", sa.Numeric(15, 2), nullable=False),
        sa.Column("new_total", sa.Numeric(15, 2), nullable=False),
        sa.Column(
            "action_by",
            sa.String(length=36),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["po_id"], ["purchase_orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["purchase_item_id"], ["purchase_items.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_po_price_logs_po_id", "po_price_logs", ["po_id"])
    op.create_index("ix_po_price_logs_purchase_item_id", "po_price_logs", ["purchase_item_id"])


def downgrade() -> None:
    op.drop_index("ix_po_price_logs_purchase_item_id", table_name="po_price_logs")
    op.drop_index("ix_po_price_logs_po_id", table_name="po_price_logs")
    op.drop_table("po_price_logs")
    op.drop_column("purchase_items", "original_real_total")
    op.drop_column("purchase_items", "original_real_price")

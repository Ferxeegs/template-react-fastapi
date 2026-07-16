"""po item due date and per-item delivery/payment status

Revision ID: g7h8i9j0k1l2
Revises: a0b1c2d3e4f5
Create Date: 2026-06-24

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "g7h8i9j0k1l2"
down_revision: Union[str, None] = "a0b1c2d3e4f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("pr_items", sa.Column("due_date", sa.Date(), nullable=True))
    op.add_column("purchase_items", sa.Column("due_date", sa.Date(), nullable=True))
    op.add_column("purchase_items", sa.Column("delivery_status_id", sa.Integer(), nullable=True))
    op.add_column("purchase_items", sa.Column("payment_status_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_purchase_items_delivery_status_id",
        "purchase_items",
        "delivery_statuses",
        ["delivery_status_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_purchase_items_payment_status_id",
        "purchase_items",
        "payment_statuses",
        ["payment_status_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_purchase_items_delivery_status_id",
        "purchase_items",
        ["delivery_status_id"],
    )
    op.create_index(
        "ix_purchase_items_payment_status_id",
        "purchase_items",
        ["payment_status_id"],
    )
    op.add_column(
        "po_status_logs",
        sa.Column("purchase_item_id", sa.String(length=36), nullable=True),
    )
    op.create_foreign_key(
        "fk_po_status_logs_purchase_item_id",
        "po_status_logs",
        "purchase_items",
        ["purchase_item_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        "ix_po_status_logs_purchase_item_id",
        "po_status_logs",
        ["purchase_item_id"],
    )

    # Migrate vendor-level due dates to pr_items
    op.execute(
        """
        UPDATE pr_items pi
        INNER JOIN pr_vendor_due_dates pvd
            ON pi.pr_id = pvd.pr_id AND pi.vendor_id = pvd.vendor_id
        SET pi.due_date = pvd.due_date
        WHERE pi.due_date IS NULL
        """
    )

    # Copy PO-level status/due date to existing purchase items
    op.execute(
        """
        UPDATE purchase_items pi
        INNER JOIN purchase_orders po ON pi.po_id = po.id
        SET
            pi.due_date = COALESCE(pi.due_date, po.due_date),
            pi.delivery_status_id = po.delivery_status_id,
            pi.payment_status_id = po.payment_status_id
        """
    )


def downgrade() -> None:
    op.drop_index("ix_po_status_logs_purchase_item_id", table_name="po_status_logs")
    op.drop_constraint("fk_po_status_logs_purchase_item_id", "po_status_logs", type_="foreignkey")
    op.drop_column("po_status_logs", "purchase_item_id")

    op.drop_index("ix_purchase_items_payment_status_id", table_name="purchase_items")
    op.drop_index("ix_purchase_items_delivery_status_id", table_name="purchase_items")
    op.drop_constraint("fk_purchase_items_payment_status_id", "purchase_items", type_="foreignkey")
    op.drop_constraint("fk_purchase_items_delivery_status_id", "purchase_items", type_="foreignkey")
    op.drop_column("purchase_items", "payment_status_id")
    op.drop_column("purchase_items", "delivery_status_id")
    op.drop_column("purchase_items", "due_date")
    op.drop_column("pr_items", "due_date")

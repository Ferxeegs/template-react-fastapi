"""create procurement tables

Revision ID: c1d2e3f4a5b6
Revises: b8c9d0e1f2a3
Create Date: 2026-06-18

"""
from alembic import op
import sqlalchemy as sa


revision = "c1d2e3f4a5b6"
down_revision = "b8c9d0e1f2a3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- lookup / master ---
    op.create_table(
        "purchase_types",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "delivery_statuses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "payment_statuses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- purchase requisition (PR) ---
    op.create_table(
        "purchase_requisitions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("unit_id", sa.String(length=36), nullable=True),
        sa.Column("purchase_type_id", sa.Integer(), nullable=True),
        sa.Column("pr_number", sa.String(length=64), nullable=False),
        sa.Column("approval_status", sa.String(length=64), nullable=False, server_default="draft"),
        sa.Column("submitted_by", sa.String(length=36), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_fully_approved", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("fully_approved_by", sa.String(length=36), nullable=True),
        sa.Column("fully_approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(length=36), nullable=True),
        sa.Column("updated_by", sa.String(length=36), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["purchase_type_id"], ["purchase_types.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["submitted_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["fully_approved_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("pr_number", name="uq_purchase_requisitions_pr_number"),
    )
    op.create_index(
        op.f("ix_purchase_requisitions_unit_id"),
        "purchase_requisitions",
        ["unit_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_purchase_requisitions_purchase_type_id"),
        "purchase_requisitions",
        ["purchase_type_id"],
        unique=False,
    )

    op.create_table(
        "pr_items",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("pr_id", sa.String(length=36), nullable=False),
        sa.Column("vendor_id", sa.String(length=36), nullable=True),
        sa.Column("product_id", sa.String(length=36), nullable=True),
        sa.Column("category_id", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("request_qty", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("request_price", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
        sa.Column("request_total", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["pr_id"], ["purchase_requisitions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vendor_id"], ["vendors.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_pr_items_pr_id"), "pr_items", ["pr_id"], unique=False)
    op.create_index(op.f("ix_pr_items_vendor_id"), "pr_items", ["vendor_id"], unique=False)
    op.create_index(op.f("ix_pr_items_product_id"), "pr_items", ["product_id"], unique=False)
    op.create_index(op.f("ix_pr_items_category_id"), "pr_items", ["category_id"], unique=False)

    op.create_table(
        "pr_approval_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("pr_id", sa.String(length=36), nullable=False),
        sa.Column("scope_id", sa.String(length=36), nullable=True),
        sa.Column("approval_status", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("action_by", sa.String(length=36), nullable=True),
        sa.Column("role_name", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["pr_id"], ["purchase_requisitions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["scope_id"], ["units.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["action_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_pr_approval_logs_pr_id"), "pr_approval_logs", ["pr_id"], unique=False)
    op.create_index(op.f("ix_pr_approval_logs_scope_id"), "pr_approval_logs", ["scope_id"], unique=False)

    # --- purchase order (PO) ---
    op.create_table(
        "purchase_orders",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("pr_id", sa.String(length=36), nullable=True),
        sa.Column("vendor_id", sa.String(length=36), nullable=True),
        sa.Column("delivery_status_id", sa.Integer(), nullable=True),
        sa.Column("payment_status_id", sa.Integer(), nullable=True),
        sa.Column("po_number", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["pr_id"], ["purchase_requisitions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["vendor_id"], ["vendors.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["delivery_status_id"], ["delivery_statuses.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["payment_status_id"], ["payment_statuses.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("po_number", name="uq_purchase_orders_po_number"),
    )
    op.create_index(op.f("ix_purchase_orders_pr_id"), "purchase_orders", ["pr_id"], unique=False)
    op.create_index(op.f("ix_purchase_orders_vendor_id"), "purchase_orders", ["vendor_id"], unique=False)
    op.create_index(
        op.f("ix_purchase_orders_delivery_status_id"),
        "purchase_orders",
        ["delivery_status_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_purchase_orders_payment_status_id"),
        "purchase_orders",
        ["payment_status_id"],
        unique=False,
    )

    op.create_table(
        "purchase_items",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("po_id", sa.String(length=36), nullable=False),
        sa.Column("pr_item_id", sa.String(length=36), nullable=True),
        sa.Column("product_id", sa.String(length=36), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("real_qty", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("real_price", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
        sa.Column("real_total", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["po_id"], ["purchase_orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["pr_item_id"], ["pr_items.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_purchase_items_po_id"), "purchase_items", ["po_id"], unique=False)
    op.create_index(op.f("ix_purchase_items_pr_item_id"), "purchase_items", ["pr_item_id"], unique=False)
    op.create_index(op.f("ix_purchase_items_product_id"), "purchase_items", ["product_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_purchase_items_product_id"), table_name="purchase_items")
    op.drop_index(op.f("ix_purchase_items_pr_item_id"), table_name="purchase_items")
    op.drop_index(op.f("ix_purchase_items_po_id"), table_name="purchase_items")
    op.drop_table("purchase_items")

    op.drop_index(op.f("ix_purchase_orders_payment_status_id"), table_name="purchase_orders")
    op.drop_index(op.f("ix_purchase_orders_delivery_status_id"), table_name="purchase_orders")
    op.drop_index(op.f("ix_purchase_orders_vendor_id"), table_name="purchase_orders")
    op.drop_index(op.f("ix_purchase_orders_pr_id"), table_name="purchase_orders")
    op.drop_table("purchase_orders")

    op.drop_index(op.f("ix_pr_approval_logs_scope_id"), table_name="pr_approval_logs")
    op.drop_index(op.f("ix_pr_approval_logs_pr_id"), table_name="pr_approval_logs")
    op.drop_table("pr_approval_logs")

    op.drop_index(op.f("ix_pr_items_category_id"), table_name="pr_items")
    op.drop_index(op.f("ix_pr_items_product_id"), table_name="pr_items")
    op.drop_index(op.f("ix_pr_items_vendor_id"), table_name="pr_items")
    op.drop_index(op.f("ix_pr_items_pr_id"), table_name="pr_items")
    op.drop_table("pr_items")

    op.drop_index(op.f("ix_purchase_requisitions_purchase_type_id"), table_name="purchase_requisitions")
    op.drop_index(op.f("ix_purchase_requisitions_unit_id"), table_name="purchase_requisitions")
    op.drop_table("purchase_requisitions")

    op.drop_table("payment_statuses")
    op.drop_table("delivery_statuses")
    op.drop_table("purchase_types")

"""inventory tables (product_stocks, stock_movements)

Revision ID: a1b2c3d4e5f6
Revises: f8a9b0c1d2e3
Create Date: 2026-06-22

"""
from alembic import op
import sqlalchemy as sa


revision = "a1b2c3d4e5f6"
down_revision = "f8a9b0c1d2e3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "product_stocks",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("product_id", sa.String(length=36), nullable=False),
        sa.Column("unit_id", sa.String(length=36), nullable=False),
        sa.Column("qty_on_hand", sa.Numeric(precision=15, scale=4), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_id", "unit_id", name="uq_product_stocks_product_unit"),
    )
    op.create_index(op.f("ix_product_stocks_product_id"), "product_stocks", ["product_id"], unique=False)
    op.create_index(op.f("ix_product_stocks_unit_id"), "product_stocks", ["unit_id"], unique=False)

    op.create_table(
        "stock_movements",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("product_id", sa.String(length=36), nullable=False),
        sa.Column("unit_id", sa.String(length=36), nullable=False),
        sa.Column("movement_type", sa.String(length=32), nullable=False),
        sa.Column("qty", sa.Numeric(precision=15, scale=4), nullable=False),
        sa.Column("qty_before", sa.Numeric(precision=15, scale=4), nullable=False, server_default="0"),
        sa.Column("qty_after", sa.Numeric(precision=15, scale=4), nullable=False, server_default="0"),
        sa.Column("reference_type", sa.String(length=32), nullable=True),
        sa.Column("reference_id", sa.String(length=36), nullable=True),
        sa.Column("reference_line_id", sa.String(length=36), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", sa.String(length=36), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_stock_movements_product_id"), "stock_movements", ["product_id"], unique=False)
    op.create_index(op.f("ix_stock_movements_unit_id"), "stock_movements", ["unit_id"], unique=False)
    op.create_index(op.f("ix_stock_movements_movement_type"), "stock_movements", ["movement_type"], unique=False)
    op.create_index(op.f("ix_stock_movements_reference_type"), "stock_movements", ["reference_type"], unique=False)
    op.create_index(op.f("ix_stock_movements_reference_id"), "stock_movements", ["reference_id"], unique=False)
    op.create_index(op.f("ix_stock_movements_reference_line_id"), "stock_movements", ["reference_line_id"], unique=False)
    op.create_index(
        "ix_stock_movements_created_at",
        "stock_movements",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_stock_movements_created_at", table_name="stock_movements")
    op.drop_index(op.f("ix_stock_movements_reference_line_id"), table_name="stock_movements")
    op.drop_index(op.f("ix_stock_movements_reference_id"), table_name="stock_movements")
    op.drop_index(op.f("ix_stock_movements_reference_type"), table_name="stock_movements")
    op.drop_index(op.f("ix_stock_movements_movement_type"), table_name="stock_movements")
    op.drop_index(op.f("ix_stock_movements_unit_id"), table_name="stock_movements")
    op.drop_index(op.f("ix_stock_movements_product_id"), table_name="stock_movements")
    op.drop_table("stock_movements")
    op.drop_index(op.f("ix_product_stocks_unit_id"), table_name="product_stocks")
    op.drop_index(op.f("ix_product_stocks_product_id"), table_name="product_stocks")
    op.drop_table("product_stocks")

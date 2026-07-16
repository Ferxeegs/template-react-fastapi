"""stock per product unit category

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-22

"""
from alembic import op
import sqlalchemy as sa


revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Saldo lama tanpa kategori tidak bisa dipetakan — reset agar konsisten
    op.execute("DELETE FROM stock_movements")
    op.execute("DELETE FROM product_stocks")

    op.drop_constraint("uq_product_stocks_product_unit", "product_stocks", type_="unique")

    op.add_column(
        "product_stocks",
        sa.Column("category_id", sa.Integer(), nullable=False),
    )
    op.add_column(
        "stock_movements",
        sa.Column("category_id", sa.Integer(), nullable=False),
    )
    op.create_foreign_key(
        "fk_product_stocks_category_id",
        "product_stocks",
        "categories",
        ["category_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_stock_movements_category_id",
        "stock_movements",
        "categories",
        ["category_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(op.f("ix_product_stocks_category_id"), "product_stocks", ["category_id"], unique=False)
    op.create_index(op.f("ix_stock_movements_category_id"), "stock_movements", ["category_id"], unique=False)
    op.create_unique_constraint(
        "uq_product_stocks_product_unit_category",
        "product_stocks",
        ["product_id", "unit_id", "category_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_product_stocks_product_unit_category", "product_stocks", type_="unique")
    op.drop_index(op.f("ix_stock_movements_category_id"), table_name="stock_movements")
    op.drop_index(op.f("ix_product_stocks_category_id"), table_name="product_stocks")
    op.drop_constraint("fk_stock_movements_category_id", "stock_movements", type_="foreignkey")
    op.drop_constraint("fk_product_stocks_category_id", "product_stocks", type_="foreignkey")
    op.drop_column("stock_movements", "category_id")
    op.drop_column("product_stocks", "category_id")
    op.create_unique_constraint(
        "uq_product_stocks_product_unit",
        "product_stocks",
        ["product_id", "unit_id"],
    )

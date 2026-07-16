"""add unit_id to categories

Revision ID: e7f8a9b0c1d2
Revises: d2e3f4a5b6c7
Create Date: 2026-06-21

"""
from alembic import op
import sqlalchemy as sa


revision = "e7f8a9b0c1d2"
down_revision = "d2e3f4a5b6c7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "categories",
        sa.Column("unit_id", sa.String(length=36), nullable=True),
    )
    op.create_index(op.f("ix_categories_unit_id"), "categories", ["unit_id"], unique=False)
    op.create_foreign_key(
        "fk_categories_unit_id",
        "categories",
        "units",
        ["unit_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Backfill unit_id dari produk pertama yang memakai kategori tersebut.
    op.execute(
        """
        UPDATE categories c
        INNER JOIN (
            SELECT pc.category_id, MIN(v.unit_id) AS unit_id
            FROM product_categories pc
            INNER JOIN products p ON p.id = pc.product_id
            INNER JOIN vendors v ON v.id = p.vendor_id
            WHERE v.unit_id IS NOT NULL
            GROUP BY pc.category_id
        ) src ON src.category_id = c.id
        SET c.unit_id = src.unit_id
        """
    )


def downgrade() -> None:
    op.drop_constraint("fk_categories_unit_id", "categories", type_="foreignkey")
    op.drop_index(op.f("ix_categories_unit_id"), table_name="categories")
    op.drop_column("categories", "unit_id")

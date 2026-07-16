"""change qty columns to numeric

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b7
Create Date: 2026-06-19

"""
from alembic import op
import sqlalchemy as sa


revision = "d2e3f4a5b6c7"
down_revision = "c1d2e3f4a5b7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("pr_items", "request_qty", type_=sa.Numeric(15, 4), existing_type=sa.Integer(), nullable=False)
    op.alter_column("purchase_items", "real_qty", type_=sa.Numeric(15, 4), existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    op.alter_column("pr_items", "request_qty", type_=sa.Integer(), existing_type=sa.Numeric(15, 4), nullable=False)
    op.alter_column("purchase_items", "real_qty", type_=sa.Integer(), existing_type=sa.Numeric(15, 4), nullable=False)

"""create product_categories table

Revision ID: dfccc451ddaa
Revises: eae92150808e
Create Date: 2026-06-17 10:21:49.298153

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'dfccc451ddaa'
down_revision = 'eae92150808e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('product_categories',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('product_id', sa.String(length=36), nullable=False),
    sa.Column('category_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_product_categories_category_id'), 'product_categories', ['category_id'], unique=False)
    op.create_index(op.f('ix_product_categories_product_id'), 'product_categories', ['product_id'], unique=False)


def downgrade() -> None:
    op.drop_table('product_categories')

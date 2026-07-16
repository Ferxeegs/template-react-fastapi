"""create products table

Revision ID: eae92150808e
Revises: 73e9e33200cf
Create Date: 2026-06-17 10:21:47.391845

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'eae92150808e'
down_revision = '73e9e33200cf'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('products',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('vendor_id', sa.String(length=36), nullable=False),
    sa.Column('product_type_id', sa.Integer(), nullable=True),
    sa.Column('uom_id', sa.Integer(), nullable=True),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('price', sa.Numeric(precision=15, scale=2), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['product_type_id'], ['product_types.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['uom_id'], ['uoms.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_products_product_type_id'), 'products', ['product_type_id'], unique=False)
    op.create_index(op.f('ix_products_uom_id'), 'products', ['uom_id'], unique=False)
    op.create_index(op.f('ix_products_vendor_id'), 'products', ['vendor_id'], unique=False)


def downgrade() -> None:
    op.drop_table('products')

"""create product_types table

Revision ID: 44f20abf2da5
Revises: 54a79a871302
Create Date: 2026-06-17 10:21:38.291753

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '44f20abf2da5'
down_revision = '54a79a871302'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('product_types',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('description', sa.String(length=512), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('product_types')

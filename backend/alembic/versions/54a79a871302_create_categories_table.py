"""create categories table

Revision ID: 54a79a871302
Revises: da849e3bee6b
Create Date: 2026-06-17 10:21:35.918237

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '54a79a871302'
down_revision = 'da849e3bee6b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('categories',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('categories')

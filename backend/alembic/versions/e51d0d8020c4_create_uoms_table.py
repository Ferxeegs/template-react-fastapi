"""create uoms table

Revision ID: e51d0d8020c4
Revises: 44f20abf2da5
Create Date: 2026-06-17 10:21:42.109825

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e51d0d8020c4'
down_revision = '44f20abf2da5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('uoms',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('shortname', sa.String(length=50), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('uoms')

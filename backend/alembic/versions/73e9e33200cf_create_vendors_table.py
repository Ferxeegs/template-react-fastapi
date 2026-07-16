"""create vendors table

Revision ID: 73e9e33200cf
Revises: e51d0d8020c4
Create Date: 2026-06-17 10:21:44.298493

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '73e9e33200cf'
down_revision = 'e51d0d8020c4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('vendors',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('unit_id', sa.String(length=36), nullable=True),
    sa.Column('vendor_status_id', sa.Integer(), nullable=True),
    sa.Column('company_name', sa.String(length=255), nullable=False),
    sa.Column('phone', sa.String(length=50), nullable=True),
    sa.Column('address', sa.String(length=512), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['unit_id'], ['units.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['vendor_status_id'], ['vendor_statuses.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vendors_unit_id'), 'vendors', ['unit_id'], unique=False)
    op.create_index(op.f('ix_vendors_vendor_status_id'), 'vendors', ['vendor_status_id'], unique=False)


def downgrade() -> None:
    op.drop_table('vendors')

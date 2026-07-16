"""create vendor_statuses table

Revision ID: da849e3bee6b
Revises: a7b8c9d0e1f2
Create Date: 2026-06-17 10:21:34.304953

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'da849e3bee6b'
down_revision = 'a7b8c9d0e1f2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('vendor_statuses',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('status_name', sa.String(length=255), nullable=False),
    sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('vendor_statuses')

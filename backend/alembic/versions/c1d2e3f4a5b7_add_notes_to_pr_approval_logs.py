"""add notes to pr_approval_logs

Revision ID: c1d2e3f4a5b7
Revises: c1d2e3f4a5b6
Create Date: 2026-06-19

"""
from alembic import op
import sqlalchemy as sa


revision = "c1d2e3f4a5b7"
down_revision = "c1d2e3f4a5b6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("pr_approval_logs", sa.Column("notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("pr_approval_logs", "notes")

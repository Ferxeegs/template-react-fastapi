"""po_status_logs table

Revision ID: f8a9b0c1d2e3
Revises: e7f8a9b0c1d2
Create Date: 2026-06-21

"""
from alembic import op
import sqlalchemy as sa


revision = "f8a9b0c1d2e3"
down_revision = "e7f8a9b0c1d2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "po_status_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("po_id", sa.String(length=36), nullable=False),
        sa.Column("status_type", sa.String(length=32), nullable=False),
        sa.Column("status_id", sa.Integer(), nullable=False),
        sa.Column("status_name", sa.String(length=255), nullable=False),
        sa.Column("action_by", sa.String(length=36), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["action_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["po_id"], ["purchase_orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_po_status_logs_po_id"), "po_status_logs", ["po_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_po_status_logs_po_id"), table_name="po_status_logs")
    op.drop_table("po_status_logs")

"""role_has_scope table

Revision ID: a7b8c9d0e1f2
Revises: f1a2b3c4d5e6
Create Date: 2026-06-16

"""
from alembic import op
import sqlalchemy as sa


revision = "a7b8c9d0e1f2"
down_revision = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "role_has_scope",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_role_id", sa.BigInteger(), nullable=False),
        sa.Column("scope_id", sa.String(length=36), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_role_id"],
            ["user_roles.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["scope_id"],
            ["units.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_role_id",
            "scope_id",
            name="uq_role_has_scope_user_role_scope",
        ),
    )
    op.create_index(
        op.f("ix_role_has_scope_user_role_id"),
        "role_has_scope",
        ["user_role_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_role_has_scope_scope_id"),
        "role_has_scope",
        ["scope_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_role_has_scope_scope_id"), table_name="role_has_scope")
    op.drop_index(op.f("ix_role_has_scope_user_role_id"), table_name="role_has_scope")
    op.drop_table("role_has_scope")

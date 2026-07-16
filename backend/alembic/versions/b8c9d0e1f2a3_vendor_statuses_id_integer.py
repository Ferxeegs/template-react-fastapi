"""vendor_statuses id to integer

Revision ID: b8c9d0e1f2a3
Revises: dfccc451ddaa
Create Date: 2026-06-18

"""
from alembic import op
import sqlalchemy as sa


revision = "b8c9d0e1f2a3"
down_revision = "dfccc451ddaa"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    for fk in inspector.get_foreign_keys("vendors"):
        if fk.get("referred_table") == "vendor_statuses":
            op.drop_constraint(fk["name"], "vendors", type_="foreignkey")

    op.execute("UPDATE vendors SET vendor_status_id = NULL")
    op.alter_column(
        "vendors",
        "vendor_status_id",
        existing_type=sa.String(length=36),
        type_=sa.Integer(),
        existing_nullable=True,
    )

    op.drop_table("vendor_statuses")
    op.create_table(
        "vendor_statuses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("status_name", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_foreign_key(
        "fk_vendors_vendor_status_id",
        "vendors",
        "vendor_statuses",
        ["vendor_status_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    for fk in sa.inspect(op.get_bind()).get_foreign_keys("vendors"):
        if fk.get("referred_table") == "vendor_statuses":
            op.drop_constraint(fk["name"], "vendors", type_="foreignkey")

    op.drop_table("vendor_statuses")
    op.create_table(
        "vendor_statuses",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("status_name", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.alter_column(
        "vendors",
        "vendor_status_id",
        existing_type=sa.Integer(),
        type_=sa.String(length=36),
        existing_nullable=True,
    )
    op.create_foreign_key(
        "fk_vendors_vendor_status_id",
        "vendors",
        "vendor_statuses",
        ["vendor_status_id"],
        ["id"],
        ondelete="SET NULL",
    )

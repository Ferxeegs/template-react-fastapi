"""media: object storage (MinIO/S3) metadata columns

Revision ID: e5f6a7b8c9d0
Revises: ad0ee9d1bf7a
Create Date: 2026-05-10

"""
from alembic import op
import sqlalchemy as sa


revision = "e5f6a7b8c9d0"
down_revision = "000000000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "media",
        sa.Column("storage", sa.String(length=16), nullable=False, server_default="local"),
    )
    op.add_column("media", sa.Column("bucket", sa.String(length=255), nullable=True))
    op.add_column("media", sa.Column("object_key", sa.String(length=1024), nullable=True))
    op.add_column("media", sa.Column("checksum_sha256", sa.String(length=64), nullable=True))
    op.alter_column(
        "media",
        "url",
        existing_type=sa.String(length=255),
        type_=sa.String(length=512),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "media",
        "url",
        existing_type=sa.String(length=512),
        type_=sa.String(length=255),
        existing_nullable=False,
    )
    op.drop_column("media", "checksum_sha256")
    op.drop_column("media", "object_key")
    op.drop_column("media", "bucket")
    op.drop_column("media", "storage")

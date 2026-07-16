"""initial schema

Revision ID: 000000000001
Revises: 
Create Date: 2026-03-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '000000000001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- Auth Tables ---
    op.create_table('roles',
    sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('guard_name', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    
    op.create_table('permissions',
    sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('guard_name', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table('users',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('username', sa.String(length=255), nullable=False),
    sa.Column('firstname', sa.String(length=255), nullable=False),
    sa.Column('lastname', sa.String(length=255), nullable=False),
    sa.Column('fullname', sa.String(length=255), nullable=True),
    sa.Column('phone_number', sa.String(length=255), nullable=True),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('email_verified_at', sa.DateTime(), nullable=True),
    sa.Column('password', sa.String(length=255), nullable=False),
    sa.Column('remember_token', sa.String(length=100), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_by', sa.String(length=36), nullable=True),
    sa.Column('updated_by', sa.String(length=36), nullable=True),
    sa.Column('deleted_by', sa.String(length=36), nullable=True),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    
    op.create_table('role_has_permissions',
    sa.Column('permission_id', sa.BigInteger(), nullable=False),
    sa.Column('role_id', sa.BigInteger(), nullable=False),
    sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('permission_id', 'role_id')
    )
    
    op.create_table('user_roles',
    sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=True),
    sa.Column('role_id', sa.BigInteger(), nullable=True),
    sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'role_id', name='uq_user_role')
    )
    
    op.create_table('password_reset_tokens',
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('token', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
    sa.PrimaryKeyConstraint('email')
    )
    
    # --- Common Tables ---
    op.create_table('media',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('model_type', sa.String(length=255), nullable=False),
    sa.Column('model_id', sa.String(length=36), nullable=False),
    sa.Column('collection', sa.String(length=255), nullable=True),
    sa.Column('url', sa.String(length=255), nullable=False),
    sa.Column('file_name', sa.String(length=255), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('mime_type', sa.String(length=255), nullable=False),
    sa.Column('size', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_media_model', 'media', ['model_type', 'model_id'], unique=False)
    
    op.create_table('settings',
    sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
    sa.Column('group', sa.String(length=255), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('locked', sa.Integer(), nullable=True),
    sa.Column('payload', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('settings')
    op.drop_index('idx_media_model', table_name='media')
    op.drop_table('media')
    op.drop_table('password_reset_tokens')
    op.drop_table('user_roles')
    op.drop_table('role_has_permissions')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_table('permissions')
    op.drop_table('roles')

from sqlalchemy import Column, String, DateTime, ForeignKey, Table, BigInteger, UniqueConstraint, JSON, event
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base
from .base import TimestampMixin, AuditMixin
import uuid

# Association Table: User <-> Role
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("id", BigInteger, primary_key=True, autoincrement=True),
    Column("user_id", String(36), ForeignKey("users.id", ondelete="CASCADE")),
    Column("role_id", BigInteger, ForeignKey("roles.id", ondelete="CASCADE")),
    UniqueConstraint("user_id", "role_id", name="uq_user_role")
)

# Association Table: Role <-> Permission
role_has_permissions = Table(
    "role_has_permissions",
    Base.metadata,
    Column("permission_id", BigInteger, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", BigInteger, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)

class User(Base, TimestampMixin, AuditMixin):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(255), unique=True, index=True, nullable=False)
    firstname = Column(String(255), nullable=False)
    lastname = Column(String(255), nullable=False)
    fullname = Column(String(255), nullable=True)
    phone_number = Column(String(255), nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    email_verified_at = Column(DateTime, nullable=True)
    password = Column(String(255), nullable=False)
    remember_token = Column(String(100), nullable=True)

    # Relationships
    roles = relationship("Role", secondary=user_roles, back_populates="users")

class Role(Base, TimestampMixin):
    __tablename__ = "roles"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False)
    guard_name = Column(String(255), nullable=False)

    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship("Permission", secondary=role_has_permissions, back_populates="roles")

class Permission(Base, TimestampMixin):
    __tablename__ = "permissions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    guard_name = Column(String(255), nullable=False)

    roles = relationship("Role", secondary=role_has_permissions, back_populates="permissions")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    email = Column(String(255), primary_key=True)
    token = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


@event.listens_for(User, 'before_insert')
def set_fullname_before_insert(mapper, connection, target):
    firstname = (target.firstname or "").strip()
    lastname = (target.lastname or "").strip()
    target.fullname = f"{firstname} {lastname}".strip() or None


@event.listens_for(User, 'before_update')
def set_fullname_before_update(mapper, connection, target):
    firstname = (target.firstname or "").strip()
    lastname = (target.lastname or "").strip()
    target.fullname = f"{firstname} {lastname}".strip() or None
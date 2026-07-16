from sqlalchemy import BigInteger, Column, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base_class import Base
from .base import TimestampMixin


class RoleHasScope(Base, TimestampMixin):
    """Scope unit untuk assignment user–role (satu baris user_roles → banyak unit)."""

    __tablename__ = "role_has_scope"
    __table_args__ = (
        UniqueConstraint(
            "user_role_id",
            "scope_id",
            name="uq_role_has_scope_user_role_scope",
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_role_id = Column(
        BigInteger,
        ForeignKey("user_roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scope_id = Column(
        String(36),
        ForeignKey("units.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    unit = relationship("Unit", foreign_keys=[scope_id])

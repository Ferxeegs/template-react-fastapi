import uuid

from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.orm import relationship

from app.db.base_class import Base
from .base import TimestampMixin


class Unit(Base, TimestampMixin):
    __tablename__ = "units"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    parent_id = Column(
        String(36),
        ForeignKey("units.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    parent = relationship("Unit", remote_side="Unit.id", back_populates="children")
    children = relationship("Unit", back_populates="parent")

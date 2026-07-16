import uuid

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base_class import Base
from app.db.types import UTCDateTime
from .base import TimestampMixin


class ProductStock(Base, TimestampMixin):
    """Current on-hand quantity per product, unit, and category."""

    __tablename__ = "product_stocks"
    __table_args__ = (
        UniqueConstraint(
            "product_id",
            "unit_id",
            "category_id",
            name="uq_product_stocks_product_unit_category",
        ),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(
        String(36),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    unit_id = Column(
        String(36),
        ForeignKey("units.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id = Column(
        Integer,
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    qty_on_hand = Column(Numeric(15, 4), nullable=False, default=0)

    product = relationship("Product")
    unit = relationship("Unit")
    category = relationship("Category")


class StockMovement(Base):
    """Immutable stock ledger — audit trail per category bucket."""

    __tablename__ = "stock_movements"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(
        String(36),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    unit_id = Column(
        String(36),
        ForeignKey("units.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    category_id = Column(
        Integer,
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    movement_type = Column(String(32), nullable=False, index=True)
    qty = Column(Numeric(15, 4), nullable=False)
    qty_before = Column(Numeric(15, 4), nullable=False, default=0)
    qty_after = Column(Numeric(15, 4), nullable=False, default=0)
    reference_type = Column(String(32), nullable=True, index=True)
    reference_id = Column(String(36), nullable=True, index=True)
    reference_line_id = Column(String(36), nullable=True, index=True)
    notes = Column(Text, nullable=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(UTCDateTime, server_default=func.now(), nullable=False)

    product = relationship("Product")
    unit = relationship("Unit")
    category = relationship("Category")
    actor = relationship("User", foreign_keys=[created_by])

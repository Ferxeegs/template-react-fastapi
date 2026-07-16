import uuid

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base_class import Base
from app.db.types import UTCDateTime
from .base import TimestampMixin


class PurchaseType(Base, TimestampMixin):
    __tablename__ = "purchase_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    purchase_requisitions = relationship("PurchaseRequisition", back_populates="purchase_type")


class DeliveryStatus(Base, TimestampMixin):
    __tablename__ = "delivery_statuses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    purchase_orders = relationship("PurchaseOrder", back_populates="delivery_status")


class PaymentStatus(Base, TimestampMixin):
    __tablename__ = "payment_statuses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    purchase_orders = relationship("PurchaseOrder", back_populates="payment_status")


class PurchaseRequisition(Base, TimestampMixin):
    __tablename__ = "purchase_requisitions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    unit_id = Column(
        String(36),
        ForeignKey("units.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    purchase_type_id = Column(
        Integer,
        ForeignKey("purchase_types.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    pr_number = Column(String(64), nullable=False, unique=True)
    approval_status = Column(String(64), nullable=False, default="draft")
    submitted_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    submitted_at = Column(UTCDateTime, nullable=True)
    is_fully_approved = Column(Boolean, default=False, nullable=False)
    fully_approved_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    fully_approved_at = Column(UTCDateTime, nullable=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    unit = relationship("Unit")
    purchase_type = relationship("PurchaseType", back_populates="purchase_requisitions")
    items = relationship(
        "PrItem",
        back_populates="purchase_requisition",
        cascade="all, delete-orphan",
    )
    approval_logs = relationship(
        "PrApprovalLog",
        back_populates="purchase_requisition",
        cascade="all, delete-orphan",
    )
    purchase_orders = relationship("PurchaseOrder", back_populates="purchase_requisition")
    vendor_due_dates = relationship(
        "PrVendorDueDate",
        back_populates="purchase_requisition",
        cascade="all, delete-orphan",
    )

    @property
    def total_amount(self):
        return sum(item.request_total for item in self.items) if self.items else 0



class PrItem(Base, TimestampMixin):
    __tablename__ = "pr_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pr_id = Column(
        String(36),
        ForeignKey("purchase_requisitions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    vendor_id = Column(
        String(36),
        ForeignKey("vendors.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    product_id = Column(
        String(36),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    category_id = Column(
        Integer,
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    description = Column(Text, nullable=True)
    request_qty = Column(Numeric(15, 4), nullable=False, default=0.0)
    request_price = Column(Numeric(15, 2), nullable=False, default=0)
    request_total = Column(Numeric(15, 2), nullable=False, default=0)
    due_date = Column(Date, nullable=True)

    purchase_requisition = relationship("PurchaseRequisition", back_populates="items")
    vendor = relationship("Vendor")
    product = relationship("Product")
    category = relationship("Category")
    purchase_items = relationship("PurchaseItem", back_populates="pr_item")


class PrVendorDueDate(Base, TimestampMixin):
    __tablename__ = "pr_vendor_due_dates"

    pr_id = Column(
        String(36),
        ForeignKey("purchase_requisitions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    vendor_id = Column(
        String(36),
        ForeignKey("vendors.id", ondelete="CASCADE"),
        primary_key=True,
    )
    due_date = Column(Date, nullable=False)

    purchase_requisition = relationship("PurchaseRequisition", back_populates="vendor_due_dates")
    vendor = relationship("Vendor")


class PrApprovalLog(Base):
    __tablename__ = "pr_approval_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pr_id = Column(
        String(36),
        ForeignKey("purchase_requisitions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scope_id = Column(
        String(36),
        ForeignKey("units.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    approval_status = Column(String(64), nullable=False)
    action = Column(String(64), nullable=False)
    action_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    role_name = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(UTCDateTime, server_default=func.now())

    purchase_requisition = relationship("PurchaseRequisition", back_populates="approval_logs")
    scope = relationship("Unit")
    actor = relationship("User", foreign_keys=[action_by])


class PurchaseOrder(Base, TimestampMixin):
    __tablename__ = "purchase_orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pr_id = Column(
        String(36),
        ForeignKey("purchase_requisitions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    vendor_id = Column(
        String(36),
        ForeignKey("vendors.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    delivery_status_id = Column(
        Integer,
        ForeignKey("delivery_statuses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    payment_status_id = Column(
        Integer,
        ForeignKey("payment_statuses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    po_number = Column(String(64), nullable=False, unique=True)
    due_date = Column(Date, nullable=True)

    purchase_requisition = relationship("PurchaseRequisition", back_populates="purchase_orders")
    vendor = relationship("Vendor")
    delivery_status = relationship("DeliveryStatus", back_populates="purchase_orders")
    payment_status = relationship("PaymentStatus", back_populates="purchase_orders")
    items = relationship(
        "PurchaseItem",
        back_populates="purchase_order",
        cascade="all, delete-orphan",
    )
    status_logs = relationship(
        "PoStatusLog",
        back_populates="purchase_order",
        cascade="all, delete-orphan",
        order_by="PoStatusLog.created_at",
    )
    price_logs = relationship(
        "PoPriceLog",
        back_populates="purchase_order",
        cascade="all, delete-orphan",
        order_by="PoPriceLog.created_at",
    )


class PoStatusLog(Base):
    __tablename__ = "po_status_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    po_id = Column(
        String(36),
        ForeignKey("purchase_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status_type = Column(String(32), nullable=False)
    status_id = Column(Integer, nullable=False)
    status_name = Column(String(255), nullable=False)
    purchase_item_id = Column(
        String(36),
        ForeignKey("purchase_items.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    action_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(UTCDateTime, server_default=func.now())

    purchase_order = relationship("PurchaseOrder", back_populates="status_logs")
    purchase_item = relationship("PurchaseItem", back_populates="status_logs")
    actor = relationship("User", foreign_keys=[action_by])


class PoPriceLog(Base):
    __tablename__ = "po_price_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    po_id = Column(
        String(36),
        ForeignKey("purchase_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    purchase_item_id = Column(
        String(36),
        ForeignKey("purchase_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    old_price = Column(Numeric(15, 2), nullable=False)
    new_price = Column(Numeric(15, 2), nullable=False)
    old_total = Column(Numeric(15, 2), nullable=False)
    new_total = Column(Numeric(15, 2), nullable=False)
    action_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(UTCDateTime, server_default=func.now())

    purchase_order = relationship("PurchaseOrder", back_populates="price_logs")
    purchase_item = relationship("PurchaseItem", back_populates="price_logs")
    actor = relationship("User", foreign_keys=[action_by])


class PurchaseItem(Base, TimestampMixin):
    __tablename__ = "purchase_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    po_id = Column(
        String(36),
        ForeignKey("purchase_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    pr_item_id = Column(
        String(36),
        ForeignKey("pr_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    product_id = Column(
        String(36),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    description = Column(Text, nullable=True)
    real_qty = Column(Numeric(15, 4), nullable=False, default=0.0)
    real_price = Column(Numeric(15, 2), nullable=False, default=0)
    real_total = Column(Numeric(15, 2), nullable=False, default=0)
    original_real_price = Column(Numeric(15, 2), nullable=True)
    original_real_total = Column(Numeric(15, 2), nullable=True)
    due_date = Column(Date, nullable=True)
    delivery_status_id = Column(
        Integer,
        ForeignKey("delivery_statuses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    payment_status_id = Column(
        Integer,
        ForeignKey("payment_statuses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    pr_item = relationship("PrItem", back_populates="purchase_items")
    product = relationship("Product")
    delivery_status = relationship("DeliveryStatus")
    payment_status = relationship("PaymentStatus")
    status_logs = relationship(
        "PoStatusLog",
        back_populates="purchase_item",
        cascade="all, delete-orphan",
        order_by="PoStatusLog.created_at",
    )
    price_logs = relationship(
        "PoPriceLog",
        back_populates="purchase_item",
        cascade="all, delete-orphan",
        order_by="PoPriceLog.created_at",
    )

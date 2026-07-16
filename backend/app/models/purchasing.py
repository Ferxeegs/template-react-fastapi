import uuid
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from app.db.base_class import Base
from .base import TimestampMixin

class VendorStatus(Base, TimestampMixin):
    __tablename__ = "vendor_statuses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    status_name = Column(String(255), nullable=False)

    # Relationship
    vendors = relationship("Vendor", back_populates="status")


class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    unit_id = Column(
        String(36),
        ForeignKey("units.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationship
    unit = relationship("Unit")
    products = relationship("Product", secondary="product_categories", back_populates="categories")


class ProductType(Base, TimestampMixin):
    __tablename__ = "product_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationship
    products = relationship("Product", back_populates="product_type")


class Uom(Base, TimestampMixin):
    __tablename__ = "uoms"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    shortname = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationship
    products = relationship("Product", back_populates="uom")


class Vendor(Base, TimestampMixin):
    __tablename__ = "vendors"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    unit_id = Column(
        String(36),
        ForeignKey("units.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    vendor_status_id = Column(
        Integer,
        ForeignKey("vendor_statuses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    company_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    address = Column(String(512), nullable=True)

    # Relationships
    status = relationship("VendorStatus", back_populates="vendors")
    unit = relationship("Unit")
    products = relationship("Product", back_populates="vendor")


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    vendor_id = Column(
        String(36),
        ForeignKey("vendors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_type_id = Column(
        Integer,
        ForeignKey("product_types.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    uom_id = Column(
        Integer,
        ForeignKey("uoms.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name = Column(String(255), nullable=False)
    price = Column(Numeric(15, 2), nullable=False, default=0.00)
    minimum_stock = Column(Numeric(15, 4), nullable=False, default=0)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    vendor = relationship("Vendor", back_populates="products")
    product_type = relationship("ProductType", back_populates="products")
    uom = relationship("Uom", back_populates="products")
    categories = relationship("Category", secondary="product_categories", back_populates="products")


class ProductCategory(Base, TimestampMixin):
    __tablename__ = "product_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(
        String(36),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id = Column(
        Integer,
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

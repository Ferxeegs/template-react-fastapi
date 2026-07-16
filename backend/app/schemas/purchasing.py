from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# ----------------- VendorStatus -----------------
class VendorStatusRead(BaseModel):
    id: int
    status_name: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- Uom -----------------
class UomBase(BaseModel):
    name: str
    shortname: str
    is_active: bool = True


class UomCreate(UomBase):
    pass


class UomUpdate(BaseModel):
    name: Optional[str] = None
    shortname: Optional[str] = None
    is_active: Optional[bool] = None


class UomRead(BaseModel):
    id: int
    name: str
    shortname: str
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- ProductType -----------------
class ProductTypeRead(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- Category -----------------
class CategoryUnitRead(BaseModel):
    id: str
    name: str

    model_config = ConfigDict(from_attributes=True)


class CategoryBase(BaseModel):
    name: str
    unit_id: str


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    unit_id: Optional[str] = None


class CategoryRead(BaseModel):
    id: int
    name: str
    unit_id: Optional[str] = None
    unit: Optional[CategoryUnitRead] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- Vendor -----------------
class VendorBase(BaseModel):
    company_name: str
    unit_id: Optional[str] = None
    vendor_status_id: Optional[int] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class VendorCreate(VendorBase):
    pass

class VendorUpdate(BaseModel):
    company_name: Optional[str] = None
    unit_id: Optional[str] = None
    vendor_status_id: Optional[int] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class VendorRead(VendorBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Detail Read for Vendor
from app.schemas.unit import UnitRead

class VendorDetailRead(VendorRead):
    status: Optional[VendorStatusRead] = None
    unit: Optional[UnitRead] = None

# ----------------- Product -----------------
class ProductBase(BaseModel):
    name: str
    vendor_id: str
    product_type_id: Optional[int] = None
    uom_id: Optional[int] = None
    price: Decimal
    minimum_stock: Decimal = Decimal("0")
    is_active: Optional[bool] = True

class ProductCreate(ProductBase):
    category_ids: Optional[List[int]] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    vendor_id: Optional[str] = None
    product_type_id: Optional[int] = None
    uom_id: Optional[int] = None
    price: Optional[Decimal] = None
    minimum_stock: Optional[Decimal] = None
    is_active: Optional[bool] = None
    category_ids: Optional[List[int]] = None

class ProductRead(ProductBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Detail Read for Product
class ProductDetailRead(ProductRead):
    vendor: Optional[VendorRead] = None
    product_type: Optional[ProductTypeRead] = None
    uom: Optional[UomRead] = None
    categories: List[CategoryRead] = []

    model_config = ConfigDict(from_attributes=True)

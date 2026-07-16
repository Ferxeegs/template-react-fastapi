"""
Product management endpoints.
"""
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_any_permission, require_permission
from app.models.auth import User
from app.models.purchasing import Product, ProductType, Uom, Category, Vendor
from app.schemas.purchasing import (
    ProductRead, ProductDetailRead, ProductCreate, ProductUpdate,
    ProductTypeRead, UomRead
)
from app.schemas.common import WebResponse
from decimal import Decimal

from app.core.exceptions import NotFoundException, ConflictException, BadRequestException
from app.services import scope_service as scope_svc

router = APIRouter()


def _require_vendor_unit_access(db: Session, user: User, vendor_id: str) -> Vendor:
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise NotFoundException("Vendor tidak ditemukan")
    scope_svc.require_unit_access(
        db, user, vendor.unit_id, not_found_message="Vendor tidak ditemukan"
    )
    return vendor


def _validate_product_categories(
    db: Session,
    user: User,
    vendor: Vendor,
    category_ids: Optional[list[int]],
) -> list[Category]:
    if not category_ids:
        return []
    if not vendor.unit_id:
        raise BadRequestException("Vendor harus memiliki unit sebelum menambahkan kategori produk")

    categories = db.query(Category).filter(Category.id.in_(category_ids)).all()
    if len(categories) != len(set(category_ids)):
        raise BadRequestException("Salah satu kategori tidak ditemukan")

    for category in categories:
        scope_svc.require_unit_access(
            db,
            user,
            category.unit_id,
            not_found_message="Kategori tidak ditemukan",
        )
        if category.unit_id != vendor.unit_id:
            raise BadRequestException(
                "Kategori produk harus berasal dari unit yang sama dengan vendor"
            )
    return categories


@router.get("/types", response_model=WebResponse[dict])
def get_product_types(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("view_product")),
):
    """
    Get all product types.
    """
    types = db.query(ProductType).order_by(ProductType.name).all()
    return WebResponse(
        status="success",
        data={
            "product_types": [ProductTypeRead.model_validate(t) for t in types]
        }
    )


@router.get("/uoms", response_model=WebResponse[dict])
def get_uoms(
    db: Session = Depends(get_db),
    _current_user: User = Depends(
        require_any_permission("view_product", "view_uom", "create_product", "update_product")
    ),
):
    """Get active units of measure (for product forms)."""
    uoms = (
        db.query(Uom)
        .filter(Uom.is_active.is_(True))
        .order_by(Uom.name)
        .all()
    )
    return WebResponse(
        status="success",
        data={
            "uoms": [UomRead.model_validate(u) for u in uoms]
        }
    )


@router.get("/", response_model=WebResponse[dict])
def get_all_products(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    all_records: bool = Query(False, alias="all"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_product")),
):
    """
    Get all products with pagination and search.
    If all=true, bypass pagination.
    """
    query = db.query(Product)
    query = scope_svc.apply_product_scope_filter(query, db, current_user)
    
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
        
    if all_records:
        products = query.order_by(Product.name).all()
        for p in products:
            db.refresh(p, ["vendor", "product_type", "uom", "categories"])
        return WebResponse(
            status="success",
            data={
                "products": [ProductDetailRead.model_validate(p) for p in products]
            }
        )
        
    total = query.count()
    offset = (page - 1) * limit
    products = query.order_by(Product.name).offset(offset).limit(limit).all()
    
    for p in products:
        db.refresh(p, ["vendor", "product_type", "uom", "categories"])
        
    total_pages = (total + limit - 1) // limit if limit > 0 else 0
    
    return WebResponse(
        status="success",
        data={
            "products": [ProductDetailRead.model_validate(p) for p in products],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages
            }
        }
    )


@router.get("/{product_id}", response_model=WebResponse[ProductDetailRead])
def get_product_by_id(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_product")),
):
    """
    Get product by ID with details.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise NotFoundException(f"Product with ID {product_id} not found")
    _require_vendor_unit_access(db, current_user, product.vendor_id)
        
    db.refresh(product, ["vendor", "product_type", "uom", "categories"])
    return WebResponse(
        status="success",
        data=ProductDetailRead.model_validate(product)
    )


@router.post("/", response_model=WebResponse[ProductDetailRead])
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("create_product")),
):
    """
    Create a new product.
    """
    _require_vendor_unit_access(db, current_user, product_in.vendor_id)
    vendor = db.query(Vendor).filter(Vendor.id == product_in.vendor_id).first()
    existing = db.query(Product).filter(
        Product.name == product_in.name,
        Product.vendor_id == product_in.vendor_id
    ).first()
    if existing:
        raise ConflictException(f"Product '{product_in.name}' already exists for this vendor")

    minimum_stock = Decimal(str(product_in.minimum_stock or 0))
    if minimum_stock < 0:
        raise BadRequestException("Minimum stok tidak boleh negatif")

    product = Product(
        id=str(uuid.uuid4()),
        name=product_in.name,
        vendor_id=product_in.vendor_id,
        product_type_id=product_in.product_type_id,
        uom_id=product_in.uom_id,
        price=product_in.price,
        minimum_stock=minimum_stock,
        is_active=product_in.is_active if product_in.is_active is not None else True
    )
    db.add(product)

    if product_in.category_ids:
        product.categories = _validate_product_categories(
            db, current_user, vendor, product_in.category_ids
        )
        
    db.commit()
    db.refresh(product, ["vendor", "product_type", "uom", "categories"])
    
    return WebResponse(
        status="success",
        message="Product created successfully",
        data=ProductDetailRead.model_validate(product)
    )


@router.put("/{product_id}", response_model=WebResponse[ProductDetailRead])
def update_product(
    product_id: str,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("update_product")),
):
    """
    Update product.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise NotFoundException(f"Product with ID {product_id} not found")
    _require_vendor_unit_access(db, current_user, product.vendor_id)
    vendor = db.query(Vendor).filter(Vendor.id == product.vendor_id).first()

    update_data = product_in.model_dump(exclude_unset=True)
    category_ids = update_data.pop("category_ids", None)

    if "vendor_id" in update_data:
        vendor = _require_vendor_unit_access(db, current_user, update_data["vendor_id"])
    
    if "name" in update_data or "vendor_id" in update_data:
        new_name = update_data.get("name", product.name)
        new_vendor_id = update_data.get("vendor_id", product.vendor_id)
        if new_name != product.name or new_vendor_id != product.vendor_id:
            existing = db.query(Product).filter(
                Product.name == new_name,
                Product.vendor_id == new_vendor_id,
                Product.id != product_id
            ).first()
            if existing:
                raise ConflictException(f"Product '{new_name}' already exists for this vendor")

    if "minimum_stock" in update_data and update_data["minimum_stock"] is not None:
        minimum_stock = Decimal(str(update_data["minimum_stock"]))
        if minimum_stock < 0:
            raise BadRequestException("Minimum stok tidak boleh negatif")
        update_data["minimum_stock"] = minimum_stock
                
    for field, value in update_data.items():
        setattr(product, field, value)
        
    if category_ids is not None:
        product.categories = _validate_product_categories(
            db, current_user, vendor, category_ids
        )
        
    db.commit()
    db.refresh(product, ["vendor", "product_type", "uom", "categories"])
    
    return WebResponse(
        status="success",
        message="Product updated successfully",
        data=ProductDetailRead.model_validate(product)
    )


@router.delete("/{product_id}", response_model=WebResponse[dict])
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("delete_product")),
):
    """
    Delete product.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise NotFoundException(f"Product with ID {product_id} not found")
    _require_vendor_unit_access(db, current_user, product.vendor_id)
        
    db.delete(product)
    db.commit()
    
    return WebResponse(
        status="success",
        message="Product deleted successfully"
    )

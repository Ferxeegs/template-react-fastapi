"""
Category management endpoints.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission, require_any_permission
from app.models.auth import User
from app.models.purchasing import Category
from app.schemas.purchasing import (
    CategoryRead, CategoryCreate, CategoryUpdate
)
from app.schemas.common import WebResponse
from app.core.exceptions import NotFoundException, ConflictException, BadRequestException
from app.services import scope_service as scope_svc

router = APIRouter()

CATEGORY_READ_PERMISSIONS = (
    "view_category",
    "view_stock",
    "view_stock_movement",
    "create_stock_movement",
)


def _category_to_read(db: Session, category: Category) -> CategoryRead:
    db.refresh(category, ["unit"])
    return CategoryRead.model_validate(category)


def _get_scoped_category_or_404(db: Session, user: User, category_id: int) -> Category:
    query = db.query(Category).filter(Category.id == category_id)
    query = scope_svc.apply_category_scope_filter(query, db, user)
    category = query.first()
    if not category:
        raise NotFoundException(f"Category with ID {category_id} not found")
    return category


def _check_duplicate_name(
    db: Session,
    name: str,
    unit_id: str,
    *,
    exclude_id: Optional[int] = None,
) -> None:
    query = db.query(Category).filter(
        Category.name == name,
        Category.unit_id == unit_id,
    )
    if exclude_id is not None:
        query = query.filter(Category.id != exclude_id)
    if query.first():
        raise ConflictException(
            f"Category with name '{name}' already exists for this unit"
        )


@router.get("/", response_model=WebResponse[dict])
def get_all_categories(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    unit_id: Optional[str] = Query(None),
    all_records: bool = Query(False, alias="all"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_permission(*CATEGORY_READ_PERMISSIONS)),
):
    """
    Get all categories with pagination and search.
    If all=true, bypass pagination.
    """
    query = db.query(Category)
    query = scope_svc.apply_category_scope_filter(query, db, current_user)

    if unit_id:
        if not scope_svc.user_can_access_unit(db, current_user, unit_id):
            raise NotFoundException("Unit tidak ditemukan")
        query = query.filter(Category.unit_id == unit_id)

    if search:
        query = query.filter(Category.name.ilike(f"%{search}%"))

    if all_records:
        categories = query.order_by(Category.name).all()
        return WebResponse(
            status="success",
            data={
                "categories": [_category_to_read(db, c) for c in categories]
            }
        )

    total = query.count()
    offset = (page - 1) * limit
    categories = query.order_by(Category.name).offset(offset).limit(limit).all()

    total_pages = (total + limit - 1) // limit if limit > 0 else 0

    return WebResponse(
        status="success",
        data={
            "categories": [_category_to_read(db, c) for c in categories],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages
            }
        }
    )


@router.get("/{category_id}", response_model=WebResponse[CategoryRead])
def get_category_by_id(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_category")),
):
    """
    Get category by ID.
    """
    category = _get_scoped_category_or_404(db, current_user, category_id)

    return WebResponse(
        status="success",
        data=_category_to_read(db, category)
    )


@router.post("/", response_model=WebResponse[CategoryRead])
def create_category(
    category_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("create_category")),
):
    """
    Create a new category.
    """
    scope_svc.require_unit_access_forbidden(
        db,
        current_user,
        category_in.unit_id,
        message="Tidak memiliki akses ke unit kategori ini",
    )
    _check_duplicate_name(db, category_in.name, category_in.unit_id)

    category = Category(name=category_in.name, unit_id=category_in.unit_id)
    db.add(category)
    db.commit()
    db.refresh(category)

    return WebResponse(
        status="success",
        message="Category created successfully",
        data=_category_to_read(db, category)
    )


@router.put("/{category_id}", response_model=WebResponse[CategoryRead])
def update_category(
    category_id: int,
    category_in: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("update_category")),
):
    """
    Update category.
    """
    category = _get_scoped_category_or_404(db, current_user, category_id)

    update_data = category_in.model_dump(exclude_unset=True)

    new_unit_id = update_data.get("unit_id", category.unit_id)
    new_name = update_data.get("name", category.name)

    if new_unit_id:
        scope_svc.require_unit_access_forbidden(
            db,
            current_user,
            new_unit_id,
            message="Tidak memiliki akses ke unit kategori ini",
        )
    else:
        raise BadRequestException("Unit kategori wajib diisi")

    if new_name != category.name or new_unit_id != category.unit_id:
        _check_duplicate_name(
            db,
            new_name,
            new_unit_id,
            exclude_id=category_id,
        )

    for field, value in update_data.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)

    return WebResponse(
        status="success",
        message="Category updated successfully",
        data=_category_to_read(db, category)
    )


@router.delete("/{category_id}", response_model=WebResponse[dict])
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("delete_category")),
):
    """
    Delete category.
    """
    category = _get_scoped_category_or_404(db, current_user, category_id)

    db.delete(category)
    db.commit()

    return WebResponse(
        status="success",
        message="Category deleted successfully"
    )

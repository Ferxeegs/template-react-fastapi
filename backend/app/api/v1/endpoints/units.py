"""
Unit management endpoints.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.api.deps import get_db, require_permission, require_any_permission
from app.models.auth import User
from app.models.unit import Unit
from app.schemas.unit import (
    UnitRead, UnitDetailRead, UnitCreate, UnitUpdate
)
from app.schemas.common import WebResponse
from app.core.exceptions import NotFoundException, BadRequestException, ConflictException
from app.services import scope_service as scope_svc

router = APIRouter()

# Permission untuk dropdown unit (PR, vendor, dll.) — tetap difilter role scope.
UNIT_READ_PERMISSIONS = (
    "view_unit",
    "create_purchase_requisition",
    "update_purchase_requisition",
    "create_vendor",
    "update_vendor",
    "view_role_scope",
    "update_role_scope",
    "view_stock",
    "view_stock_movement",
    "create_stock_movement",
)


@router.get("/", response_model=WebResponse[dict])
def get_all_units(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    all_records: bool = Query(False, alias="all"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_permission(*UNIT_READ_PERMISSIONS)),
):
    """
    Get all units with pagination and search.
    If all=true, bypass pagination.
    """
    query = db.query(Unit)
    query = scope_svc.apply_unit_scope_filter(query, Unit.id, db, current_user)
    
    if search:
        query = query.filter(Unit.name.ilike(f"%{search}%"))
        
    if all_records:
        units = query.order_by(Unit.name).all()
        for u in units:
            db.refresh(u, ["parent"])
        return WebResponse(
            status="success",
            data={
                "units": [UnitDetailRead.model_validate(u) for u in units]
            }
        )
        
    total = query.count()
    offset = (page - 1) * limit
    units = query.order_by(Unit.name).offset(offset).limit(limit).all()
    
    for u in units:
        db.refresh(u, ["parent"])
        
    total_pages = (total + limit - 1) // limit if limit > 0 else 0
    
    return WebResponse(
        status="success",
        data={
            "units": [UnitDetailRead.model_validate(u) for u in units],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages
            }
        }
    )


@router.get("/{unit_id}", response_model=WebResponse[UnitDetailRead])
def get_unit_by_id(
    unit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_unit")),
):
    """
    Get unit by ID with details.
    """
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise NotFoundException(f"Unit with ID {unit_id} not found")
    scope_svc.require_unit_access(db, current_user, unit.id, not_found_message=f"Unit with ID {unit_id} not found")
        
    db.refresh(unit, ["parent", "children"])
    return WebResponse(
        status="success",
        data=UnitDetailRead.model_validate(unit)
    )


@router.post("/", response_model=WebResponse[UnitDetailRead])
def create_unit(
    unit_in: UnitCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("create_unit")),
):
    """
    Create a new unit.
    """
    existing = db.query(Unit).filter(Unit.name == unit_in.name).first()
    if existing:
        raise ConflictException(f"Unit with name '{unit_in.name}' already exists")
        
    if unit_in.parent_id:
        parent = db.query(Unit).filter(Unit.id == unit_in.parent_id).first()
        if not parent:
            raise NotFoundException(f"Parent unit with ID {unit_in.parent_id} not found")
            
    unit = Unit(
        name=unit_in.name,
        parent_id=unit_in.parent_id
    )
    db.add(unit)
    db.commit()
    db.refresh(unit, ["parent", "children"])
    
    return WebResponse(
        status="success",
        message="Unit created successfully",
        data=UnitDetailRead.model_validate(unit)
    )


@router.put("/{unit_id}", response_model=WebResponse[UnitDetailRead])
def update_unit(
    unit_id: str,
    unit_in: UnitUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("update_unit")),
):
    """
    Update unit.
    """
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise NotFoundException(f"Unit with ID {unit_id} not found")
        
    update_data = unit_in.model_dump(exclude_unset=True)
    
    if "name" in update_data and update_data["name"] != unit.name:
        existing = db.query(Unit).filter(
            Unit.name == update_data["name"],
            Unit.id != unit_id
        ).first()
        if existing:
            raise ConflictException(f"Unit with name '{update_data['name']}' already exists")
            
    if "parent_id" in update_data and update_data["parent_id"]:
        if update_data["parent_id"] == unit_id:
            raise BadRequestException("A unit cannot be its own parent")
            
        curr_parent_id = update_data["parent_id"]
        while curr_parent_id:
            if curr_parent_id == unit_id:
                raise BadRequestException("Cyclic parent relationship detected")
            curr_parent = db.query(Unit).filter(Unit.id == curr_parent_id).first()
            curr_parent_id = curr_parent.parent_id if curr_parent else None
            
        parent = db.query(Unit).filter(Unit.id == update_data["parent_id"]).first()
        if not parent:
            raise NotFoundException(f"Parent unit with ID {update_data['parent_id']} not found")
            
    for field, value in update_data.items():
        setattr(unit, field, value)
        
    db.commit()
    db.refresh(unit, ["parent", "children"])
    
    return WebResponse(
        status="success",
        message="Unit updated successfully",
        data=UnitDetailRead.model_validate(unit)
    )


@router.delete("/{unit_id}", response_model=WebResponse[dict])
def delete_unit(
    unit_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("delete_unit")),
):
    """
    Delete unit.
    """
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise NotFoundException(f"Unit with ID {unit_id} not found")
        
    db.delete(unit)
    db.commit()
    
    return WebResponse(
        status="success",
        message="Unit deleted successfully"
    )

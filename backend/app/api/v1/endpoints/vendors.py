"""
Vendor management endpoints.
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission
from app.models.auth import User
from app.models.purchasing import Vendor, VendorStatus
from app.schemas.purchasing import (
    VendorRead, VendorDetailRead, VendorCreate, VendorUpdate, VendorStatusRead
)
from app.schemas.common import WebResponse
from app.core.exceptions import NotFoundException, ConflictException
from app.services import scope_service as scope_svc

router = APIRouter()


def _check_vendor_name_unique(
    db: Session,
    company_name: str,
    unit_id: Optional[str],
    *,
    exclude_id: Optional[str] = None,
) -> None:
    query = db.query(Vendor).filter(Vendor.company_name == company_name)
    if unit_id:
        query = query.filter(Vendor.unit_id == unit_id)
    else:
        query = query.filter(Vendor.unit_id.is_(None))
    if exclude_id:
        query = query.filter(Vendor.id != exclude_id)
    if query.first():
        raise ConflictException(
            f"Vendor dengan nama '{company_name}' sudah ada di unit ini"
        )


@router.get("/statuses", response_model=WebResponse[dict])
def get_vendor_statuses(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("view_vendor")),
):
    """
    Get all vendor statuses.
    """
    statuses = db.query(VendorStatus).order_by(VendorStatus.status_name).all()
    return WebResponse(
        status="success",
        data={
            "statuses": [VendorStatusRead.model_validate(s) for s in statuses]
        }
    )


@router.get("/", response_model=WebResponse[dict])
def get_all_vendors(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    all_records: bool = Query(False, alias="all"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_vendor")),
):
    """
    Get all vendors with pagination and search.
    If all=true, bypass pagination.
    """
    query = db.query(Vendor)
    query = scope_svc.apply_unit_scope_filter(query, Vendor.unit_id, db, current_user)
    
    if search:
        query = query.filter(Vendor.company_name.ilike(f"%{search}%"))
        
    if all_records:
        vendors = query.order_by(Vendor.company_name).all()
        for v in vendors:
            db.refresh(v, ["status", "unit"])
        return WebResponse(
            status="success",
            data={
                "vendors": [VendorDetailRead.model_validate(v) for v in vendors]
            }
        )
        
    total = query.count()
    offset = (page - 1) * limit
    vendors = query.order_by(Vendor.company_name).offset(offset).limit(limit).all()
    
    for v in vendors:
        db.refresh(v, ["status", "unit"])
        
    total_pages = (total + limit - 1) // limit if limit > 0 else 0
    
    return WebResponse(
        status="success",
        data={
            "vendors": [VendorDetailRead.model_validate(v) for v in vendors],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages
            }
        }
    )


@router.get("/{vendor_id}", response_model=WebResponse[VendorDetailRead])
def get_vendor_by_id(
    vendor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_vendor")),
):
    """
    Get vendor by ID with details.
    """
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise NotFoundException(f"Vendor with ID {vendor_id} not found")
    scope_svc.require_unit_access(db, current_user, vendor.unit_id, not_found_message=f"Vendor with ID {vendor_id} not found")
        
    db.refresh(vendor, ["status", "unit"])
    return WebResponse(
        status="success",
        data=VendorDetailRead.model_validate(vendor)
    )


@router.post("/", response_model=WebResponse[VendorDetailRead])
def create_vendor(
    vendor_in: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("create_vendor")),
):
    """
    Create a new vendor.
    """
    scope_svc.require_unit_access_forbidden(
        db, current_user, vendor_in.unit_id, message="Tidak memiliki akses ke unit vendor ini"
    )
    _check_vendor_name_unique(db, vendor_in.company_name, vendor_in.unit_id)
        
    vendor = Vendor(
        id=str(uuid.uuid4()),
        company_name=vendor_in.company_name,
        unit_id=vendor_in.unit_id,
        vendor_status_id=vendor_in.vendor_status_id,
        phone=vendor_in.phone,
        address=vendor_in.address
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor, ["status", "unit"])
    
    return WebResponse(
        status="success",
        message="Vendor created successfully",
        data=VendorDetailRead.model_validate(vendor)
    )


@router.put("/{vendor_id}", response_model=WebResponse[VendorDetailRead])
def update_vendor(
    vendor_id: str,
    vendor_in: VendorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("update_vendor")),
):
    """
    Update vendor.
    """
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise NotFoundException(f"Vendor with ID {vendor_id} not found")
    scope_svc.require_unit_access(db, current_user, vendor.unit_id, not_found_message=f"Vendor with ID {vendor_id} not found")
        
    update_data = vendor_in.model_dump(exclude_unset=True)
    if "unit_id" in update_data:
        scope_svc.require_unit_access_forbidden(
            db, current_user, update_data["unit_id"], message="Tidak memiliki akses ke unit vendor ini"
        )

    new_name = update_data.get("company_name", vendor.company_name)
    new_unit_id = update_data.get("unit_id", vendor.unit_id)
    if new_name != vendor.company_name or new_unit_id != vendor.unit_id:
        _check_vendor_name_unique(
            db, new_name, new_unit_id, exclude_id=vendor_id
        )
            
    for field, value in update_data.items():
        setattr(vendor, field, value)
        
    db.commit()
    db.refresh(vendor, ["status", "unit"])
    
    return WebResponse(
        status="success",
        message="Vendor updated successfully",
        data=VendorDetailRead.model_validate(vendor)
    )


@router.delete("/{vendor_id}", response_model=WebResponse[dict])
def delete_vendor(
    vendor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("delete_vendor")),
):
    """
    Delete vendor.
    """
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise NotFoundException(f"Vendor with ID {vendor_id} not found")
    scope_svc.require_unit_access(db, current_user, vendor.unit_id, not_found_message=f"Vendor with ID {vendor_id} not found")
        
    db.delete(vendor)
    db.commit()
    
    return WebResponse(
        status="success",
        message="Vendor deleted successfully"
    )

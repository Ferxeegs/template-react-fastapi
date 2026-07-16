"""
Unit of measure (UOM) management endpoints.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_any_permission, require_permission
from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.models.auth import User
from app.models.purchasing import Product, Uom
from app.schemas.common import WebResponse
from app.schemas.purchasing import UomCreate, UomRead, UomUpdate

router = APIRouter()

UOM_READ_PERMISSIONS = (
    "view_uom",
    "view_product",
    "create_product",
    "update_product",
)


def _check_duplicate_uom(
    db: Session,
    *,
    name: Optional[str] = None,
    shortname: Optional[str] = None,
    exclude_id: Optional[int] = None,
) -> None:
    if name:
        query = db.query(Uom).filter(Uom.name == name)
        if exclude_id is not None:
            query = query.filter(Uom.id != exclude_id)
        if query.first():
            raise ConflictException(f"Satuan dengan nama '{name}' sudah ada")

    if shortname:
        query = db.query(Uom).filter(Uom.shortname == shortname)
        if exclude_id is not None:
            query = query.filter(Uom.id != exclude_id)
        if query.first():
            raise ConflictException(f"Satuan dengan singkatan '{shortname}' sudah ada")


@router.get("/", response_model=WebResponse[dict])
def get_all_uoms(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    active_only: bool = Query(False),
    all_records: bool = Query(False, alias="all"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_any_permission(*UOM_READ_PERMISSIONS)),
):
    query = db.query(Uom)

    if active_only:
        query = query.filter(Uom.is_active.is_(True))

    if search:
        term = f"%{search}%"
        query = query.filter(or_(Uom.name.ilike(term), Uom.shortname.ilike(term)))

    if all_records:
        uoms = query.order_by(Uom.name).all()
        return WebResponse(
            status="success",
            data={"uoms": [UomRead.model_validate(u) for u in uoms]},
        )

    total = query.count()
    offset = (page - 1) * limit
    uoms = query.order_by(Uom.name).offset(offset).limit(limit).all()
    total_pages = (total + limit - 1) // limit if limit > 0 else 0

    return WebResponse(
        status="success",
        data={
            "uoms": [UomRead.model_validate(u) for u in uoms],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
            },
        },
    )


@router.get("/{uom_id}", response_model=WebResponse[UomRead])
def get_uom_by_id(
    uom_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("view_uom")),
):
    uom = db.query(Uom).filter(Uom.id == uom_id).first()
    if not uom:
        raise NotFoundException(f"Satuan dengan ID {uom_id} tidak ditemukan")
    return WebResponse(status="success", data=UomRead.model_validate(uom))


@router.post("/", response_model=WebResponse[UomRead])
def create_uom(
    uom_in: UomCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("create_uom")),
):
    name = uom_in.name.strip()
    shortname = uom_in.shortname.strip()
    if not name:
        raise BadRequestException("Nama satuan wajib diisi")
    if not shortname:
        raise BadRequestException("Singkatan satuan wajib diisi")

    _check_duplicate_uom(db, name=name, shortname=shortname)

    uom = Uom(name=name, shortname=shortname, is_active=uom_in.is_active)
    db.add(uom)
    db.commit()
    db.refresh(uom)

    return WebResponse(
        status="success",
        message="Satuan berhasil ditambahkan",
        data=UomRead.model_validate(uom),
    )


@router.put("/{uom_id}", response_model=WebResponse[UomRead])
def update_uom(
    uom_id: int,
    uom_in: UomUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("update_uom")),
):
    uom = db.query(Uom).filter(Uom.id == uom_id).first()
    if not uom:
        raise NotFoundException(f"Satuan dengan ID {uom_id} tidak ditemukan")

    update_data = uom_in.model_dump(exclude_unset=True)
    new_name = update_data.get("name", uom.name)
    new_shortname = update_data.get("shortname", uom.shortname)

    if isinstance(new_name, str):
        new_name = new_name.strip()
        if not new_name:
            raise BadRequestException("Nama satuan wajib diisi")
        update_data["name"] = new_name

    if isinstance(new_shortname, str):
        new_shortname = new_shortname.strip()
        if not new_shortname:
            raise BadRequestException("Singkatan satuan wajib diisi")
        update_data["shortname"] = new_shortname

    if new_name != uom.name or new_shortname != uom.shortname:
        _check_duplicate_uom(
            db,
            name=new_name if new_name != uom.name else None,
            shortname=new_shortname if new_shortname != uom.shortname else None,
            exclude_id=uom_id,
        )

    for field, value in update_data.items():
        setattr(uom, field, value)

    db.commit()
    db.refresh(uom)

    return WebResponse(
        status="success",
        message="Satuan berhasil diperbarui",
        data=UomRead.model_validate(uom),
    )


@router.delete("/{uom_id}", response_model=WebResponse[dict])
def delete_uom(
    uom_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("delete_uom")),
):
    uom = db.query(Uom).filter(Uom.id == uom_id).first()
    if not uom:
        raise NotFoundException(f"Satuan dengan ID {uom_id} tidak ditemukan")

    in_use = db.query(Product.id).filter(Product.uom_id == uom_id).first()
    if in_use:
        raise ConflictException(
            "Satuan masih digunakan oleh produk. Nonaktifkan saja atau ubah satuan produk terlebih dahulu."
        )

    db.delete(uom)
    db.commit()

    return WebResponse(status="success", message="Satuan berhasil dihapus")

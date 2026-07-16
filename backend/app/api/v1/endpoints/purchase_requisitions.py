"""
Purchase requisition (PR) endpoints.
"""
from datetime import date
from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, require_permission
from app.models.auth import User
from app.models.procurement import PrItem, PurchaseRequisition, PurchaseType
from app.models.purchasing import Product
from app.schemas.common import WebResponse
from app.schemas.procurement import (
    ApprovalAction,
    PurchaseRequisitionCreate,
    PurchaseRequisitionDetailRead,
    PurchaseRequisitionRead,
    PurchaseRequisitionUpdate,
    PurchaseTypeRead,
)
from app.core.exceptions import NotFoundException
from app.services import procurement_service as svc
from app.services import po_pdf_service as po_pdf_svc
from app.services import pr_list_export_service as pr_list_export_svc
from app.services import pr_report_pdf_service as pr_report_pdf_svc
from app.services import scope_service as scope_svc

router = APIRouter()


def _refresh_list_item(db: Session, pr: PurchaseRequisition) -> None:
    db.refresh(pr, ["unit", "purchase_type", "items"])
    for item in pr.items or []:
        db.refresh(item, ["vendor", "product", "category"])
        if item.product is not None:
            db.refresh(item.product, ["uom"])


def _export_pr_load_options():
    return [
        joinedload(PurchaseRequisition.unit),
        joinedload(PurchaseRequisition.purchase_type),
        joinedload(PurchaseRequisition.items)
        .joinedload(PrItem.product)
        .joinedload(Product.uom),
        joinedload(PurchaseRequisition.items).joinedload(PrItem.vendor),
        joinedload(PurchaseRequisition.items).joinedload(PrItem.category),
    ]


def _apply_pr_list_filters(
    query,
    current_user: User,
    db: Session,
    *,
    search: Optional[str] = None,
    approval_status: Optional[str] = None,
    pending_approval: bool = False,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
):
    if search:
        query = query.filter(PurchaseRequisition.pr_number.ilike(f"%{search}%"))
    if approval_status:
        query = query.filter(PurchaseRequisition.approval_status == approval_status)
    if not pending_approval:
        query = scope_svc.apply_unit_scope_filter(
            query, PurchaseRequisition.unit_id, db, current_user
        )
    query = svc.apply_pr_created_date_filter(query, date_from=date_from, date_to=date_to)
    return query


def _get_prs_for_export(
    db: Session,
    current_user: User,
    *,
    search: Optional[str] = None,
    approval_status: Optional[str] = None,
    pending_approval: bool = False,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> list[PurchaseRequisition]:
    query = db.query(PurchaseRequisition)
    query = _apply_pr_list_filters(
        query,
        current_user,
        db,
        search=search,
        approval_status=approval_status,
        pending_approval=pending_approval,
        date_from=date_from,
        date_to=date_to,
    )
    query = query.options(*_export_pr_load_options()).order_by(
        PurchaseRequisition.created_at.desc()
    )

    if pending_approval:
        candidates = query.all()
        return [pr for pr in candidates if svc.can_user_approve(db, current_user, pr)]

    return query.all()


@router.get("/types", response_model=WebResponse[dict])
def get_purchase_types(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("view_purchase_requisition")),
):
    types = (
        db.query(PurchaseType)
        .filter(PurchaseType.is_active.is_(True))
        .order_by(PurchaseType.name)
        .all()
    )
    return WebResponse(
        status="success",
        data={"purchase_types": [PurchaseTypeRead.model_validate(t) for t in types]},
    )


@router.get("/", response_model=WebResponse[dict])
def list_purchase_requisitions(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    approval_status: Optional[str] = Query(None),
    pending_approval: bool = Query(False),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_purchase_requisition")),
):
    svc.validate_pr_date_range(date_from, date_to)
    query = db.query(PurchaseRequisition)
    query = _apply_pr_list_filters(
        query,
        current_user,
        db,
        search=search,
        approval_status=approval_status,
        pending_approval=pending_approval,
        date_from=date_from,
        date_to=date_to,
    )

    if pending_approval:
        candidates = query.order_by(PurchaseRequisition.created_at.desc()).all()
        filtered = [pr for pr in candidates if svc.can_user_approve(db, current_user, pr)]
        total = len(filtered)
        offset = (page - 1) * limit
        prs = filtered[offset : offset + limit]
    else:
        total = query.count()
        offset = (page - 1) * limit
        prs = (
            query.order_by(PurchaseRequisition.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    for pr in prs:
        _refresh_list_item(db, pr)

    total_pages = (total + limit - 1) // limit if limit > 0 else 0

    return WebResponse(
        status="success",
        data={
            "purchase_requisitions": [
                PurchaseRequisitionRead.model_validate(pr) for pr in prs
            ],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
            },
        },
    )


@router.get("/export")
def export_purchase_requisitions(
    search: Optional[str] = Query(None),
    approval_status: Optional[str] = Query(None),
    pending_approval: bool = Query(False),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_purchase_requisition")),
):
    svc.validate_pr_date_range(date_from, date_to)
    prs = _get_prs_for_export(
        db,
        current_user,
        search=search,
        approval_status=approval_status,
        pending_approval=pending_approval,
        date_from=date_from,
        date_to=date_to,
    )
    generated_by = current_user.fullname or current_user.username
    excel_bytes = pr_list_export_svc.generate_pr_list_excel(
        prs,
        generated_by=generated_by,
        search=search,
        approval_status=approval_status,
        pending_approval=pending_approval,
        date_from=date_from,
        date_to=date_to,
    )
    filename = pr_list_export_svc.pr_list_filename(date_from, date_to)
    ascii_name = filename.encode("ascii", "ignore").decode() or "laporan-daftar-pr.xlsx"
    encoded = quote(filename)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded}',
        },
    )


@router.get("/export/pdf")
def export_purchase_requisitions_pdf(
    search: Optional[str] = Query(None),
    approval_status: Optional[str] = Query(None),
    pending_approval: bool = Query(False),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_purchase_requisition")),
):
    svc.validate_pr_date_range(date_from, date_to)
    prs = _get_prs_for_export(
        db,
        current_user,
        search=search,
        approval_status=approval_status,
        pending_approval=pending_approval,
        date_from=date_from,
        date_to=date_to,
    )
    generated_by = current_user.fullname or current_user.username
    pdf_bytes = pr_report_pdf_svc.generate_pr_list_pdf(
        prs,
        generated_by=generated_by,
        search=search,
        approval_status=approval_status,
        pending_approval=pending_approval,
        date_from=date_from,
        date_to=date_to,
    )
    filename = pr_report_pdf_svc.pr_list_pdf_filename(date_from, date_to)
    ascii_name = filename.encode("ascii", "ignore").decode() or "laporan-daftar-pr.pdf"
    encoded = quote(filename)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded}',
        },
    )


@router.get("/{pr_id}", response_model=WebResponse[PurchaseRequisitionDetailRead])
def get_purchase_requisition(
    pr_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_purchase_requisition")),
):
    pr = db.query(PurchaseRequisition).filter(PurchaseRequisition.id == pr_id).first()
    if not pr:
        raise NotFoundException("Purchase requisition tidak ditemukan")
    svc.require_pr_view_access(db, current_user, pr)
    return WebResponse(
        status="success",
        data=svc.build_pr_detail(db, pr, current_user),
    )


@router.get("/{pr_id}/po-pdfs")
def export_pr_purchase_order_pdfs(
    pr_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_purchase_order")),
):
    pr = po_pdf_svc.get_pr_for_po_export(db, pr_id)
    svc.require_pr_view_access(db, current_user, pr)
    zip_bytes, zip_name = po_pdf_svc.generate_pr_po_pdfs_zip(db, pr)
    ascii_name = zip_name.encode("ascii", "ignore").decode() or "purchase-orders.zip"
    encoded = quote(zip_name)
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded}',
        },
    )


@router.post("/", response_model=WebResponse[PurchaseRequisitionDetailRead])
def create_purchase_requisition(
    data: PurchaseRequisitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("create_purchase_requisition")),
):
    pr = svc.create_purchase_requisition(db, current_user, data)
    return WebResponse(
        status="success",
        message="PR draft berhasil dibuat",
        data=svc.build_pr_detail(db, pr, current_user),
    )


@router.put("/{pr_id}", response_model=WebResponse[PurchaseRequisitionDetailRead])
def update_purchase_requisition(
    pr_id: str,
    data: PurchaseRequisitionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("update_purchase_requisition")),
):
    pr = svc.update_purchase_requisition(db, current_user, pr_id, data)
    return WebResponse(
        status="success",
        message="PR berhasil diperbarui",
        data=svc.build_pr_detail(db, pr, current_user),
    )


@router.delete("/{pr_id}", response_model=WebResponse[dict])
def delete_purchase_requisition(
    pr_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("delete_purchase_requisition")),
):
    svc.delete_purchase_requisition(db, current_user, pr_id)
    return WebResponse(status="success", message="PR berhasil dihapus")


@router.post("/{pr_id}/submit", response_model=WebResponse[PurchaseRequisitionDetailRead])
def submit_purchase_requisition(
    pr_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("submit_purchase_requisition")),
):
    pr = svc.submit_purchase_requisition(db, current_user, pr_id)
    return WebResponse(
        status="success",
        message="PR berhasil disubmit untuk approval",
        data=svc.build_pr_detail(db, pr, current_user),
    )


@router.post("/{pr_id}/approve", response_model=WebResponse[PurchaseRequisitionDetailRead])
def approve_purchase_requisition(
    pr_id: str,
    action: ApprovalAction = ApprovalAction(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("approve_purchase_requisition")),
):
    pr = svc.approve_purchase_requisition(db, current_user, pr_id, action)
    msg = (
        "PR disetujui dan PO telah dibuat"
        if pr.approval_status == svc.APPROVAL_APPROVED
        else "PR disetujui, menunggu approval finance"
    )
    return WebResponse(
        status="success",
        message=msg,
        data=svc.build_pr_detail(db, pr, current_user),
    )


@router.post("/{pr_id}/reject", response_model=WebResponse[PurchaseRequisitionDetailRead])
def reject_purchase_requisition(
    pr_id: str,
    action: ApprovalAction = ApprovalAction(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("approve_purchase_requisition")),
):
    pr = svc.reject_purchase_requisition(db, current_user, pr_id, action)
    return WebResponse(
        status="success",
        message="PR ditolak",
        data=svc.build_pr_detail(db, pr, current_user),
    )

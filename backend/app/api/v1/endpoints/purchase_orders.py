"""
Purchase order (PO) endpoints.
"""
from datetime import date
from typing import List, Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, require_permission
from app.models.auth import User
from app.models.procurement import (
    DeliveryStatus,
    PaymentStatus,
    PurchaseItem,
    PurchaseOrder,
    PurchaseRequisition,
)
from app.models.purchasing import Category, Product
from app.models.unit import Unit
from app.schemas.common import WebResponse
from app.schemas.procurement import (
    DeliveryStatusRead,
    PaymentStatusRead,
    PurchaseItemPriceUpdate,
    PurchaseItemQtyUpdate,
    PurchaseOrderDetailRead,
    PurchaseOrderItemListRead,
    PurchaseOrderUpdate,
)
from app.core.exceptions import NotFoundException
from app.services import purchase_order_service as po_svc
from app.services import po_pdf_service as po_pdf_svc
from app.services import po_price_variance_export_service as po_variance_export_svc
from app.services import po_list_export_service as po_list_export_svc
from app.services import po_item_list_export_service as po_item_list_export_svc
from app.services import po_item_report_pdf_service as po_item_report_pdf_svc
from app.services import po_report_pdf_service as po_report_pdf_svc
from app.services import po_report_service as po_report_svc
from app.services import scope_service as scope_svc

router = APIRouter()


@router.get("/delivery-statuses", response_model=WebResponse[dict])
def get_delivery_statuses(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("view_purchase_order")),
):
    statuses = (
        db.query(DeliveryStatus)
        .filter(DeliveryStatus.is_active.is_(True))
        .order_by(DeliveryStatus.id)
        .all()
    )
    return WebResponse(
        status="success",
        data={"delivery_statuses": [DeliveryStatusRead.model_validate(s) for s in statuses]},
    )


@router.get("/payment-statuses", response_model=WebResponse[dict])
def get_payment_statuses(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("view_purchase_order")),
):
    statuses = (
        db.query(PaymentStatus)
        .filter(PaymentStatus.is_active.is_(True))
        .order_by(PaymentStatus.id)
        .all()
    )
    return WebResponse(
        status="success",
        data={"payment_statuses": [PaymentStatusRead.model_validate(s) for s in statuses]},
    )


@router.get("/reports/price-variance", response_model=WebResponse[dict])
def get_pr_po_price_variance_report(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    pr_id: Optional[str] = Query(None),
    unit_id: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    only_variance: bool = Query(False),
    unpaid_only: bool = Query(False),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_po_price_variance_report")),
):
    po_svc.validate_po_date_range(date_from, date_to)
    rows, total = po_report_svc.get_pr_po_price_variance_report(
        db,
        current_user,
        page=page,
        limit=limit,
        search=search,
        pr_id=pr_id,
        unit_id=unit_id,
        vendor_id=vendor_id,
        only_variance=only_variance,
        unpaid_only=unpaid_only,
        date_from=date_from,
        date_to=date_to,
    )
    total_pages = (total + limit - 1) // limit if limit > 0 else 0
    return WebResponse(
        status="success",
        data={
            "rows": [r.model_dump() for r in rows],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
            },
        },
    )


@router.get("/reports/price-variance/export")
def export_pr_po_price_variance_report(
    search: Optional[str] = Query(None),
    pr_id: Optional[str] = Query(None),
    unit_id: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    only_variance: bool = Query(False),
    unpaid_only: bool = Query(False),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_po_price_variance_report")),
):
    po_svc.validate_po_date_range(date_from, date_to)
    rows, _total = po_report_svc.get_pr_po_price_variance_report(
        db,
        current_user,
        search=search,
        pr_id=pr_id,
        unit_id=unit_id,
        vendor_id=vendor_id,
        only_variance=only_variance,
        unpaid_only=unpaid_only,
        date_from=date_from,
        date_to=date_to,
        paginate=False,
    )
    unit_name = None
    if unit_id:
        unit = db.query(Unit).filter(Unit.id == unit_id).first()
        unit_name = unit.name if unit else None
    generated_by = current_user.fullname or current_user.username
    excel_bytes = po_variance_export_svc.generate_price_variance_excel(
        rows,
        generated_by=generated_by,
        search=search,
        unit_name=unit_name,
        only_variance=only_variance,
        unpaid_only=unpaid_only,
        date_from=date_from,
        date_to=date_to,
    )
    filename = po_variance_export_svc.price_variance_filename(date_from, date_to)
    ascii_name = filename.encode("ascii", "ignore").decode() or "laporan-selisih-harga-pr-po.xlsx"
    encoded = quote(filename)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded}',
        },
    )


@router.get("/reports/price-variance/export/pdf")
def export_pr_po_price_variance_report_pdf(
    search: Optional[str] = Query(None),
    pr_id: Optional[str] = Query(None),
    unit_id: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    only_variance: bool = Query(False),
    unpaid_only: bool = Query(False),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_po_price_variance_report")),
):
    po_svc.validate_po_date_range(date_from, date_to)
    rows, _total = po_report_svc.get_pr_po_price_variance_report(
        db,
        current_user,
        search=search,
        pr_id=pr_id,
        unit_id=unit_id,
        vendor_id=vendor_id,
        only_variance=only_variance,
        unpaid_only=unpaid_only,
        date_from=date_from,
        date_to=date_to,
        paginate=False,
    )
    unit_name = None
    if unit_id:
        unit = db.query(Unit).filter(Unit.id == unit_id).first()
        unit_name = unit.name if unit else None
    generated_by = current_user.fullname or current_user.username
    pdf_bytes = po_report_pdf_svc.generate_price_variance_pdf(
        rows,
        generated_by=generated_by,
        search=search,
        unit_name=unit_name,
        only_variance=only_variance,
        unpaid_only=unpaid_only,
        date_from=date_from,
        date_to=date_to,
    )
    filename = po_report_pdf_svc.price_variance_pdf_filename(date_from, date_to)
    ascii_name = filename.encode("ascii", "ignore").decode() or "laporan-selisih-harga-pr-po.pdf"
    encoded = quote(filename)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded}',
        },
    )


@router.get("/", response_model=WebResponse[dict])
def list_purchase_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    pr_id: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    delivery_status_id: Optional[int] = Query(None),
    payment_status_id: Optional[int] = Query(None),
    incomplete_unpaid: bool = Query(False),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_purchase_order")),
):
    po_svc.validate_po_date_range(date_from, date_to)
    query = db.query(PurchaseOrder)
    query = po_svc.apply_po_list_filters(
        query,
        db,
        current_user,
        search=search,
        pr_id=pr_id,
        vendor_id=vendor_id,
        delivery_status_id=delivery_status_id,
        payment_status_id=payment_status_id,
        incomplete_unpaid=incomplete_unpaid,
        date_from=date_from,
        date_to=date_to,
    )

    total = query.count()
    offset = (page - 1) * limit
    orders = (
        query.order_by(PurchaseOrder.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    total_pages = (total + limit - 1) // limit if limit > 0 else 0

    return WebResponse(
        status="success",
        data={
            "purchase_orders": [
                po_svc.build_po_read(db, po, include_items=False) for po in orders
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
def export_purchase_orders(
    search: Optional[str] = Query(None),
    pr_id: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    delivery_status_id: Optional[int] = Query(None),
    payment_status_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_purchase_order")),
):
    po_svc.validate_po_date_range(date_from, date_to)
    query = db.query(PurchaseOrder)
    query = po_svc.apply_po_list_filters(
        query,
        db,
        current_user,
        search=search,
        pr_id=pr_id,
        vendor_id=vendor_id,
        delivery_status_id=delivery_status_id,
        payment_status_id=payment_status_id,
        date_from=date_from,
        date_to=date_to,
    )
    orders = (
        query.options(
            joinedload(PurchaseOrder.purchase_requisition),
            joinedload(PurchaseOrder.vendor),
            joinedload(PurchaseOrder.delivery_status),
            joinedload(PurchaseOrder.payment_status),
            joinedload(PurchaseOrder.items)
            .joinedload(PurchaseItem.product)
            .joinedload(Product.uom),
        )
        .order_by(PurchaseOrder.created_at.desc())
        .all()
    )

    # Get status names for metadata
    delivery_status = None
    if delivery_status_id:
        ds = db.query(DeliveryStatus).filter(DeliveryStatus.id == delivery_status_id).first()
        delivery_status = ds.name if ds else None

    payment_status = None
    if payment_status_id:
        ps = db.query(PaymentStatus).filter(PaymentStatus.id == payment_status_id).first()
        payment_status = ps.name if ps else None

    generated_by = current_user.fullname or current_user.username
    excel_bytes = po_list_export_svc.generate_po_list_excel(
        orders,
        generated_by=generated_by,
        search=search,
        delivery_status=delivery_status,
        payment_status=payment_status,
        date_from=date_from,
        date_to=date_to,
    )
    filename = po_list_export_svc.po_list_filename(date_from, date_to)
    ascii_name = filename.encode("ascii", "ignore").decode() or "laporan-daftar-po.xlsx"
    encoded = quote(filename)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded}',
        },
    )


@router.get("/export/pdf")
def export_purchase_orders_pdf(
    search: Optional[str] = Query(None),
    pr_id: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    delivery_status_id: Optional[int] = Query(None),
    payment_status_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_purchase_order")),
):
    po_svc.validate_po_date_range(date_from, date_to)
    query = db.query(PurchaseOrder)
    query = po_svc.apply_po_list_filters(
        query,
        db,
        current_user,
        search=search,
        pr_id=pr_id,
        vendor_id=vendor_id,
        delivery_status_id=delivery_status_id,
        payment_status_id=payment_status_id,
        date_from=date_from,
        date_to=date_to,
    )
    orders = (
        query.options(
            joinedload(PurchaseOrder.purchase_requisition),
            joinedload(PurchaseOrder.vendor),
            joinedload(PurchaseOrder.delivery_status),
            joinedload(PurchaseOrder.payment_status),
            joinedload(PurchaseOrder.items)
            .joinedload(PurchaseItem.product)
            .joinedload(Product.uom),
        )
        .order_by(PurchaseOrder.created_at.desc())
        .all()
    )

    delivery_status = None
    if delivery_status_id:
        ds = db.query(DeliveryStatus).filter(DeliveryStatus.id == delivery_status_id).first()
        delivery_status = ds.name if ds else None

    payment_status = None
    if payment_status_id:
        ps = db.query(PaymentStatus).filter(PaymentStatus.id == payment_status_id).first()
        payment_status = ps.name if ps else None

    generated_by = current_user.fullname or current_user.username
    pdf_bytes = po_report_pdf_svc.generate_po_list_pdf(
        orders,
        generated_by=generated_by,
        search=search,
        delivery_status=delivery_status,
        payment_status=payment_status,
        date_from=date_from,
        date_to=date_to,
    )
    filename = po_report_pdf_svc.po_list_pdf_filename(date_from, date_to)
    ascii_name = filename.encode("ascii", "ignore").decode() or "laporan-daftar-po.pdf"
    encoded = quote(filename)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded}',
        },
    )


def _require_po_access(db: Session, user: User, po: PurchaseOrder) -> None:
    if not po.pr_id:
        if not scope_svc.is_superadmin(db, user):
            raise NotFoundException("Purchase order tidak ditemukan")
        return
    pr = db.query(PurchaseRequisition).filter(PurchaseRequisition.id == po.pr_id).first()
    if not pr:
        if scope_svc.is_superadmin(db, user):
            return
        raise NotFoundException("Purchase order tidak ditemukan")
    scope_svc.require_unit_access(
        db, user, pr.unit_id, not_found_message="Purchase order tidak ditemukan"
    )


@router.get("/items", response_model=WebResponse[dict])
def list_purchase_order_items(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    pr_id: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    delivery_status_id: Optional[int] = Query(None),
    payment_status_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    incomplete_unpaid: bool = Query(False),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_purchase_order")),
):
    po_svc.validate_po_date_range(date_from, date_to)
    items, total = po_svc.list_purchase_order_items(
        db,
        current_user,
        page=page,
        limit=limit,
        search=search,
        pr_id=pr_id,
        vendor_id=vendor_id,
        delivery_status_id=delivery_status_id,
        payment_status_id=payment_status_id,
        category_id=category_id,
        incomplete_unpaid=incomplete_unpaid,
        date_from=date_from,
        date_to=date_to,
    )
    total_pages = (total + limit - 1) // limit if limit > 0 else 0
    return WebResponse(
        status="success",
        data={
            "purchase_order_items": items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
            },
        },
    )


def _resolve_po_item_export_meta(
    db: Session,
    *,
    delivery_status_id: Optional[int],
    payment_status_id: Optional[int],
    category_id: Optional[int],
) -> tuple[Optional[str], Optional[str], Optional[str]]:
    delivery_status = None
    if delivery_status_id:
        ds = db.query(DeliveryStatus).filter(DeliveryStatus.id == delivery_status_id).first()
        delivery_status = ds.name if ds else None

    payment_status = None
    if payment_status_id:
        ps = db.query(PaymentStatus).filter(PaymentStatus.id == payment_status_id).first()
        payment_status = ps.name if ps else None

    category_name = None
    if category_id:
        cat = db.query(Category).filter(Category.id == category_id).first()
        category_name = cat.name if cat else None

    return delivery_status, payment_status, category_name


@router.get("/items/export")
def export_purchase_order_items(
    search: Optional[str] = Query(None),
    pr_id: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    delivery_status_id: Optional[int] = Query(None),
    payment_status_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    incomplete_unpaid: bool = Query(False),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_purchase_order")),
):
    po_svc.validate_po_date_range(date_from, date_to)
    items = po_svc.get_purchase_order_items_for_export(
        db,
        current_user,
        search=search,
        pr_id=pr_id,
        vendor_id=vendor_id,
        delivery_status_id=delivery_status_id,
        payment_status_id=payment_status_id,
        category_id=category_id,
        incomplete_unpaid=incomplete_unpaid,
        date_from=date_from,
        date_to=date_to,
    )
    delivery_status, payment_status, category_name = _resolve_po_item_export_meta(
        db,
        delivery_status_id=delivery_status_id,
        payment_status_id=payment_status_id,
        category_id=category_id,
    )
    generated_by = current_user.fullname or current_user.username
    excel_bytes = po_item_list_export_svc.generate_po_item_list_excel(
        items,
        generated_by=generated_by,
        search=search,
        delivery_status=delivery_status,
        payment_status=payment_status,
        category_name=category_name,
        date_from=date_from,
        date_to=date_to,
    )
    filename = po_item_list_export_svc.po_item_list_filename(date_from, date_to)
    ascii_name = filename.encode("ascii", "ignore").decode() or "laporan-item-po.xlsx"
    encoded = quote(filename)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded}',
        },
    )


@router.get("/items/export/pdf")
def export_purchase_order_items_pdf(
    search: Optional[str] = Query(None),
    pr_id: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    delivery_status_id: Optional[int] = Query(None),
    payment_status_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    incomplete_unpaid: bool = Query(False),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_purchase_order")),
):
    po_svc.validate_po_date_range(date_from, date_to)
    items = po_svc.get_purchase_order_items_for_export(
        db,
        current_user,
        search=search,
        pr_id=pr_id,
        vendor_id=vendor_id,
        delivery_status_id=delivery_status_id,
        payment_status_id=payment_status_id,
        category_id=category_id,
        incomplete_unpaid=incomplete_unpaid,
        date_from=date_from,
        date_to=date_to,
    )
    delivery_status, payment_status, category_name = _resolve_po_item_export_meta(
        db,
        delivery_status_id=delivery_status_id,
        payment_status_id=payment_status_id,
        category_id=category_id,
    )
    generated_by = current_user.fullname or current_user.username
    pdf_bytes = po_item_report_pdf_svc.generate_po_item_list_pdf(
        items,
        generated_by=generated_by,
        search=search,
        delivery_status=delivery_status,
        payment_status=payment_status,
        category_name=category_name,
        date_from=date_from,
        date_to=date_to,
    )
    filename = po_item_report_pdf_svc.po_item_list_pdf_filename(date_from, date_to)
    ascii_name = filename.encode("ascii", "ignore").decode() or "laporan-item-po.pdf"
    encoded = quote(filename)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded}',
        },
    )


@router.get("/{po_id}/pdf")
def export_purchase_order_pdf(
    po_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_purchase_order")),
):
    po = po_pdf_svc.get_po_for_pdf(db, po_id)
    _require_po_access(db, current_user, po)
    pdf_bytes = po_pdf_svc.generate_po_pdf(db, po)
    filename = po_pdf_svc.po_pdf_filename(po)
    ascii_name = filename.encode("ascii", "ignore").decode() or "purchase-order.pdf"
    encoded = quote(filename)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded}',
        },
    )


@router.get("/{po_id}", response_model=WebResponse[PurchaseOrderDetailRead])
def get_purchase_order(
    po_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_purchase_order")),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise NotFoundException("Purchase order tidak ditemukan")
    _require_po_access(db, current_user, po)
    return WebResponse(
        status="success",
        data=po_svc.build_po_detail(db, po, current_user=current_user),
    )


@router.post(
    "/{po_id}/items/{item_id}/delivery-status",
    response_model=WebResponse[PurchaseOrderDetailRead],
)
async def update_po_item_delivery_status(
    po_id: str,
    item_id: str,
    status_id: int = Form(...),
    notes: Optional[str] = Form(None),
    proof: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("update_po_item_delivery_status")),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise NotFoundException("Purchase order tidak ditemukan")
    _require_po_access(db, current_user, po)
    po = await po_svc.update_item_delivery_status(
        db,
        po_id,
        item_id,
        status_id,
        user=current_user,
        notes=notes,
        proofs=proof or None,
    )
    return WebResponse(
        status="success",
        message="Status pengiriman item berhasil diperbarui",
        data=po_svc.build_po_detail(db, po, current_user=current_user),
    )


@router.post(
    "/{po_id}/items/{item_id}/payment-status",
    response_model=WebResponse[PurchaseOrderDetailRead],
)
async def update_po_item_payment_status(
    po_id: str,
    item_id: str,
    status_id: int = Form(...),
    notes: Optional[str] = Form(None),
    proof: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("update_po_item_payment_status")),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise NotFoundException("Purchase order tidak ditemukan")
    _require_po_access(db, current_user, po)
    po = await po_svc.update_item_payment_status(
        db,
        po_id,
        item_id,
        status_id,
        user=current_user,
        notes=notes,
        proofs=proof or None,
    )
    return WebResponse(
        status="success",
        message="Status pembayaran item berhasil diperbarui",
        data=po_svc.build_po_detail(db, po, current_user=current_user),
    )


@router.patch(
    "/{po_id}/items/{item_id}/price",
    response_model=WebResponse[PurchaseOrderDetailRead],
)
def update_po_item_price(
    po_id: str,
    item_id: str,
    data: PurchaseItemPriceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("update_po_item_price")),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise NotFoundException("Purchase order tidak ditemukan")
    _require_po_access(db, current_user, po)
    po = po_svc.update_purchase_item_price(
        db,
        po_id,
        item_id,
        data.real_price,
        user=current_user,
        notes=data.notes,
    )
    return WebResponse(
        status="success",
        message="Harga item PO berhasil diperbarui",
        data=po_svc.build_po_detail(db, po, current_user=current_user),
    )


@router.patch(
    "/{po_id}/items/{item_id}/qty",
    response_model=WebResponse[PurchaseOrderDetailRead],
)
def update_po_item_qty(
    po_id: str,
    item_id: str,
    data: PurchaseItemQtyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("update_po_item_qty")),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise NotFoundException("Purchase order tidak ditemukan")
    _require_po_access(db, current_user, po)
    po = po_svc.update_purchase_item_qty(
        db,
        po_id,
        item_id,
        data.real_qty,
        user=current_user,
        notes=data.notes,
    )
    return WebResponse(
        status="success",
        message="Qty item PO berhasil diperbarui",
        data=po_svc.build_po_detail(db, po, current_user=current_user),
    )


@router.put("/{po_id}", response_model=WebResponse[PurchaseOrderDetailRead])
def update_purchase_order(
    po_id: str,
    data: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("update_purchase_order")),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise NotFoundException("Purchase order tidak ditemukan")
    _require_po_access(db, current_user, po)
    po = po_svc.update_purchase_order(db, po_id, data, user=current_user)
    return WebResponse(
        status="success",
        message="PO berhasil diperbarui",
        data=po_svc.build_po_detail(db, po, current_user=current_user),
    )

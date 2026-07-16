"""
PO reporting — PR vs PO price variance.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.auth import User
from app.models.procurement import PaymentStatus, PrItem, PurchaseItem, PurchaseOrder, PurchaseRequisition
from app.schemas.procurement import PrPoPriceVarianceRow
from app.services import scope_service as scope_svc
from app.utils.helpers import wib_date_end_as_utc_naive, wib_date_start_as_utc_naive


def _item_product_name(item: PurchaseItem) -> str:
    if item.product and item.product.name:
        return item.product.name
    return item.description or "-"


def get_pr_po_price_variance_report(
    db: Session,
    user: User,
    *,
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    pr_id: Optional[str] = None,
    unit_id: Optional[str] = None,
    vendor_id: Optional[str] = None,
    only_variance: bool = False,
    unpaid_only: bool = False,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    paginate: bool = True,
) -> tuple[list[PrPoPriceVarianceRow], int]:
    query = (
        db.query(PurchaseItem)
        .join(PurchaseOrder, PurchaseItem.po_id == PurchaseOrder.id)
        .outerjoin(PrItem, PurchaseItem.pr_item_id == PrItem.id)
        .outerjoin(PurchaseRequisition, PurchaseOrder.pr_id == PurchaseRequisition.id)
        .options(
            joinedload(PurchaseItem.product),
            joinedload(PurchaseItem.pr_item),
            joinedload(PurchaseItem.payment_status),
            joinedload(PurchaseItem.purchase_order).joinedload(PurchaseOrder.vendor),
            joinedload(PurchaseItem.purchase_order).joinedload(PurchaseOrder.purchase_requisition).joinedload(
                PurchaseRequisition.unit
            ),
        )
    )

    po_ids_subq = scope_svc.apply_po_scope_filter(
        db.query(PurchaseOrder.id), db, user
    ).scalar_subquery()
    query = query.filter(PurchaseItem.po_id.in_(po_ids_subq))

    if pr_id:
        query = query.filter(PurchaseOrder.pr_id == pr_id)
    if unit_id:
        query = query.filter(PurchaseRequisition.unit_id == unit_id)
    if vendor_id:
        query = query.filter(PurchaseOrder.vendor_id == vendor_id)
    if search:
        like = f"%{search}%"
        query = query.filter(
            PurchaseOrder.po_number.ilike(like)
            | PurchaseRequisition.pr_number.ilike(like)
        )
    if unpaid_only:
        query = query.join(PaymentStatus, PurchaseItem.payment_status_id == PaymentStatus.id).filter(
            PaymentStatus.name != "Lunas"
        )
    if date_from:
        query = query.filter(PurchaseOrder.created_at >= wib_date_start_as_utc_naive(date_from))
    if date_to:
        query = query.filter(PurchaseOrder.created_at <= wib_date_end_as_utc_naive(date_to))

    rows = query.order_by(PurchaseOrder.created_at.desc(), PurchaseItem.id).all()

    report_rows: list[PrPoPriceVarianceRow] = []
    for item in rows:
        po = item.purchase_order
        pr = po.purchase_requisition if po else None
        pr_item = item.pr_item if item.pr_item_id else None

        pr_price = Decimal(str(pr_item.request_price if pr_item else 0))
        pr_total = Decimal(str(pr_item.request_total if pr_item else 0))
        orig_price = Decimal(str(item.original_real_price if item.original_real_price is not None else item.real_price))
        orig_total = Decimal(str(item.original_real_total if item.original_real_total is not None else item.real_total))
        curr_price = Decimal(str(item.real_price))
        curr_total = Decimal(str(item.real_total))

        has_price_change = curr_price != orig_price
        differs_from_pr = curr_price != pr_price

        if only_variance and not (has_price_change or differs_from_pr):
            continue

        report_rows.append(
            PrPoPriceVarianceRow(
                purchase_item_id=item.id,
                po_id=po.id if po else "",
                po_number=po.po_number if po else "-",
                pr_id=pr.id if pr else None,
                pr_number=pr.pr_number if pr else None,
                unit_id=pr.unit_id if pr else None,
                unit_name=pr.unit.name if pr and pr.unit else None,
                vendor_id=po.vendor_id if po else None,
                vendor_name=po.vendor.company_name if po and po.vendor else None,
                product_name=_item_product_name(item),
                real_qty=Decimal(str(item.real_qty)),
                pr_request_price=pr_price,
                pr_request_total=pr_total,
                original_po_price=orig_price,
                original_po_total=orig_total,
                current_po_price=curr_price,
                current_po_total=curr_total,
                price_variance=curr_price - pr_price,
                total_variance=curr_total - pr_total,
                payment_status=item.payment_status.name if item.payment_status else None,
                has_price_change=has_price_change,
                differs_from_pr=differs_from_pr,
            )
        )

    total = len(report_rows)
    if not paginate:
        return report_rows, total
    offset = (page - 1) * limit
    return report_rows[offset : offset + limit], total

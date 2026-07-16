"""
Dashboard statistics and summary endpoints.
Data is filtered by the current user's role scope (unit access).
"""
from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission
from app.models.auth import User
from app.models.inventory import ProductStock
from app.models.procurement import (
    DeliveryStatus,
    PaymentStatus,
    PrItem,
    PurchaseOrder,
    PurchaseRequisition,
)
from app.models.purchasing import Category, Product, Vendor
from app.models.unit import Unit
from app.schemas.common import WebResponse
from app.services import scope_service as scope_svc

router = APIRouter()

_PENDING_PR_STATUSES = frozenset(
    {"pending", "pending_brand_manager", "pending_finance"}
)


def _bucket_pr_status(status: str | None) -> str | None:
    if not status:
        return None
    key = status.lower()
    if key == "draft":
        return "draft"
    if key == "approved":
        return "approved"
    if key == "rejected":
        return "rejected"
    if key in _PENDING_PR_STATUSES or key.startswith("pending"):
        return "pending"
    return None


def _build_pr_status_dict(status_rows: list[tuple[str | None, int]]) -> dict[str, int]:
    result = {"draft": 0, "pending": 0, "approved": 0, "rejected": 0}
    for status, count in status_rows:
        bucket = _bucket_pr_status(status)
        if bucket:
            result[bucket] += count
    return result


@router.get("/summary", response_model=WebResponse[Dict[str, Any]])
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_purchase_requisition")),
):
    products_q = scope_svc.apply_product_scope_filter(db.query(Product), db, current_user)
    products_count = products_q.count()

    vendors_q = scope_svc.apply_unit_scope_filter(
        db.query(Vendor), Vendor.unit_id, db, current_user
    )
    vendors_count = vendors_q.count()

    if scope_svc.is_superadmin(db, current_user):
        users_count = db.query(User).filter(User.deleted_at.is_(None)).count()
    else:
        users_count = 0

    categories_q = scope_svc.apply_category_scope_filter(db.query(Category), db, current_user)
    categories_count = categories_q.count()

    units_q = scope_svc.apply_unit_scope_filter(db.query(Unit), Unit.id, db, current_user)
    units_count = units_q.count()

    low_stock_q = scope_svc.apply_unit_scope_filter(
        db.query(ProductStock)
        .join(Product, ProductStock.product_id == Product.id)
        .filter(
            Product.minimum_stock > 0,
            ProductStock.qty_on_hand < Product.minimum_stock,
        ),
        ProductStock.unit_id,
        db,
        current_user,
    )
    low_stock_count = low_stock_q.count()

    pr_q = scope_svc.apply_unit_scope_filter(
        db.query(PurchaseRequisition), PurchaseRequisition.unit_id, db, current_user
    )
    total_prs = pr_q.count()

    pr_status_counts = (
        scope_svc.apply_unit_scope_filter(
            db.query(
                PurchaseRequisition.approval_status,
                func.count(PurchaseRequisition.id),
            ),
            PurchaseRequisition.unit_id,
            db,
            current_user,
        )
        .group_by(PurchaseRequisition.approval_status)
        .all()
    )
    pr_status_dict = _build_pr_status_dict(pr_status_counts)

    po_q = scope_svc.apply_po_scope_filter(db.query(PurchaseOrder), db, current_user)
    total_pos = po_q.count()

    po_delivery_counts = (
        scope_svc.apply_po_scope_filter(db.query(PurchaseOrder), db, current_user)
        .join(DeliveryStatus, PurchaseOrder.delivery_status_id == DeliveryStatus.id)
        .with_entities(DeliveryStatus.name, func.count(PurchaseOrder.id))
        .group_by(DeliveryStatus.name)
        .all()
    )
    po_delivery_dict = {name: count for name, count in po_delivery_counts}

    po_payment_counts = (
        scope_svc.apply_po_scope_filter(db.query(PurchaseOrder), db, current_user)
        .join(PaymentStatus, PurchaseOrder.payment_status_id == PaymentStatus.id)
        .with_entities(PaymentStatus.name, func.count(PurchaseOrder.id))
        .group_by(PaymentStatus.name)
        .all()
    )
    po_payment_dict = {name: count for name, count in po_payment_counts}

    recent_prs = (
        scope_svc.apply_unit_scope_filter(
            db.query(PurchaseRequisition), PurchaseRequisition.unit_id, db, current_user
        )
        .order_by(PurchaseRequisition.created_at.desc())
        .limit(5)
        .all()
    )

    recent_prs_list = []
    for pr in recent_prs:
        items_total = (
            db.query(func.sum(PrItem.request_total)).filter(PrItem.pr_id == pr.id).scalar() or 0
        )

        creator_name = "System"
        if pr.created_by:
            creator = db.query(User).filter(User.id == pr.created_by).first()
            if creator:
                creator_name = creator.fullname or creator.username

        recent_prs_list.append(
            {
                "id": pr.id,
                "pr_number": pr.pr_number,
                "approval_status": pr.approval_status,
                "created_at": pr.created_at,
                "unit_name": pr.unit.name if pr.unit else None,
                "created_by_name": creator_name,
                "total_amount": float(items_total),
            }
        )

    return WebResponse(
        status="success",
        data={
            "counts": {
                "products": products_count,
                "vendors": vendors_count,
                "users": users_count,
                "categories": categories_count,
                "units": units_count,
                "lowStockAlerts": low_stock_count,
                "purchaseRequisitions": {
                    "total": total_prs,
                    **pr_status_dict,
                },
                "purchaseOrders": {
                    "total": total_pos,
                    "delivery": po_delivery_dict,
                    "payment": po_payment_dict,
                },
            },
            "recentRequisitions": recent_prs_list,
        },
    )

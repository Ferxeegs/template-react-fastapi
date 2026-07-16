"""
Business logic for purchase requisitions, approvals, and PO generation.
"""
import uuid
from collections import defaultdict
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Query, Session

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.utils.helpers import get_now_local
from app.models.auth import User
from app.models.procurement import (
    DeliveryStatus,
    PaymentStatus,
    PrApprovalLog,
    PrItem,
    PrVendorDueDate,
    PurchaseItem,
    PurchaseOrder,
    PurchaseRequisition,
)
from app.schemas.procurement import (
    ApprovalAction,
    PrApprovalLogRead,
    PrItemCreate,
    PrVendorDueDateCreate,
    PurchaseRequisitionCreate,
    PurchaseRequisitionDetailRead,
    PurchaseRequisitionRead,
    PurchaseRequisitionUpdate,
)
from app.core.deps_permission import user_has_permission
from app.services import purchase_order_service as po_svc
from app.services import scope_service as scope_svc

APPROVAL_DRAFT = "draft"
APPROVAL_PENDING_BRAND = "pending_brand_manager"
APPROVAL_PENDING_FINANCE = "pending_finance"
APPROVAL_APPROVED = "approved"
APPROVAL_REJECTED = "rejected"


def _is_superadmin(db: Session, user: User) -> bool:
    return scope_svc.is_superadmin(db, user)


def _user_has_role(db: Session, user: User, role_name: str) -> bool:
    return scope_svc.user_has_role(db, user, role_name)


def _get_user_scopes(db: Session, user_id: str, role_name: str) -> list[str]:
    return scope_svc.get_user_scopes_for_role(db, user_id, role_name)


def _user_has_scope_for_unit(db: Session, user: User, role_name: str, unit_id: Optional[str]) -> bool:
    return scope_svc.user_has_scope_for_role_unit(
        db, user, role_name, unit_id, empty_scope_means_all=True
    )


def _require_pr_access(db: Session, user: User, pr: PurchaseRequisition) -> None:
    scope_svc.require_unit_access(db, user, pr.unit_id, not_found_message="Purchase requisition tidak ditemukan")


def user_can_view_pr(db: Session, user: User, pr: PurchaseRequisition) -> bool:
    if scope_svc.user_can_access_unit(db, user, pr.unit_id):
        return True
    return can_user_approve(db, user, pr)


def require_pr_view_access(db: Session, user: User, pr: PurchaseRequisition) -> None:
    if not user_can_view_pr(db, user, pr):
        raise NotFoundException("Purchase requisition tidak ditemukan")


def generate_pr_number(db: Session) -> str:
    today = get_now_local().strftime("%Y%m%d")
    prefix = f"PR-{today}-"
    count = (
        db.query(PurchaseRequisition)
        .filter(PurchaseRequisition.pr_number.like(f"{prefix}%"))
        .count()
    )
    return f"{prefix}{(count + 1):04d}"


def generate_po_number(db: Session, pr_id: str, seq: int) -> str:
    today = get_now_local().strftime("%Y%m%d")
    base = f"PO-{today}-{pr_id[:8]}-{seq:02d}"
    existing = db.query(PurchaseOrder).filter(PurchaseOrder.po_number == base).first()
    if existing:
        return f"{base}-{uuid.uuid4().hex[:4]}"
    return base


def _calc_item_total(qty: Decimal, price: Decimal) -> Decimal:
    return qty * price


def _sync_pr_items(db: Session, pr: PurchaseRequisition, items: list[PrItemCreate]) -> None:
    db.query(PrItem).filter(PrItem.pr_id == pr.id).delete()
    for item_in in items:
        total = _calc_item_total(item_in.request_qty, item_in.request_price)
        db.add(
            PrItem(
                id=str(uuid.uuid4()),
                pr_id=pr.id,
                vendor_id=item_in.vendor_id,
                product_id=item_in.product_id,
                category_id=item_in.category_id,
                description=item_in.description,
                request_qty=item_in.request_qty,
                request_price=item_in.request_price,
                request_total=total,
                due_date=item_in.due_date,
            )
        )


def _sync_vendor_due_dates(
    db: Session,
    pr: PurchaseRequisition,
    entries: list[PrVendorDueDateCreate],
) -> None:
    db.query(PrVendorDueDate).filter(PrVendorDueDate.pr_id == pr.id).delete()
    for entry in entries:
        if entry.vendor_id and entry.due_date:
            db.add(
                PrVendorDueDate(
                    pr_id=pr.id,
                    vendor_id=entry.vendor_id,
                    due_date=entry.due_date,
                )
            )


def _validate_items_for_submit(items: list[PrItem]) -> None:
    if not items:
        raise BadRequestException("PR harus memiliki minimal satu item")
    for item in items:
        if not item.vendor_id:
            raise BadRequestException("Setiap item harus memiliki vendor sebelum disubmit")
        if item.request_qty <= 0:
            raise BadRequestException("Qty item harus lebih dari 0")


def _validate_item_due_dates_for_submit(items: list[PrItem]) -> None:
    missing = [item for item in items if not item.due_date]
    if missing:
        raise BadRequestException(
            "Jatuh tempo wajib diisi untuk setiap item pada pengajuan PR"
        )


def can_user_approve(db: Session, user: User, pr: PurchaseRequisition) -> bool:
    if not user_has_permission(db, user, "approve_purchase_requisition"):
        return False

    if pr.approval_status == APPROVAL_PENDING_BRAND:
        if _is_superadmin(db, user):
            return True
        return _user_has_role(db, user, "brand_manager") and _user_has_scope_for_unit(
            db, user, "brand_manager", pr.unit_id
        )
    if pr.approval_status == APPROVAL_PENDING_FINANCE:
        if _is_superadmin(db, user):
            return True
        return _user_has_role(db, user, "finance") and _user_has_scope_for_unit(
            db, user, "finance", pr.unit_id
        )
    return False


def can_user_edit(db: Session, user: User, pr: PurchaseRequisition) -> bool:
    if pr.approval_status != APPROVAL_DRAFT:
        return False
    if not scope_svc.user_can_access_unit(db, user, pr.unit_id):
        return False
    if _is_superadmin(db, user):
        return True
    return pr.created_by == user.id or _user_has_role(db, user, "purchasing")


def can_user_submit(db: Session, user: User, pr: PurchaseRequisition) -> bool:
    if not scope_svc.user_can_access_unit(db, user, pr.unit_id):
        return False
    return pr.approval_status == APPROVAL_DRAFT and (
        _is_superadmin(db, user) or _user_has_role(db, user, "purchasing")
    )


def _log_approval(
    db: Session,
    pr: PurchaseRequisition,
    user: User,
    action: str,
    approval_status: str,
    role_name: str,
    notes: Optional[str] = None,
) -> None:
    db.add(
        PrApprovalLog(
            pr_id=pr.id,
            scope_id=pr.unit_id,
            approval_status=approval_status,
            action=action,
            action_by=user.id,
            role_name=role_name,
            notes=notes,
        )
    )


def _create_purchase_orders(db: Session, pr: PurchaseRequisition) -> list[PurchaseOrder]:
    items = db.query(PrItem).filter(PrItem.pr_id == pr.id).all()
    by_vendor: dict[str, list[PrItem]] = defaultdict(list)
    for item in items:
        if item.vendor_id:
            by_vendor[item.vendor_id].append(item)

    delivery_default = (
        db.query(DeliveryStatus).filter(DeliveryStatus.name == "Diproses").first()
    )
    payment_default = (
        db.query(PaymentStatus).filter(PaymentStatus.name == "Belum Dibayar").first()
    )

    due_date_rows = (
        db.query(PrVendorDueDate)
        .filter(PrVendorDueDate.pr_id == pr.id)
        .all()
    )
    due_dates_by_vendor = {row.vendor_id: row.due_date for row in due_date_rows}

    orders: list[PurchaseOrder] = []
    for seq, (vendor_id, vendor_items) in enumerate(by_vendor.items(), start=1):
        po = PurchaseOrder(
            id=str(uuid.uuid4()),
            pr_id=pr.id,
            vendor_id=vendor_id,
            delivery_status_id=delivery_default.id if delivery_default else None,
            payment_status_id=payment_default.id if payment_default else None,
            po_number=generate_po_number(db, pr.id, seq),
        )
        db.add(po)
        db.flush()

        for pr_item in vendor_items:
            item_due = pr_item.due_date or due_dates_by_vendor.get(vendor_id)
            db.add(
                PurchaseItem(
                    id=str(uuid.uuid4()),
                    po_id=po.id,
                    pr_item_id=pr_item.id,
                    product_id=pr_item.product_id,
                    description=pr_item.description,
                    real_qty=pr_item.request_qty,
                    real_price=pr_item.request_price,
                    real_total=pr_item.request_total,
                    original_real_price=pr_item.request_price,
                    original_real_total=pr_item.request_total,
                    due_date=item_due,
                    delivery_status_id=delivery_default.id if delivery_default else None,
                    payment_status_id=payment_default.id if payment_default else None,
                )
            )

        db.flush()
        db.refresh(po, ["items", "delivery_status", "payment_status"])
        po_svc.log_initial_po_item_statuses(db, po)
        po_svc.sync_po_rollup(db, po)
        orders.append(po)
    return orders


def _refresh_pr_detail(db: Session, pr: PurchaseRequisition) -> None:
    db.refresh(pr, ["unit", "purchase_type", "items", "approval_logs", "purchase_orders", "vendor_due_dates"])
    for item in pr.items or []:
        db.refresh(item, ["vendor", "product", "category"])
        if item.product is not None:
            db.refresh(item.product, ["uom", "product_type", "vendor"])
    for vd in pr.vendor_due_dates or []:
        db.refresh(vd, ["vendor"])
    for po in pr.purchase_orders or []:
        db.refresh(po, ["vendor", "delivery_status", "payment_status", "items"])
        for pi in po.items or []:
            db.refresh(pi, ["product"])


def _build_approval_logs_read(pr: PurchaseRequisition, db: Session) -> list[PrApprovalLogRead]:
    logs = []
    for log in sorted(pr.approval_logs or [], key=lambda x: x.created_at or datetime.min):
        actor_name = None
        if log.action_by:
            actor = db.query(User).filter(User.id == log.action_by).first()
            if actor:
                actor_name = actor.fullname or actor.username
        logs.append(
            PrApprovalLogRead(
                id=log.id,
                approval_status=log.approval_status,
                action=log.action,
                role_name=log.role_name,
                scope_id=log.scope_id,
                action_by=log.action_by,
                actor_name=actor_name,
                notes=log.notes,
                created_at=log.created_at,
            )
        )
    return logs


def build_pr_detail(
    db: Session, pr: PurchaseRequisition, current_user: User
) -> PurchaseRequisitionDetailRead:
    _refresh_pr_detail(db, pr)

    submitter_name = None
    if pr.submitted_by:
        submitter = db.query(User).filter(User.id == pr.submitted_by).first()
        if submitter:
            submitter_name = submitter.fullname or submitter.username

    creator_name = None
    if pr.created_by:
        creator = db.query(User).filter(User.id == pr.created_by).first()
        if creator:
            creator_name = creator.fullname or creator.username

    po_reads = [
        po_svc.build_po_read(db, po, include_items=True)
        for po in (pr.purchase_orders or [])
    ]

    base = PurchaseRequisitionRead.model_validate(pr)
    return PurchaseRequisitionDetailRead(
        **base.model_dump(),
        approval_logs=_build_approval_logs_read(pr, db),
        purchase_orders=po_reads,
        can_approve=can_user_approve(db, current_user, pr),
        can_edit=can_user_edit(db, current_user, pr),
        can_submit=can_user_submit(db, current_user, pr),
        submitter_name=submitter_name,
        creator_name=creator_name,
    )


def create_purchase_requisition(
    db: Session, user: User, data: PurchaseRequisitionCreate
) -> PurchaseRequisition:
    scope_svc.require_unit_access_forbidden(
        db, user, data.unit_id, message="Tidak memiliki akses ke unit PR ini"
    )
    pr = PurchaseRequisition(
        id=str(uuid.uuid4()),
        unit_id=data.unit_id,
        purchase_type_id=data.purchase_type_id,
        pr_number=generate_pr_number(db),
        approval_status=APPROVAL_DRAFT,
        created_by=user.id,
    )
    db.add(pr)
    db.flush()
    if data.items:
        _sync_pr_items(db, pr, data.items)
    _sync_vendor_due_dates(db, pr, data.vendor_due_dates)
    db.commit()
    db.refresh(pr)
    return pr


def update_purchase_requisition(
    db: Session, user: User, pr_id: str, data: PurchaseRequisitionUpdate
) -> PurchaseRequisition:
    pr = db.query(PurchaseRequisition).filter(PurchaseRequisition.id == pr_id).first()
    if not pr:
        raise NotFoundException("Purchase requisition tidak ditemukan")
    _require_pr_access(db, user, pr)
    if not can_user_edit(db, user, pr):
        raise ForbiddenException("PR hanya dapat diedit saat status draft")

    if data.unit_id is not None:
        scope_svc.require_unit_access_forbidden(
            db, user, data.unit_id, message="Tidak memiliki akses ke unit PR ini"
        )
        pr.unit_id = data.unit_id
    if data.purchase_type_id is not None:
        pr.purchase_type_id = data.purchase_type_id
    pr.updated_by = user.id

    if data.items is not None:
        _sync_pr_items(db, pr, data.items)

    if data.vendor_due_dates is not None:
        _sync_vendor_due_dates(db, pr, data.vendor_due_dates)

    db.commit()
    db.refresh(pr)
    return pr


def delete_purchase_requisition(db: Session, user: User, pr_id: str) -> None:
    pr = db.query(PurchaseRequisition).filter(PurchaseRequisition.id == pr_id).first()
    if not pr:
        raise NotFoundException("Purchase requisition tidak ditemukan")
    _require_pr_access(db, user, pr)
    if pr.approval_status != APPROVAL_DRAFT:
        raise BadRequestException("Hanya PR draft yang dapat dihapus")
    if not can_user_edit(db, user, pr):
        raise ForbiddenException("Tidak memiliki akses untuk menghapus PR ini")
    db.delete(pr)
    db.commit()


def submit_purchase_requisition(db: Session, user: User, pr_id: str) -> PurchaseRequisition:
    pr = db.query(PurchaseRequisition).filter(PurchaseRequisition.id == pr_id).first()
    if not pr:
        raise NotFoundException("Purchase requisition tidak ditemukan")
    _require_pr_access(db, user, pr)
    if not can_user_submit(db, user, pr):
        raise ForbiddenException("Tidak dapat submit PR ini")
    if pr.approval_status != APPROVAL_DRAFT:
        raise BadRequestException("PR sudah disubmit")

    items = db.query(PrItem).filter(PrItem.pr_id == pr.id).all()
    _validate_items_for_submit(items)
    _validate_item_due_dates_for_submit(items)
    if not pr.unit_id:
        raise BadRequestException("Unit harus diisi sebelum submit")

    now = datetime.now(timezone.utc)
    pr.approval_status = APPROVAL_PENDING_BRAND
    pr.submitted_by = user.id
    pr.submitted_at = now
    pr.updated_by = user.id
    _log_approval(db, pr, user, "submit", APPROVAL_PENDING_BRAND, "purchasing")
    db.commit()
    db.refresh(pr)
    return pr


def _resolve_approver_role(db: Session, user: User, pr: PurchaseRequisition) -> Optional[str]:
    if pr.approval_status == APPROVAL_PENDING_BRAND:
        if _is_superadmin(db, user) or _user_has_role(db, user, "brand_manager"):
            return "brand_manager"
    elif pr.approval_status == APPROVAL_PENDING_FINANCE:
        if _is_superadmin(db, user) or _user_has_role(db, user, "finance"):
            return "finance"
    return None


def approve_purchase_requisition(
    db: Session, user: User, pr_id: str, _action: Optional[ApprovalAction] = None
) -> PurchaseRequisition:
    pr = db.query(PurchaseRequisition).filter(PurchaseRequisition.id == pr_id).first()
    if not pr:
        raise NotFoundException("Purchase requisition tidak ditemukan")
    if not can_user_approve(db, user, pr):
        raise ForbiddenException("Tidak memiliki akses untuk approve PR ini")

    role_name = _resolve_approver_role(db, user, pr)
    if not role_name:
        raise BadRequestException("Status PR tidak valid untuk approval")

    now = datetime.now(timezone.utc)
    notes = _action.comment if _action else None

    if pr.approval_status == APPROVAL_PENDING_BRAND:
        pr.approval_status = APPROVAL_PENDING_FINANCE
        _log_approval(db, pr, user, "approve", APPROVAL_PENDING_FINANCE, role_name, notes=notes)
    elif pr.approval_status == APPROVAL_PENDING_FINANCE:
        pr.approval_status = APPROVAL_APPROVED
        pr.is_fully_approved = True
        pr.fully_approved_by = user.id
        pr.fully_approved_at = now
        _log_approval(db, pr, user, "approve", APPROVAL_APPROVED, role_name, notes=notes)
        _create_purchase_orders(db, pr)
    else:
        raise BadRequestException("PR tidak dalam status menunggu approval")

    pr.updated_by = user.id
    db.commit()
    db.refresh(pr)
    return pr


def reject_purchase_requisition(
    db: Session, user: User, pr_id: str, _action: Optional[ApprovalAction] = None
) -> PurchaseRequisition:
    pr = db.query(PurchaseRequisition).filter(PurchaseRequisition.id == pr_id).first()
    if not pr:
        raise NotFoundException("Purchase requisition tidak ditemukan")
    if not can_user_approve(db, user, pr):
        raise ForbiddenException("Tidak memiliki akses untuk reject PR ini")

    role_name = _resolve_approver_role(db, user, pr) or "approver"
    pr.approval_status = APPROVAL_REJECTED
    pr.updated_by = user.id
    notes = _action.comment if _action else None
    _log_approval(db, pr, user, "reject", APPROVAL_REJECTED, role_name, notes=notes)
    db.commit()
    db.refresh(pr)
    return pr


def validate_pr_date_range(date_from: date | None, date_to: date | None) -> None:
    if date_from and date_to and date_from > date_to:
        raise BadRequestException("Tanggal mulai tidak boleh lebih besar dari tanggal akhir")


def apply_pr_created_date_filter(
    query: Query,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
) -> Query:
    from app.utils.helpers import wib_date_end_as_utc_naive, wib_date_start_as_utc_naive

    if date_from:
        query = query.filter(PurchaseRequisition.created_at >= wib_date_start_as_utc_naive(date_from))
    if date_to:
        query = query.filter(PurchaseRequisition.created_at <= wib_date_end_as_utc_naive(date_to))
    return query

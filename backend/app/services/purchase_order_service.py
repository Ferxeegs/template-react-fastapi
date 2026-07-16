"""
Purchase order (PO) business logic.
"""
from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import UploadFile
from sqlalchemy.orm import Query, Session, joinedload

from app.core.deps_permission import user_has_permission
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.auth import User
from app.models.procurement import (
    DeliveryStatus,
    PaymentStatus,
    PoPriceLog,
    PoStatusLog,
    PrItem,
    PurchaseItem,
    PurchaseOrder,
)
from app.models.purchasing import Product
from app.schemas.common import MediaRead
from app.schemas.procurement import (
    PoPriceLogRead,
    PoStatusLogRead,
    PurchaseItemRead,
    PurchaseOrderDetailRead,
    PurchaseOrderItemListRead,
    PurchaseOrderRead,
    PurchaseOrderUpdate,
)
from app.services import media_service as media_svc
from app.services import scope_service as scope_svc

PO_STATUS_LOG_MODEL = "PoStatusLog"
PROOF_COLLECTION = "proof"
MAX_PROOF_FILES = 10

DELIVERY_TERMINAL = frozenset({"Diterima", "Dibatalkan"})
DELIVERY_FORWARD = {
    "Diproses": frozenset({"Diterima", "Dibatalkan"}),
}
PAYMENT_TERMINAL = frozenset({"Lunas"})
PAYMENT_FORWARD = {
    "Belum Dibayar": frozenset({"Lunas"}),
}


def _is_delivery_updatable(item: PurchaseItem) -> bool:
    name = item.delivery_status.name if item.delivery_status else None
    return name == "Diproses"


def _is_payment_updatable(item: PurchaseItem) -> bool:
    name = item.payment_status.name if item.payment_status else None
    return name == "Belum Dibayar"


def _validate_delivery_transition(current_name: str | None, new_name: str) -> None:
    if not current_name:
        raise BadRequestException("Status pengiriman saat ini tidak diketahui")
    if current_name in DELIVERY_TERMINAL:
        raise BadRequestException(
            f"Status pengiriman '{current_name}' bersifat final dan tidak dapat diubah"
        )
    allowed = DELIVERY_FORWARD.get(current_name, frozenset())
    if new_name not in allowed:
        raise BadRequestException(
            f"Tidak dapat mengubah status pengiriman dari '{current_name}' ke '{new_name}'"
        )


def _validate_payment_transition(current_name: str | None, new_name: str) -> None:
    if not current_name:
        raise BadRequestException("Status pembayaran saat ini tidak diketahui")
    if current_name in PAYMENT_TERMINAL:
        raise BadRequestException(
            f"Status pembayaran '{current_name}' bersifat final dan tidak dapat diubah"
        )
    allowed = PAYMENT_FORWARD.get(current_name, frozenset())
    if new_name not in allowed:
        raise BadRequestException(
            f"Tidak dapat mengubah status pembayaran dari '{current_name}' ke '{new_name}'"
        )


def can_user_update_item_delivery(db: Session, user: User, po: PurchaseOrder, item: PurchaseItem) -> bool:
    if not _is_delivery_updatable(item):
        return False
    return user_has_permission(db, user, "update_po_item_delivery_status")


def can_user_update_item_payment(db: Session, user: User, po: PurchaseOrder, item: PurchaseItem) -> bool:
    if not _is_payment_updatable(item):
        return False
    return user_has_permission(db, user, "update_po_item_payment_status")


def can_user_update_item_price(db: Session, user: User, po: PurchaseOrder, item: PurchaseItem) -> bool:
    """User with permission may revise PO item price before payment is marked Lunas."""
    if not _is_payment_updatable(item):
        return False
    return user_has_permission(db, user, "update_po_item_price")


def can_user_update_item_qty(db: Session, user: User, po: PurchaseOrder, item: PurchaseItem) -> bool:
    """Qty may be revised only while delivery is still Diproses (before stock is posted)."""
    if not _is_delivery_updatable(item):
        return False
    return user_has_permission(db, user, "update_po_item_qty")


def _calc_po_total(po: PurchaseOrder) -> Decimal:
    return sum((item.real_total for item in (po.items or [])), Decimal("0"))


def _item_label(item: PurchaseItem) -> str:
    if item.product and item.product.name:
        return item.product.name
    return item.description or "Item"


def _rollup_delivery_status_id(db: Session, items: list[PurchaseItem]) -> Optional[int]:
    names = [item.delivery_status.name for item in items if item.delivery_status]
    if not names:
        return None
    if all(name == "Dibatalkan" for name in names):
        target = "Dibatalkan"
    elif all(name == "Diterima" for name in names):
        target = "Diterima"
    else:
        target = "Diproses"
    status = db.query(DeliveryStatus).filter(DeliveryStatus.name == target).first()
    return status.id if status else None


def _rollup_payment_status_id(db: Session, items: list[PurchaseItem]) -> Optional[int]:
    names = [item.payment_status.name for item in items if item.payment_status]
    if not names:
        return None
    target = "Lunas" if all(name == "Lunas" for name in names) else "Belum Dibayar"
    status = db.query(PaymentStatus).filter(PaymentStatus.name == target).first()
    return status.id if status else None


def sync_po_rollup(db: Session, po: PurchaseOrder) -> None:
    db.refresh(po, ["items"])
    items = po.items or []
    for item in items:
        db.refresh(item, ["delivery_status", "payment_status"])

    due_dates = [item.due_date for item in items if item.due_date]
    po.due_date = max(due_dates) if due_dates else None
    po.delivery_status_id = _rollup_delivery_status_id(db, items)
    po.payment_status_id = _rollup_payment_status_id(db, items)


def _refresh_po(db: Session, po: PurchaseOrder) -> None:
    db.refresh(
        po,
        [
            "vendor",
            "delivery_status",
            "payment_status",
            "items",
            "purchase_requisition",
            "status_logs",
            "price_logs",
        ],
    )
    for item in po.items or []:
        db.refresh(item, ["product", "delivery_status", "payment_status", "pr_item"])
    if po.purchase_requisition:
        db.refresh(po.purchase_requisition, ["unit", "purchase_type"])
    for log in po.status_logs or []:
        db.refresh(log, ["actor", "purchase_item"])


def _actor_name(log: PoStatusLog) -> Optional[str]:
    if log.actor:
        return log.actor.fullname or log.actor.username
    return None


def build_price_logs_read(db: Session, po: PurchaseOrder) -> list[PoPriceLogRead]:
    logs = sorted(po.price_logs or [], key=lambda x: x.created_at or "")
    result: list[PoPriceLogRead] = []
    for log in logs:
        actor_name = None
        if log.action_by:
            db.refresh(log, ["actor"])
            if log.actor:
                actor_name = log.actor.fullname or log.actor.username
        result.append(
            PoPriceLogRead(
                id=log.id,
                purchase_item_id=log.purchase_item_id,
                old_price=log.old_price,
                new_price=log.new_price,
                old_total=log.old_total,
                new_total=log.new_total,
                action_by=log.action_by,
                actor_name=actor_name,
                notes=log.notes,
                created_at=log.created_at,
            )
        )
    return result


def log_po_price_change(
    db: Session,
    po: PurchaseOrder,
    item: PurchaseItem,
    *,
    old_price: Decimal,
    new_price: Decimal,
    old_total: Decimal,
    new_total: Decimal,
    user: Optional[User] = None,
    notes: Optional[str] = None,
) -> PoPriceLog:
    log = PoPriceLog(
        po_id=po.id,
        purchase_item_id=item.id,
        old_price=old_price,
        new_price=new_price,
        old_total=old_total,
        new_total=new_total,
        action_by=user.id if user else None,
        notes=notes,
    )
    db.add(log)
    db.flush()
    return log


def build_status_logs_read(db: Session, po: PurchaseOrder) -> list[PoStatusLogRead]:
    logs = sorted(po.status_logs or [], key=lambda x: x.created_at or "")
    result: list[PoStatusLogRead] = []
    for log in logs:
        if log.actor:
            db.refresh(log, ["actor"])
        item_label = None
        if log.purchase_item_id:
            if log.purchase_item:
                item_label = _item_label(log.purchase_item)
            else:
                item = db.query(PurchaseItem).filter(PurchaseItem.id == log.purchase_item_id).first()
                if item:
                    db.refresh(item, ["product"])
                    item_label = _item_label(item)
        proof = media_svc.get_proof_medias(db, log.id)
        result.append(
            PoStatusLogRead(
                id=log.id,
                status_type=log.status_type,
                status_id=log.status_id,
                status_name=log.status_name,
                purchase_item_id=log.purchase_item_id,
                item_label=item_label,
                action_by=log.action_by,
                actor_name=_actor_name(log),
                notes=log.notes,
                created_at=log.created_at,
                proof_media=[MediaRead.model_validate(m) for m in proof],
            )
        )
    return result


def log_po_status(
    db: Session,
    po: PurchaseOrder,
    *,
    status_type: str,
    status: DeliveryStatus | PaymentStatus,
    user: Optional[User] = None,
    notes: Optional[str] = None,
    purchase_item_id: Optional[str] = None,
) -> PoStatusLog:
    log = PoStatusLog(
        po_id=po.id,
        status_type=status_type,
        status_id=status.id,
        status_name=status.name,
        purchase_item_id=purchase_item_id,
        action_by=user.id if user else None,
        notes=notes,
    )
    db.add(log)
    db.flush()
    return log


def log_initial_po_item_statuses(
    db: Session,
    po: PurchaseOrder,
    *,
    user: Optional[User] = None,
) -> None:
    for item in po.items or []:
        if item.delivery_status:
            log_po_status(
                db,
                po,
                status_type="delivery",
                status=item.delivery_status,
                user=user,
                purchase_item_id=item.id,
            )
        if item.payment_status:
            log_po_status(
                db,
                po,
                status_type="payment",
                status=item.payment_status,
                user=user,
                purchase_item_id=item.id,
            )


async def _save_proofs_for_log(
    db: Session,
    log: PoStatusLog,
    proofs: Optional[list[UploadFile]],
) -> None:
    if not proofs:
        return
    valid_files = [f for f in proofs if f and f.filename]
    if not valid_files:
        return
    if len(valid_files) > MAX_PROOF_FILES:
        raise BadRequestException(f"Maksimal {MAX_PROOF_FILES} file bukti per update")

    for proof in valid_files:
        content = await proof.read()
        await proof.close()
        media_svc.save_upload_bytes(
            db,
            content=content,
            filename=proof.filename or "proof.jpg",
            content_type=proof.content_type or "image/jpeg",
            model_type=PO_STATUS_LOG_MODEL,
            model_id=str(log.id),
            collection=PROOF_COLLECTION,
        )


def build_item_read(
    db: Session,
    po: PurchaseOrder,
    item: PurchaseItem,
    *,
    current_user: Optional[User] = None,
) -> PurchaseItemRead:
    db.refresh(item, ["product", "delivery_status", "payment_status", "pr_item"])
    if item.product:
        db.refresh(item.product, ["uom", "product_type", "vendor", "categories"])
    can_delivery = (
        can_user_update_item_delivery(db, current_user, po, item) if current_user else False
    )
    can_payment = can_user_update_item_payment(db, current_user, po, item) if current_user else False
    can_price = can_user_update_item_price(db, current_user, po, item) if current_user else False
    can_qty = can_user_update_item_qty(db, current_user, po, item) if current_user else False
    pr_item = item.pr_item
    return PurchaseItemRead(
        id=item.id,
        product_id=item.product_id,
        description=item.description,
        real_qty=item.real_qty,
        real_price=item.real_price,
        real_total=item.real_total,
        original_real_price=item.original_real_price,
        original_real_total=item.original_real_total,
        pr_request_price=pr_item.request_price if pr_item else None,
        pr_request_qty=pr_item.request_qty if pr_item else None,
        pr_request_total=pr_item.request_total if pr_item else None,
        due_date=item.due_date,
        delivery_status_id=item.delivery_status_id,
        payment_status_id=item.payment_status_id,
        delivery_status=item.delivery_status,
        payment_status=item.payment_status,
        can_update_delivery=can_delivery,
        can_update_payment=can_payment,
        can_update_price=can_price,
        can_update_qty=can_qty,
        product=item.product,
        pr_item_id=item.pr_item_id,
    )


def build_po_read(
    db: Session,
    po: PurchaseOrder,
    *,
    include_items: bool = True,
    current_user: Optional[User] = None,
) -> PurchaseOrderRead:
    _refresh_po(db, po)
    pr = po.purchase_requisition
    return PurchaseOrderRead(
        id=po.id,
        po_number=po.po_number,
        pr_id=po.pr_id,
        pr_number=pr.pr_number if pr else None,
        vendor_id=po.vendor_id,
        vendor=po.vendor,
        delivery_status_id=po.delivery_status_id,
        payment_status_id=po.payment_status_id,
        delivery_status=po.delivery_status,
        payment_status=po.payment_status,
        items=[
            build_item_read(db, po, i, current_user=current_user) for i in (po.items or [])
        ]
        if include_items
        else [],
        total_amount=_calc_po_total(po),
        due_date=po.due_date,
        created_at=po.created_at,
        updated_at=po.updated_at,
    )


def build_po_detail(
    db: Session,
    po: PurchaseOrder,
    *,
    current_user: Optional[User] = None,
) -> PurchaseOrderDetailRead:
    base = build_po_read(db, po, include_items=True, current_user=current_user)
    pr = po.purchase_requisition
    return PurchaseOrderDetailRead(
        **base.model_dump(),
        unit=pr.unit if pr else None,
        purchase_type=pr.purchase_type if pr else None,
        status_logs=build_status_logs_read(db, po),
        price_logs=build_price_logs_read(db, po),
    )


def _get_po_item(db: Session, po_id: str, item_id: str) -> tuple[PurchaseOrder, PurchaseItem]:
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise NotFoundException("Purchase order tidak ditemukan")
    item = (
        db.query(PurchaseItem)
        .filter(PurchaseItem.id == item_id, PurchaseItem.po_id == po_id)
        .first()
    )
    if not item:
        raise NotFoundException("Item PO tidak ditemukan")
    return po, item


async def update_item_delivery_status(
    db: Session,
    po_id: str,
    item_id: str,
    status_id: int,
    *,
    user: User,
    notes: Optional[str] = None,
    proofs: Optional[list[UploadFile]] = None,
) -> PurchaseOrder:
    po, item = _get_po_item(db, po_id, item_id)
    if not can_user_update_item_delivery(db, user, po, item):
        raise ForbiddenException("Tidak memiliki akses untuk memperbarui status pengiriman item")

    status = db.query(DeliveryStatus).filter(
        DeliveryStatus.id == status_id,
        DeliveryStatus.is_active.is_(True),
    ).first()
    if not status:
        raise BadRequestException("Status pengiriman tidak valid")

    db.refresh(item, ["delivery_status"])
    current_name = item.delivery_status.name if item.delivery_status else None
    _validate_delivery_transition(current_name, status.name)

    if item.delivery_status_id == status.id:
        raise BadRequestException("Status pengiriman sudah sama")

    item.delivery_status_id = status.id
    log = log_po_status(
        db,
        po,
        status_type="delivery",
        status=status,
        user=user,
        notes=notes,
        purchase_item_id=item.id,
    )
    await _save_proofs_for_log(db, log, proofs)

    from app.services import stock_service as stock_svc

    stock_svc.receive_po_item_delivery(db, item, po, user=user)
    sync_po_rollup(db, po)

    db.commit()
    db.refresh(po)
    return po


async def update_item_payment_status(
    db: Session,
    po_id: str,
    item_id: str,
    status_id: int,
    *,
    user: User,
    notes: Optional[str] = None,
    proofs: Optional[list[UploadFile]] = None,
) -> PurchaseOrder:
    po, item = _get_po_item(db, po_id, item_id)
    if not can_user_update_item_payment(db, user, po, item):
        raise ForbiddenException("Tidak memiliki akses untuk memperbarui status pembayaran item")

    status = db.query(PaymentStatus).filter(
        PaymentStatus.id == status_id,
        PaymentStatus.is_active.is_(True),
    ).first()
    if not status:
        raise BadRequestException("Status pembayaran tidak valid")

    db.refresh(item, ["payment_status"])
    current_name = item.payment_status.name if item.payment_status else None
    _validate_payment_transition(current_name, status.name)

    if item.payment_status_id == status.id:
        raise BadRequestException("Status pembayaran sudah sama")

    item.payment_status_id = status.id
    log = log_po_status(
        db,
        po,
        status_type="payment",
        status=status,
        user=user,
        notes=notes,
        purchase_item_id=item.id,
    )
    await _save_proofs_for_log(db, log, proofs)
    sync_po_rollup(db, po)

    db.commit()
    db.refresh(po)
    return po


def update_purchase_item_price(
    db: Session,
    po_id: str,
    item_id: str,
    real_price: Decimal,
    *,
    user: User,
    notes: Optional[str] = None,
) -> PurchaseOrder:
    po, item = _get_po_item(db, po_id, item_id)
    if not can_user_update_item_price(db, user, po, item):
        raise ForbiddenException("Tidak memiliki akses untuk memperbarui harga item PO")

    price = Decimal(str(real_price))
    if price < 0:
        raise BadRequestException("Harga tidak boleh negatif")

    db.refresh(item, ["payment_status", "pr_item"])
    old_price = Decimal(str(item.real_price))
    old_total = Decimal(str(item.real_total))

    if old_price == price:
        raise BadRequestException("Harga baru sama dengan harga saat ini")

    new_total = Decimal(str(item.real_qty)) * price
    item.real_price = price
    item.real_total = new_total

    log_po_price_change(
        db,
        po,
        item,
        old_price=old_price,
        new_price=price,
        old_total=old_total,
        new_total=new_total,
        user=user,
        notes=notes,
    )
    sync_po_rollup(db, po)

    db.commit()
    db.refresh(po)
    return po


def update_purchase_item_qty(
    db: Session,
    po_id: str,
    item_id: str,
    real_qty: Decimal,
    *,
    user: User,
    notes: Optional[str] = None,  # kept for API parity / future qty audit log
) -> PurchaseOrder:
    po, item = _get_po_item(db, po_id, item_id)
    if not can_user_update_item_qty(db, user, po, item):
        raise ForbiddenException(
            "Tidak memiliki akses untuk memperbarui qty item PO "
            "(hanya sebelum status pengiriman Diterima/Dibatalkan)"
        )

    qty = Decimal(str(real_qty))
    if qty <= 0:
        raise BadRequestException("Qty harus lebih dari 0")

    db.refresh(item, ["delivery_status", "pr_item"])
    old_qty = Decimal(str(item.real_qty))
    if old_qty == qty:
        raise BadRequestException("Qty baru sama dengan qty saat ini")

    item.real_qty = qty
    item.real_total = qty * Decimal(str(item.real_price))

    sync_po_rollup(db, po)

    db.commit()
    db.refresh(po)
    return po


def update_purchase_order(
    db: Session,
    po_id: str,
    data: PurchaseOrderUpdate,
    *,
    user: Optional[User] = None,
) -> PurchaseOrder:
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise NotFoundException("Purchase order tidak ditemukan")

    update_data = data.model_dump(exclude_unset=True)
    update_data.pop("notes", None)

    if not update_data:
        raise BadRequestException("Tidak ada data yang diperbarui")

    raise BadRequestException("PO tidak dapat diperbarui langsung; gunakan update per item")


def validate_po_date_range(date_from: date | None, date_to: date | None) -> None:
    if date_from and date_to and date_from > date_to:
        raise BadRequestException("Tanggal mulai tidak boleh lebih besar dari tanggal akhir")


def apply_po_list_filters(
    query: Query,
    db: Session,
    current_user: User,
    *,
    search: Optional[str] = None,
    pr_id: Optional[str] = None,
    vendor_id: Optional[str] = None,
    delivery_status_id: Optional[int] = None,
    payment_status_id: Optional[int] = None,
    incomplete_unpaid: bool = False,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> Query:
    query = scope_svc.apply_po_scope_filter(query, db, current_user)

    if search:
        query = query.filter(PurchaseOrder.po_number.ilike(f"%{search}%"))
    if pr_id:
        query = query.filter(PurchaseOrder.pr_id == pr_id)
    if vendor_id:
        query = query.filter(PurchaseOrder.vendor_id == vendor_id)
    if delivery_status_id:
        query = query.filter(PurchaseOrder.delivery_status_id == delivery_status_id)
    if payment_status_id:
        query = query.filter(PurchaseOrder.payment_status_id == payment_status_id)

    if incomplete_unpaid:
        query = (
            query.join(DeliveryStatus, PurchaseOrder.delivery_status_id == DeliveryStatus.id)
            .join(PaymentStatus, PurchaseOrder.payment_status_id == PaymentStatus.id)
            .filter(~DeliveryStatus.name.in_(["Diterima", "Dibatalkan"]))
            .filter(PaymentStatus.name != "Lunas")
        )

    return apply_po_created_date_filter(query, date_from=date_from, date_to=date_to)


def apply_po_created_date_filter(
    query: Query,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
) -> Query:
    from app.utils.helpers import wib_date_end_as_utc_naive, wib_date_start_as_utc_naive

    if date_from:
        query = query.filter(PurchaseOrder.created_at >= wib_date_start_as_utc_naive(date_from))
    if date_to:
        query = query.filter(PurchaseOrder.created_at <= wib_date_end_as_utc_naive(date_to))
    return query


def _po_item_list_load_options():
    return [
        joinedload(PurchaseItem.product).joinedload(Product.uom),
        joinedload(PurchaseItem.delivery_status),
        joinedload(PurchaseItem.payment_status),
        joinedload(PurchaseItem.pr_item).joinedload(PrItem.category),
        joinedload(PurchaseItem.purchase_order).joinedload(PurchaseOrder.vendor),
        joinedload(PurchaseItem.purchase_order).joinedload(PurchaseOrder.purchase_requisition),
    ]


def build_po_item_list_read(item: PurchaseItem) -> PurchaseOrderItemListRead:
    po = item.purchase_order
    pr = po.purchase_requisition if po else None
    product = item.product
    pr_item = item.pr_item

    if product and product.name:
        product_name = product.name
    else:
        product_name = (item.description or "").strip() or "-"

    uom = "-"
    if product and product.uom:
        uom = product.uom.shortname or product.uom.name or "-"

    category_name = pr_item.category.name if pr_item and pr_item.category else None

    return PurchaseOrderItemListRead(
        id=item.id,
        po_id=po.id,
        po_number=po.po_number,
        pr_id=po.pr_id,
        pr_number=pr.pr_number if pr else None,
        vendor_name=po.vendor.company_name if po.vendor else None,
        product_name=product_name,
        category_name=category_name,
        description=item.description,
        real_qty=item.real_qty,
        uom=uom,
        real_price=item.real_price,
        real_total=item.real_total,
        delivery_status=item.delivery_status,
        payment_status=item.payment_status,
        due_date=item.due_date,
        po_created_at=po.created_at,
    )


def list_purchase_order_items(
    db: Session,
    current_user: User,
    *,
    page: int = 1,
    limit: int = 10,
    search: Optional[str] = None,
    pr_id: Optional[str] = None,
    vendor_id: Optional[str] = None,
    delivery_status_id: Optional[int] = None,
    payment_status_id: Optional[int] = None,
    category_id: Optional[int] = None,
    incomplete_unpaid: bool = False,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> tuple[list[PurchaseOrderItemListRead], int]:
    item_query = _build_po_item_list_query(
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
    total = item_query.count()
    offset = (page - 1) * limit
    items = item_query.offset(offset).limit(limit).all()
    return [build_po_item_list_read(item) for item in items], total


def _build_po_item_list_query(
    db: Session,
    current_user: User,
    *,
    search: Optional[str] = None,
    pr_id: Optional[str] = None,
    vendor_id: Optional[str] = None,
    delivery_status_id: Optional[int] = None,
    payment_status_id: Optional[int] = None,
    category_id: Optional[int] = None,
    incomplete_unpaid: bool = False,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> Query:
    po_id_query = apply_po_list_filters(
        db.query(PurchaseOrder.id),
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

    item_query = (
        db.query(PurchaseItem)
        .join(PurchaseOrder, PurchaseItem.po_id == PurchaseOrder.id)
        .filter(PurchaseItem.po_id.in_(po_id_query))
    )
    if category_id is not None:
        item_query = item_query.join(PrItem, PurchaseItem.pr_item_id == PrItem.id).filter(
            PrItem.category_id == category_id
        )

    return item_query.options(*_po_item_list_load_options()).order_by(
        PurchaseOrder.created_at.desc(), PurchaseItem.id
    )


def get_purchase_order_items_for_export(
    db: Session,
    current_user: User,
    *,
    search: Optional[str] = None,
    pr_id: Optional[str] = None,
    vendor_id: Optional[str] = None,
    delivery_status_id: Optional[int] = None,
    payment_status_id: Optional[int] = None,
    category_id: Optional[int] = None,
    incomplete_unpaid: bool = False,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> list[PurchaseOrderItemListRead]:
    items = _build_po_item_list_query(
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
    ).all()
    return [build_po_item_list_read(item) for item in items]

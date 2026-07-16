"""
Stock management service — ledger per product + unit + category.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, NotFoundException
from app.utils.helpers import wib_date_end_as_utc_naive, wib_date_start_as_utc_naive
from app.models.auth import User
from app.models.inventory import ProductStock, StockMovement
from app.models.procurement import PurchaseItem, PurchaseOrder
from app.models.purchasing import Category, Product, ProductCategory
from app.schemas.inventory import (
    MOVEMENT_ADJUSTMENT_IN,
    MOVEMENT_ADJUSTMENT_OUT,
    MOVEMENT_ISSUE_USAGE,
    MOVEMENT_RECEIPT_PO,
    MOVEMENT_TYPE_LABELS,
    ProductStockRead,
    StockDailySummaryItem,
    StockDailySummaryRead,
    StockMovementRead,
)
from app.services import scope_service as scope_svc

RECEIPT_DELIVERY_STATUS_NAMES = frozenset({"Diterima"})

REFERENCE_PO_ITEM = "purchase_order_item"
REFERENCE_MANUAL = "manual"


def _decimal(value) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def _get_stock_row(
    db: Session,
    product_id: str,
    unit_id: str,
    category_id: int,
    *,
    for_update: bool = False,
) -> ProductStock:
    query = db.query(ProductStock).filter(
        ProductStock.product_id == product_id,
        ProductStock.unit_id == unit_id,
        ProductStock.category_id == category_id,
    )
    if for_update:
        query = query.with_for_update()
    row = query.first()
    if row:
        return row
    row = ProductStock(
        id=str(uuid.uuid4()),
        product_id=product_id,
        unit_id=unit_id,
        category_id=category_id,
        qty_on_hand=Decimal("0"),
    )
    db.add(row)
    db.flush()
    if for_update:
        row = (
            db.query(ProductStock)
            .filter(ProductStock.id == row.id)
            .with_for_update()
            .first()
        )
    return row


def _validate_category_for_stock(
    db: Session,
    user: User,
    *,
    product_id: str,
    unit_id: str,
    category_id: int,
) -> tuple[Product, Category]:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise NotFoundException("Produk tidak ditemukan")

    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise NotFoundException("Kategori tidak ditemukan")

    scope_svc.require_unit_access_forbidden(db, user, unit_id, message="Tidak memiliki akses ke unit ini")

    if category.unit_id != unit_id:
        raise BadRequestException("Kategori tidak sesuai dengan unit yang dipilih")

    db.refresh(product, ["vendor"])
    if product.vendor and product.vendor.unit_id and product.vendor.unit_id != unit_id:
        raise BadRequestException("Produk tidak terdaftar untuk unit ini")

    linked = (
        db.query(ProductCategory)
        .filter(
            ProductCategory.product_id == product_id,
            ProductCategory.category_id == category_id,
        )
        .first()
    )
    if not linked:
        existing_stock = (
            db.query(ProductStock)
            .filter(
                ProductStock.product_id == product_id,
                ProductStock.unit_id == unit_id,
                ProductStock.category_id == category_id,
            )
            .first()
        )
        if not existing_stock:
            raise BadRequestException("Produk tidak terdaftar pada kategori ini")

    return product, category


def _apply_movement(
    db: Session,
    *,
    product_id: str,
    unit_id: str,
    category_id: int,
    movement_type: str,
    qty: Decimal,
    direction: str,
    user: Optional[User],
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    reference_line_id: Optional[str] = None,
    notes: Optional[str] = None,
) -> StockMovement:
    if qty <= 0:
        raise BadRequestException("Qty harus lebih dari 0")

    stock = _get_stock_row(db, product_id, unit_id, category_id, for_update=True)
    qty_before = _decimal(stock.qty_on_hand)

    if direction == "in":
        qty_after = qty_before + qty
    elif direction == "out":
        if qty_before < qty:
            raise BadRequestException(
                f"Stok kategori tidak mencukupi. Tersedia: {qty_before}, diminta: {qty}"
            )
        qty_after = qty_before - qty
    else:
        raise BadRequestException("Arah mutasi tidak valid")

    movement = StockMovement(
        id=str(uuid.uuid4()),
        product_id=product_id,
        unit_id=unit_id,
        category_id=category_id,
        movement_type=movement_type,
        qty=qty,
        qty_before=qty_before,
        qty_after=qty_after,
        reference_type=reference_type,
        reference_id=reference_id,
        reference_line_id=reference_line_id,
        notes=notes,
        created_by=user.id if user else None,
    )
    stock.qty_on_hand = qty_after
    db.add(movement)
    db.flush()
    return movement


def build_movement_read(db: Session, movement: StockMovement) -> StockMovementRead:
    db.refresh(movement, ["product", "unit", "category", "actor"])
    if movement.product:
        db.refresh(movement.product, ["vendor", "uom", "product_type", "categories"])
    actor_name = None
    if movement.actor:
        actor_name = movement.actor.fullname or movement.actor.username
    return StockMovementRead(
        id=movement.id,
        product_id=movement.product_id,
        unit_id=movement.unit_id,
        category_id=movement.category_id,
        movement_type=movement.movement_type,
        movement_type_label=MOVEMENT_TYPE_LABELS.get(movement.movement_type, movement.movement_type),
        qty=movement.qty,
        qty_before=movement.qty_before,
        qty_after=movement.qty_after,
        reference_type=movement.reference_type,
        reference_id=movement.reference_id,
        reference_line_id=movement.reference_line_id,
        notes=movement.notes,
        created_by=movement.created_by,
        actor_name=actor_name,
        created_at=movement.created_at,
        product=movement.product,
        unit=movement.unit,
        category=movement.category,
    )


def build_stock_read(db: Session, stock: ProductStock) -> ProductStockRead:
    db.refresh(stock, ["product", "unit", "category"])
    if stock.product:
        db.refresh(stock.product, ["vendor", "uom", "product_type", "categories"])

    minimum_stock = _decimal(stock.product.minimum_stock) if stock.product else Decimal("0")
    qty_on_hand = _decimal(stock.qty_on_hand)
    is_below_minimum = minimum_stock > 0 and qty_on_hand < minimum_stock

    base = ProductStockRead.model_validate(stock)
    return base.model_copy(
        update={
            "minimum_stock": minimum_stock,
            "is_below_minimum": is_below_minimum,
        }
    )


def receive_po_item_delivery(
    db: Session,
    item: PurchaseItem,
    po: PurchaseOrder,
    *,
    user: Optional[User] = None,
) -> Optional[StockMovement]:
    """Post stock IN for a single PO item when marked as received."""
    db.refresh(item, ["delivery_status", "pr_item", "product"])
    if not item.delivery_status or item.delivery_status.name not in RECEIPT_DELIVERY_STATUS_NAMES:
        return None

    pr = po.purchase_requisition
    if not pr or not pr.unit_id:
        return None

    if not item.product_id:
        return None

    category_id = item.pr_item.category_id if item.pr_item else None
    if not category_id:
        return None

    qty = _decimal(item.real_qty)
    if qty <= 0:
        return None

    existing = (
        db.query(StockMovement)
        .filter(
            StockMovement.reference_type == REFERENCE_PO_ITEM,
            StockMovement.reference_line_id == item.id,
            StockMovement.movement_type == MOVEMENT_RECEIPT_PO,
        )
        .first()
    )
    if existing:
        return None

    return _apply_movement(
        db,
        product_id=item.product_id,
        unit_id=pr.unit_id,
        category_id=category_id,
        movement_type=MOVEMENT_RECEIPT_PO,
        qty=qty,
        direction="in",
        user=user,
        reference_type=REFERENCE_PO_ITEM,
        reference_id=po.id,
        reference_line_id=item.id,
        notes=f"Penerimaan dari PO {po.po_number}",
    )


def receive_po_delivery(db: Session, po: PurchaseOrder, *, user: Optional[User] = None) -> list[StockMovement]:
    """Legacy: receive all eligible items on a PO."""
    db.refresh(po, ["items", "purchase_requisition"])
    movements: list[StockMovement] = []
    for item in po.items or []:
        movement = receive_po_item_delivery(db, item, po, user=user)
        if movement:
            movements.append(movement)
    return movements


def create_issue(
    db: Session,
    user: User,
    *,
    product_id: str,
    unit_id: str,
    category_id: int,
    qty: Decimal,
    notes: Optional[str] = None,
) -> StockMovement:
    _validate_category_for_stock(
        db, user, product_id=product_id, unit_id=unit_id, category_id=category_id
    )
    movement = _apply_movement(
        db,
        product_id=product_id,
        unit_id=unit_id,
        category_id=category_id,
        movement_type=MOVEMENT_ISSUE_USAGE,
        qty=_decimal(qty),
        direction="out",
        user=user,
        reference_type=REFERENCE_MANUAL,
        notes=notes,
    )
    db.commit()
    db.refresh(movement)
    return movement


def create_adjustment(
    db: Session,
    user: User,
    *,
    product_id: str,
    unit_id: str,
    category_id: int,
    qty: Decimal,
    direction: str,
    notes: Optional[str] = None,
) -> StockMovement:
    _validate_category_for_stock(
        db, user, product_id=product_id, unit_id=unit_id, category_id=category_id
    )
    movement_type = MOVEMENT_ADJUSTMENT_IN if direction == "in" else MOVEMENT_ADJUSTMENT_OUT
    movement = _apply_movement(
        db,
        product_id=product_id,
        unit_id=unit_id,
        category_id=category_id,
        movement_type=movement_type,
        qty=_decimal(qty),
        direction=direction,
        user=user,
        reference_type=REFERENCE_MANUAL,
        notes=notes,
    )
    db.commit()
    db.refresh(movement)
    return movement


def list_stocks(
    db: Session,
    user: User,
    *,
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    unit_id: Optional[str] = None,
    category_id: Optional[int] = None,
    product_id: Optional[str] = None,
) -> tuple[list[ProductStockRead], int, int]:
    from app.models.purchasing import Vendor

    query = (
        db.query(ProductStock)
        .join(Product, ProductStock.product_id == Product.id)
        .join(Category, ProductStock.category_id == Category.id)
    )

    unit_ids = scope_svc.get_accessible_unit_ids(db, user)
    if unit_ids is not None:
        if not unit_ids:
            return [], 0, 0
        query = query.filter(ProductStock.unit_id.in_(unit_ids))

    if unit_id:
        scope_svc.require_unit_access_forbidden(db, user, unit_id)
        query = query.filter(ProductStock.unit_id == unit_id)

    if category_id:
        query = query.filter(ProductStock.category_id == category_id)

    if product_id:
        query = query.filter(ProductStock.product_id == product_id)

    if search:
        like = f"%{search}%"
        query = query.join(Vendor, Product.vendor_id == Vendor.id).filter(
            Product.name.ilike(like)
            | Vendor.company_name.ilike(like)
            | Category.name.ilike(like)
        )

    low_stock_count = query.filter(
        Product.minimum_stock > 0,
        ProductStock.qty_on_hand < Product.minimum_stock,
    ).count()

    total = query.count()
    offset = (page - 1) * limit
    rows = (
        query.order_by(Category.name.asc(), Product.name.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [build_stock_read(db, row) for row in rows], total, low_stock_count


def list_movements(
    db: Session,
    user: User,
    *,
    page: int = 1,
    limit: int = 20,
    unit_id: Optional[str] = None,
    category_id: Optional[int] = None,
    product_id: Optional[str] = None,
    movement_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> tuple[list[StockMovementRead], int]:
    query = db.query(StockMovement)

    unit_ids = scope_svc.get_accessible_unit_ids(db, user)
    if unit_ids is not None:
        if not unit_ids:
            return [], 0
        query = query.filter(StockMovement.unit_id.in_(unit_ids))

    if unit_id:
        scope_svc.require_unit_access_forbidden(db, user, unit_id)
        query = query.filter(StockMovement.unit_id == unit_id)
    if category_id:
        query = query.filter(StockMovement.category_id == category_id)
    if product_id:
        query = query.filter(StockMovement.product_id == product_id)
    if movement_type:
        query = query.filter(StockMovement.movement_type == movement_type)
    if date_from:
        start = wib_date_start_as_utc_naive(date_from)
        query = query.filter(StockMovement.created_at >= start)
    if date_to:
        end = wib_date_end_as_utc_naive(date_to)
        query = query.filter(StockMovement.created_at <= end)

    total = query.count()
    offset = (page - 1) * limit
    rows = (
        query.order_by(StockMovement.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [build_movement_read(db, row) for row in rows], total


def _balance_before(
    db: Session,
    product_id: str,
    unit_id: str,
    category_id: int,
    before: datetime,
) -> Decimal:
    last = (
        db.query(StockMovement)
        .filter(
            StockMovement.product_id == product_id,
            StockMovement.unit_id == unit_id,
            StockMovement.category_id == category_id,
            StockMovement.created_at < before,
        )
        .order_by(StockMovement.created_at.desc())
        .first()
    )
    return _decimal(last.qty_after) if last else Decimal("0")


def get_daily_summary(
    db: Session,
    user: User,
    *,
    date_from: date,
    date_to: Optional[date] = None,
    unit_id: Optional[str] = None,
    category_id: Optional[int] = None,
) -> StockDailySummaryRead:
    from app.models.unit import Unit

    effective_to = date_to or date_from
    if date_from > effective_to:
        from app.core.exceptions import BadRequestException
        raise BadRequestException("Tanggal mulai tidak boleh lebih besar dari tanggal akhir")

    unit_ids = scope_svc.get_accessible_unit_ids(db, user)
    if unit_ids is not None and not unit_ids:
        return StockDailySummaryRead(date=date_from, date_from=date_from, date_to=effective_to, items=[])

    if unit_id:
        scope_svc.require_unit_access_forbidden(db, user, unit_id)
        filter_units = [unit_id]
    elif unit_ids is None:
        filter_units = None
    else:
        filter_units = list(unit_ids)

    period_start = wib_date_start_as_utc_naive(date_from)
    period_end = wib_date_end_as_utc_naive(effective_to)

    stock_query = db.query(ProductStock)
    if filter_units:
        stock_query = stock_query.filter(ProductStock.unit_id.in_(filter_units))
    if category_id:
        stock_query = stock_query.filter(ProductStock.category_id == category_id)
    stocks = stock_query.all()

    items: list[StockDailySummaryItem] = []
    unit_name_map: dict[str, str] = {}
    category_name_map: dict[int, str] = {}

    for stock in stocks:
        product = db.query(Product).filter(Product.id == stock.product_id).first()
        category = db.query(Category).filter(Category.id == stock.category_id).first()
        if not product or not category:
            continue

        movements_today = (
            db.query(StockMovement)
            .filter(
                StockMovement.product_id == stock.product_id,
                StockMovement.unit_id == stock.unit_id,
                StockMovement.category_id == stock.category_id,
                StockMovement.created_at >= period_start,
                StockMovement.created_at <= period_end,
            )
            .order_by(StockMovement.created_at.asc())
            .all()
        )

        opening = _balance_before(
            db, stock.product_id, stock.unit_id, stock.category_id, period_start
        )

        total_in = Decimal("0")
        total_out = Decimal("0")
        for mv in movements_today:
            qty = _decimal(mv.qty)
            if mv.movement_type in (MOVEMENT_RECEIPT_PO, MOVEMENT_ADJUSTMENT_IN):
                total_in += qty
            else:
                total_out += qty

        closing = opening + total_in - total_out

        if opening == 0 and total_in == 0 and total_out == 0 and closing == 0:
            continue

        if stock.unit_id not in unit_name_map:
            unit = db.query(Unit).filter(Unit.id == stock.unit_id).first()
            unit_name_map[stock.unit_id] = unit.name if unit else stock.unit_id
        if stock.category_id not in category_name_map:
            category_name_map[stock.category_id] = category.name

        items.append(
            StockDailySummaryItem(
                product_id=stock.product_id,
                product_name=product.name,
                unit_id=stock.unit_id,
                unit_name=unit_name_map[stock.unit_id],
                category_id=stock.category_id,
                category_name=category_name_map[stock.category_id],
                opening_qty=opening,
                total_in=total_in,
                total_out=total_out,
                closing_qty=closing,
            )
        )

    unit_name = None
    category_name = None
    if unit_id:
        unit = db.query(Unit).filter(Unit.id == unit_id).first()
        unit_name = unit.name if unit else None
    if category_id:
        cat = db.query(Category).filter(Category.id == category_id).first()
        category_name = cat.name if cat else None

    return StockDailySummaryRead(
        date=date_from,
        date_from=date_from,
        date_to=effective_to,
        unit_id=unit_id,
        unit_name=unit_name,
        category_id=category_id,
        category_name=category_name,
        items=sorted(items, key=lambda x: (x.category_name.lower(), x.product_name.lower())),
    )

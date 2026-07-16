from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.purchasing import CategoryRead, ProductDetailRead
from app.schemas.unit import UnitRead


MOVEMENT_RECEIPT_PO = "receipt_po"
MOVEMENT_ISSUE_USAGE = "issue_usage"
MOVEMENT_ADJUSTMENT_IN = "adjustment_in"
MOVEMENT_ADJUSTMENT_OUT = "adjustment_out"

MOVEMENT_TYPE_LABELS = {
    MOVEMENT_RECEIPT_PO: "Penerimaan PO",
    MOVEMENT_ISSUE_USAGE: "Pemakaian",
    MOVEMENT_ADJUSTMENT_IN: "Penyesuaian (+)",
    MOVEMENT_ADJUSTMENT_OUT: "Penyesuaian (-)",
}


class ProductStockRead(BaseModel):
    id: str
    product_id: str
    unit_id: str
    category_id: int
    qty_on_hand: Decimal
    minimum_stock: Decimal = Decimal("0")
    is_below_minimum: bool = False
    product: Optional[ProductDetailRead] = None
    unit: Optional[UnitRead] = None
    category: Optional[CategoryRead] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class StockMovementRead(BaseModel):
    id: str
    product_id: str
    unit_id: str
    category_id: int
    movement_type: str
    movement_type_label: Optional[str] = None
    qty: Decimal
    qty_before: Decimal
    qty_after: Decimal
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    reference_line_id: Optional[str] = None
    notes: Optional[str] = None
    created_by: Optional[str] = None
    actor_name: Optional[str] = None
    created_at: Optional[datetime] = None
    product: Optional[ProductDetailRead] = None
    unit: Optional[UnitRead] = None
    category: Optional[CategoryRead] = None

    model_config = ConfigDict(from_attributes=True)


class StockIssueCreate(BaseModel):
    product_id: str
    unit_id: str
    category_id: int
    qty: Decimal = Field(gt=0)
    notes: Optional[str] = None


class StockAdjustmentCreate(BaseModel):
    product_id: str
    unit_id: str
    category_id: int
    qty: Decimal = Field(gt=0)
    direction: str = Field(pattern="^(in|out)$")
    notes: Optional[str] = None


class StockDailySummaryItem(BaseModel):
    product_id: str
    product_name: str
    unit_id: str
    unit_name: str
    category_id: int
    category_name: str
    opening_qty: Decimal
    total_in: Decimal
    total_out: Decimal
    closing_qty: Decimal


class StockDailySummaryRead(BaseModel):
    date: date
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    unit_id: Optional[str] = None
    unit_name: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    items: List[StockDailySummaryItem] = []

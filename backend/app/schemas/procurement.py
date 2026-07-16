from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import MediaRead
from app.schemas.purchasing import CategoryRead, ProductRead, VendorRead, ProductDetailRead
from app.schemas.unit import UnitRead


class PurchaseTypeRead(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DeliveryStatusRead(BaseModel):
    id: int
    name: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class PaymentStatusRead(BaseModel):
    id: int
    name: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class PrVendorDueDateCreate(BaseModel):
    vendor_id: str
    due_date: date


class PrVendorDueDateRead(BaseModel):
    vendor_id: str
    due_date: date
    vendor: Optional[VendorRead] = None

    model_config = ConfigDict(from_attributes=True)


class PrItemBase(BaseModel):
    vendor_id: Optional[str] = None
    product_id: Optional[str] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    request_qty: Decimal = Field(ge=0, default=Decimal("0"))
    request_price: Decimal = Field(ge=0, default=Decimal("0"))
    due_date: Optional[date] = None


class PrItemCreate(PrItemBase):
    pass


class PrItemRead(PrItemBase):
    id: str
    request_total: Decimal
    vendor: Optional[VendorRead] = None
    product: Optional[ProductDetailRead] = None
    category: Optional[CategoryRead] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PrApprovalLogRead(BaseModel):
    id: int
    approval_status: str
    action: str
    role_name: Optional[str] = None
    scope_id: Optional[str] = None
    action_by: Optional[str] = None
    actor_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PurchaseItemRead(BaseModel):
    id: str
    product_id: Optional[str] = None
    description: Optional[str] = None
    real_qty: Decimal
    real_price: Decimal
    real_total: Decimal
    original_real_price: Optional[Decimal] = None
    original_real_total: Optional[Decimal] = None
    pr_request_price: Optional[Decimal] = None
    pr_request_qty: Optional[Decimal] = None
    pr_request_total: Optional[Decimal] = None
    due_date: Optional[date] = None
    delivery_status_id: Optional[int] = None
    payment_status_id: Optional[int] = None
    delivery_status: Optional[DeliveryStatusRead] = None
    payment_status: Optional[PaymentStatusRead] = None
    can_update_delivery: bool = False
    can_update_payment: bool = False
    can_update_price: bool = False
    can_update_qty: bool = False
    product: Optional[ProductDetailRead] = None
    pr_item_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PurchaseOrderItemListRead(BaseModel):
    id: str
    po_id: str
    po_number: str
    pr_id: Optional[str] = None
    pr_number: Optional[str] = None
    vendor_name: Optional[str] = None
    product_name: str
    category_name: Optional[str] = None
    description: Optional[str] = None
    real_qty: Decimal
    uom: Optional[str] = None
    real_price: Decimal
    real_total: Decimal
    delivery_status: Optional[DeliveryStatusRead] = None
    payment_status: Optional[PaymentStatusRead] = None
    due_date: Optional[date] = None
    po_created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PoPriceLogRead(BaseModel):
    id: int
    purchase_item_id: str
    old_price: Decimal
    new_price: Decimal
    old_total: Decimal
    new_total: Decimal
    action_by: Optional[str] = None
    actor_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PurchaseItemPriceUpdate(BaseModel):
    real_price: Decimal = Field(ge=0)
    notes: Optional[str] = None


class PurchaseItemQtyUpdate(BaseModel):
    real_qty: Decimal = Field(gt=0)
    notes: Optional[str] = None


class PrPoPriceVarianceRow(BaseModel):
    purchase_item_id: str
    po_id: str
    po_number: str
    pr_id: Optional[str] = None
    pr_number: Optional[str] = None
    unit_id: Optional[str] = None
    unit_name: Optional[str] = None
    vendor_id: Optional[str] = None
    vendor_name: Optional[str] = None
    product_name: str
    real_qty: Decimal
    pr_request_price: Decimal
    pr_request_total: Decimal
    original_po_price: Decimal
    original_po_total: Decimal
    current_po_price: Decimal
    current_po_total: Decimal
    price_variance: Decimal
    total_variance: Decimal
    payment_status: Optional[str] = None
    has_price_change: bool = False
    differs_from_pr: bool = False


class PurchaseOrderRead(BaseModel):
    id: str
    po_number: str
    pr_id: Optional[str] = None
    pr_number: Optional[str] = None
    vendor_id: Optional[str] = None
    vendor: Optional[VendorRead] = None
    delivery_status_id: Optional[int] = None
    payment_status_id: Optional[int] = None
    delivery_status: Optional[DeliveryStatusRead] = None
    payment_status: Optional[PaymentStatusRead] = None
    items: List[PurchaseItemRead] = []
    total_amount: Optional[Decimal] = None
    due_date: Optional[date] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PoStatusLogRead(BaseModel):
    id: int
    status_type: str
    status_id: int
    status_name: str
    purchase_item_id: Optional[str] = None
    item_label: Optional[str] = None
    action_by: Optional[str] = None
    actor_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    proof_media: List[MediaRead] = []

    model_config = ConfigDict(from_attributes=True)


class PurchaseOrderDetailRead(PurchaseOrderRead):
    unit: Optional[UnitRead] = None
    purchase_type: Optional[PurchaseTypeRead] = None
    status_logs: List[PoStatusLogRead] = []
    price_logs: List[PoPriceLogRead] = []


class PurchaseOrderUpdate(BaseModel):
    notes: Optional[str] = None


class PurchaseRequisitionBase(BaseModel):
    unit_id: Optional[str] = None
    purchase_type_id: Optional[int] = None


class PurchaseRequisitionCreate(PurchaseRequisitionBase):
    items: List[PrItemCreate] = []
    vendor_due_dates: List[PrVendorDueDateCreate] = []


class PurchaseRequisitionUpdate(PurchaseRequisitionBase):
    items: Optional[List[PrItemCreate]] = None
    vendor_due_dates: Optional[List[PrVendorDueDateCreate]] = None


class PurchaseRequisitionRead(PurchaseRequisitionBase):
    id: str
    pr_number: str
    approval_status: str
    submitted_by: Optional[str] = None
    submitted_at: Optional[datetime] = None
    is_fully_approved: bool
    fully_approved_at: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    unit: Optional[UnitRead] = None
    purchase_type: Optional[PurchaseTypeRead] = None
    total_amount: Optional[Decimal] = None
    items: List[PrItemRead] = []
    vendor_due_dates: List[PrVendorDueDateRead] = []

    model_config = ConfigDict(from_attributes=True)


class PurchaseRequisitionDetailRead(PurchaseRequisitionRead):
    approval_logs: List[PrApprovalLogRead] = []
    purchase_orders: List[PurchaseOrderRead] = []
    can_approve: bool = False
    can_edit: bool = False
    can_submit: bool = False
    submitter_name: Optional[str] = None
    creator_name: Optional[str] = None


class ApprovalAction(BaseModel):
    comment: Optional[str] = None

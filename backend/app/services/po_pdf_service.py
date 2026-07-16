"""
Generate Purchase Order PDF documents using Playwright (HTML → PDF).
"""
from __future__ import annotations

import io
import re
import zipfile
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.auth import User
from app.models.common import Setting
from app.models.procurement import PurchaseOrder, PurchaseRequisition

TZ = ZoneInfo("Asia/Jakarta")
TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "po"


def _format_idr(amount) -> str:
    value = Decimal(str(amount or 0))
    formatted = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    if formatted.endswith(",00"):
        formatted = formatted[:-3]
    return f"Rp {formatted}"


def _format_qty(qty) -> str:
    value = Decimal(str(qty or 0))
    text = f"{value:f}".rstrip("0").rstrip(".")
    return text or "0"


def _format_datetime(dt: Optional[datetime]) -> str:
    if not dt:
        return "-"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=TZ)
    else:
        dt = dt.astimezone(TZ)
    return dt.strftime("%d %b %Y %H:%M WIB")


def _format_date(dt: Optional[datetime | date]) -> str:
    if not dt:
        return "-"
    if isinstance(dt, date) and not isinstance(dt, datetime):
        return dt.strftime("%d %B %Y")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=TZ)
    else:
        dt = dt.astimezone(TZ)
    return dt.strftime("%d %B %Y")


def _slug_filename(text: str, max_len: int = 40) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", (text or "").strip()).strip("-").lower()
    return (slug[:max_len] or "vendor").rstrip("-")


def _load_settings(db: Session) -> dict[str, str]:
    rows = db.query(Setting).filter(Setting.group == "general").all()
    return {row.name: (row.payload or "") for row in rows}


def _user_display_name(db: Session, user_id: Optional[str]) -> str:
    if not user_id:
        return "-"
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return "-"
    if user.fullname:
        return user.fullname
    name = f"{user.firstname or ''} {user.lastname or ''}".strip()
    return name or user.username or "-"


def _resolve_signatures(db: Session, pr: Optional[PurchaseRequisition]) -> tuple[str, str]:
    prepared_by = "-"
    approved_by_finance = "-"
    if not pr:
        return prepared_by, approved_by_finance

    for log in sorted(pr.approval_logs or [], key=lambda x: x.created_at or datetime.min):
        if log.action == "submit" and prepared_by == "-":
            prepared_by = _user_display_name(db, log.action_by)
        if log.action == "approve" and log.role_name == "finance":
            approved_by_finance = _user_display_name(db, log.action_by)

    if prepared_by == "-" and pr.submitted_by:
        prepared_by = _user_display_name(db, pr.submitted_by)
    if prepared_by == "-" and pr.created_by:
        prepared_by = _user_display_name(db, pr.created_by)
    if approved_by_finance == "-" and pr.fully_approved_by:
        approved_by_finance = _user_display_name(db, pr.fully_approved_by)

    return prepared_by, approved_by_finance


def _ensure_pr_fully_approved(pr: PurchaseRequisition) -> None:
    if not pr.is_fully_approved or pr.approval_status != "approved":
        raise BadRequestException(
            "Export PDF PO hanya tersedia setelah PR disetujui sepenuhnya (Brand Manager & Finance)"
        )


def _refresh_po_for_pdf(db: Session, po: PurchaseOrder) -> None:
    db.refresh(
        po,
        [
            "vendor",
            "delivery_status",
            "payment_status",
            "items",
            "purchase_requisition",
        ],
    )
    pr = po.purchase_requisition
    if pr:
        db.refresh(pr, ["unit", "purchase_type", "approval_logs"])
    for item in po.items or []:
        db.refresh(item, ["product", "pr_item", "delivery_status", "payment_status"])
        if item.product:
            db.refresh(item.product, ["uom"])
        if item.pr_item:
            db.refresh(item.pr_item, ["category"])


def _build_template_context(db: Session, po: PurchaseOrder) -> dict:
    _refresh_po_for_pdf(db, po)
    pr = po.purchase_requisition
    settings = _load_settings(db)

    line_items = []
    subtotal = Decimal("0")
    for item in po.items or []:
        product = item.product
        pr_item = item.pr_item
        name = (product.name if product else None) or item.description or "-"
        uom = "-"
        if product and product.uom:
            uom = product.uom.shortname or product.uom.name or "-"
        category = None
        if pr_item and pr_item.category:
            category = pr_item.category.name
        line_total = Decimal(str(item.real_total or 0))
        subtotal += line_total
        line_items.append(
            {
                "name": name,
                "description": item.description or "",
                "category": category,
                "qty": _format_qty(item.real_qty),
                "uom": uom,
                "unit_price": _format_idr(item.real_price),
                "line_total": _format_idr(line_total),
                "due_date": _format_date(item.due_date),
            }
        )

    vendor = po.vendor
    unit = pr.unit if pr else None
    prepared_by, approved_by_finance = _resolve_signatures(db, pr)

    return {
        "company_name": settings.get("company_name") or settings.get("site_name") or "Perusahaan",
        "company_address": settings.get("company_address", ""),
        "company_phone": settings.get("company_phone", ""),
        "company_email": settings.get("company_email", ""),
        "site_name": settings.get("site_name", "Purchasing Go"),
        "po_number": po.po_number,
        "po_date": _format_date(po.created_at),
        "due_date": _format_date(po.due_date),
        "due_date_note": "Ringkasan jatuh tempo terakhir (per item di tabel)",
        "pr_number": pr.pr_number if pr else "-",
        "purchase_type": pr.purchase_type.name if pr and pr.purchase_type else "-",
        "unit_name": unit.name if unit else "-",
        "delivery_status": po.delivery_status.name if po.delivery_status else "-",
        "payment_status": po.payment_status.name if po.payment_status else "-",
        "approved_at": _format_datetime(pr.fully_approved_at if pr else None),
        "vendor_name": vendor.company_name if vendor else "-",
        "vendor_address": vendor.address if vendor else "",
        "vendor_phone": vendor.phone if vendor else "",
        "items": line_items,
        "subtotal": _format_idr(subtotal),
        "grand_total": _format_idr(subtotal),
        "notes": "",
        "prepared_by": prepared_by,
        "approved_by_finance": approved_by_finance,
        "generated_at": datetime.now(TZ).strftime("%d %b %Y %H:%M WIB"),
    }


def _render_html(context: dict) -> str:
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    template = env.get_template("purchase_order.html")
    return template.render(**context)


def _html_to_pdf(html: str) -> bytes:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            page.set_content(html, wait_until="load")
            return page.pdf(
                format="A4",
                print_background=True,
                margin={"top": "10mm", "right": "10mm", "bottom": "10mm", "left": "10mm"},
            )
        finally:
            browser.close()


def po_pdf_filename(po: PurchaseOrder) -> str:
    vendor_part = _slug_filename(po.vendor.company_name if po.vendor else "vendor")
    safe_po = re.sub(r"[^a-zA-Z0-9\-]+", "-", po.po_number).strip("-")
    if safe_po.upper().startswith("PO-"):
        return f"{safe_po}-{vendor_part}.pdf"
    return f"PO-{safe_po}-{vendor_part}.pdf"


def generate_po_pdf(db: Session, po: PurchaseOrder) -> bytes:
    pr = po.purchase_requisition
    if not pr:
        raise BadRequestException("PO tidak terkait dengan PR")
    _ensure_pr_fully_approved(pr)
    context = _build_template_context(db, po)
    html = _render_html(context)
    return _html_to_pdf(html)


def generate_pr_po_pdfs_zip(db: Session, pr: PurchaseRequisition) -> tuple[bytes, str]:
    _ensure_pr_fully_approved(pr)
    orders = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.pr_id == pr.id)
        .order_by(PurchaseOrder.po_number)
        .all()
    )
    if not orders:
        raise NotFoundException("Belum ada PO yang diterbitkan untuk PR ini")

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for po in orders:
            pdf_bytes = generate_po_pdf(db, po)
            zf.writestr(po_pdf_filename(po), pdf_bytes)

    safe_pr = re.sub(r"[^a-zA-Z0-9\-]+", "-", pr.pr_number).strip("-")
    zip_name = f"PO-{safe_pr}-semua-vendor.zip"
    return buffer.getvalue(), zip_name


def get_po_for_pdf(db: Session, po_id: str) -> PurchaseOrder:
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise NotFoundException("Purchase order tidak ditemukan")
    return po


def get_pr_for_po_export(db: Session, pr_id: str) -> PurchaseRequisition:
    pr = db.query(PurchaseRequisition).filter(PurchaseRequisition.id == pr_id).first()
    if not pr:
        raise NotFoundException("Purchase requisition tidak ditemukan")
    return pr

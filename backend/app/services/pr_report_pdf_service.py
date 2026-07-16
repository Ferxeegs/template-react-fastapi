"""
PDF export for Purchase Requisitions list (with line items).
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from app.models.procurement import PrItem, PurchaseRequisition
from app.services.excel_export_utils import (
    date_range_filename_suffix,
    format_date_range_label,
)
from app.services.pdf_report_utils import (
    WIB,
    format_datetime_wib,
    format_idr,
    format_qty,
    html_to_pdf,
    render_report_template,
)

APPROVAL_STATUS_LABELS = {
    "draft": "Draft",
    "pending_brand_manager": "Menunggu Brand Manager",
    "pending_finance": "Menunggu Finance",
    "approved": "Disetujui",
    "rejected": "Ditolak",
}


def pr_list_pdf_filename(
    date_from: date | None = None,
    date_to: date | None = None,
) -> str:
    stamp = datetime.now(WIB).strftime("%Y%m%d")
    return f"laporan-daftar-pr{date_range_filename_suffix(date_from, date_to)}_{stamp}.pdf"


def _approval_label(status: str | None) -> str:
    if not status:
        return "-"
    return APPROVAL_STATUS_LABELS.get(status, status)


def _item_name(item: PrItem) -> str:
    product = item.product
    if product and product.name:
        return product.name
    return (item.description or "").strip() or "-"


def _item_uom(item: PrItem) -> str:
    product = item.product
    if product and product.uom:
        return product.uom.shortname or product.uom.name or "-"
    return "-"


def generate_pr_list_pdf(
    prs: list[PurchaseRequisition],
    *,
    generated_by: str,
    search: Optional[str] = None,
    approval_status: Optional[str] = None,
    pending_approval: bool = False,
    date_from: date | None = None,
    date_to: date | None = None,
) -> bytes:
    sections = []
    total_amount = Decimal("0")
    total_items = 0

    for idx, pr in enumerate(prs, start=1):
        items = list(pr.items or [])
        item_rows = []
        pr_total = Decimal("0")

        for item_idx, item in enumerate(items, start=1):
            line_total = Decimal(str(item.request_total or 0))
            pr_total += line_total
            item_rows.append(
                {
                    "no": item_idx,
                    "name": _item_name(item),
                    "vendor": item.vendor.company_name if item.vendor else "-",
                    "category": item.category.name if item.category else "-",
                    "qty": format_qty(item.request_qty),
                    "uom": _item_uom(item),
                    "unit_price": format_idr(item.request_price),
                    "line_total": format_idr(line_total),
                }
            )

        total_amount += pr_total
        total_items += len(items)
        sections.append(
            {
                "no": idx,
                "pr_number": pr.pr_number,
                "unit_name": pr.unit.name if pr.unit else "-",
                "purchase_type": pr.purchase_type.name if pr.purchase_type else "-",
                "approval_status": _approval_label(pr.approval_status),
                "created_at": format_datetime_wib(pr.created_at),
                "line_items": item_rows,
                "subtotal": format_idr(pr_total),
                "item_count": len(items),
            }
        )

    meta_rows = [
        ("Periode Laporan", format_date_range_label(date_from, date_to)),
        ("Pencarian", search or "—"),
    ]
    if approval_status:
        meta_rows.append(("Status", _approval_label(approval_status)))
    if pending_approval:
        meta_rows.append(("Filter", "Menunggu approval saya"))
    meta_rows.extend([
        ("Waktu Cetak", datetime.now(WIB).strftime("%d/%m/%Y %H:%M WIB")),
        ("Petugas / User", generated_by),
        ("Jumlah PR", str(len(prs))),
        ("Jumlah Item", str(total_items)),
    ])

    context = {
        "title": "LAPORAN PURCHASE REQUISITION",
        "subtitle": "Purchasing Go — Daftar Purchase Requisition beserta Rincian Item",
        "meta_rows": meta_rows,
        "sections": sections,
        "total_amount": format_idr(total_amount),
        "empty_message": "Tidak ada data purchase requisition pada periode ini.",
        "empty_items_message": "Tidak ada item pada PR ini.",
        "footer_note": (
            "Catatan: Setiap bagian menampilkan rincian item per Purchase Requisition. "
            "Total dihitung dari jumlah nilai item PR saat ini. "
            "Dokumen ini dihasilkan otomatis oleh sistem Purchasing Go."
        ),
    }
    html = render_report_template("pr_list_report.html", context)
    return html_to_pdf(html, landscape=True)

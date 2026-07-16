"""
PDF export for Purchase Order items list.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from app.schemas.procurement import PurchaseOrderItemListRead
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


def po_item_list_pdf_filename(
    date_from: date | None = None,
    date_to: date | None = None,
) -> str:
    stamp = datetime.now(WIB).strftime("%Y%m%d")
    return f"laporan-item-po{date_range_filename_suffix(date_from, date_to)}_{stamp}.pdf"


def generate_po_item_list_pdf(
    items: list[PurchaseOrderItemListRead],
    *,
    generated_by: str,
    search: Optional[str] = None,
    delivery_status: Optional[str] = None,
    payment_status: Optional[str] = None,
    category_name: Optional[str] = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> bytes:
    rows = []
    total_amount = Decimal("0")
    for idx, item in enumerate(items, start=1):
        line_total = Decimal(str(item.real_total or 0))
        total_amount += line_total
        rows.append(
            {
                "no": idx,
                "po_number": item.po_number,
                "pr_number": item.pr_number or "-",
                "vendor": item.vendor_name or "-",
                "product_name": item.product_name,
                "category": item.category_name or "-",
                "qty": format_qty(item.real_qty),
                "uom": item.uom or "-",
                "unit_price": format_idr(item.real_price),
                "line_total": format_idr(line_total),
                "delivery_status": item.delivery_status.name if item.delivery_status else "-",
                "payment_status": item.payment_status.name if item.payment_status else "-",
                "created_at": format_datetime_wib(item.po_created_at),
            }
        )

    meta_rows = [
        ("Periode Laporan", format_date_range_label(date_from, date_to)),
        ("Pencarian", search or "—"),
    ]
    if delivery_status:
        meta_rows.append(("Status Pengiriman", delivery_status))
    if payment_status:
        meta_rows.append(("Status Pembayaran", payment_status))
    if category_name:
        meta_rows.append(("Kategori", category_name))
    meta_rows.extend([
        ("Waktu Cetak", datetime.now(WIB).strftime("%d/%m/%Y %H:%M WIB")),
        ("Petugas / User", generated_by),
        ("Jumlah Item", str(len(items))),
    ])

    context = {
        "title": "LAPORAN ITEM PURCHASE ORDER",
        "subtitle": "Purchasing Go — Daftar Item Purchase Order",
        "meta_rows": meta_rows,
        "rows": rows,
        "total_amount": format_idr(total_amount),
        "empty_message": "Tidak ada data item purchase order sesuai filter.",
        "footer_note": (
            "Catatan: Data diekspor sesuai filter yang dipilih. "
            "Total dihitung dari jumlah nilai item yang ditampilkan. "
            "Dokumen ini dihasilkan otomatis oleh sistem Purchasing Go."
        ),
    }
    html = render_report_template("po_item_list_report.html", context)
    return html_to_pdf(html, landscape=True)

"""
PDF export for PO list and PR vs PO price variance reports.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from app.models.procurement import PurchaseOrder
from app.schemas.procurement import PrPoPriceVarianceRow
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


def _criteria_label(only_variance: bool, unpaid_only: bool) -> str:
    parts: list[str] = []
    if only_variance:
        parts.append("Hanya Selisih Harga")
    if unpaid_only:
        parts.append("Hanya Belum Lunas")
    return ", ".join(parts) if parts else "Semua Data"


def _notes_for_row(row: PrPoPriceVarianceRow) -> str:
    notes: list[str] = []
    if row.has_price_change:
        notes.append("Revisi PO")
    if row.differs_from_pr:
        notes.append("Beda Harga PR")
    return ", ".join(notes) if notes else "-"


def _variance_class(value: Decimal) -> str:
    if value > 0:
        return "variance-up"
    if value < 0:
        return "variance-down"
    return ""


def po_list_pdf_filename(
    date_from: date | None = None,
    date_to: date | None = None,
) -> str:
    stamp = datetime.now(WIB).strftime("%Y%m%d")
    return f"laporan-daftar-po{date_range_filename_suffix(date_from, date_to)}_{stamp}.pdf"


def price_variance_pdf_filename(
    date_from: date | None = None,
    date_to: date | None = None,
) -> str:
    stamp = datetime.now(WIB).strftime("%Y%m%d")
    return f"laporan-selisih-harga-pr-po{date_range_filename_suffix(date_from, date_to)}_{stamp}.pdf"


def _item_name(item) -> str:
    product = item.product
    if product and product.name:
        return product.name
    return (item.description or "").strip() or "-"


def _item_uom(item) -> str:
    product = item.product
    if product and product.uom:
        return product.uom.shortname or product.uom.name or "-"
    return "-"


def generate_po_list_pdf(
    orders: list[PurchaseOrder],
    *,
    generated_by: str,
    search: Optional[str] = None,
    delivery_status: Optional[str] = None,
    payment_status: Optional[str] = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> bytes:
    sections = []
    total_amount = Decimal("0")
    total_items = 0

    for idx, po in enumerate(orders, start=1):
        items = list(po.items or [])
        item_rows = []
        po_total = Decimal("0")

        for item_idx, item in enumerate(items, start=1):
            line_total = Decimal(str(item.real_total or 0))
            po_total += line_total
            item_rows.append(
                {
                    "no": item_idx,
                    "name": _item_name(item),
                    "qty": format_qty(item.real_qty),
                    "uom": _item_uom(item),
                    "unit_price": format_idr(item.real_price),
                    "line_total": format_idr(line_total),
                }
            )

        total_amount += po_total
        total_items += len(items)
        sections.append(
            {
                "no": idx,
                "po_number": po.po_number,
                "pr_number": po.purchase_requisition.pr_number if po.purchase_requisition else "-",
                "vendor": po.vendor.company_name if po.vendor else "-",
                "delivery_status": po.delivery_status.name if po.delivery_status else "-",
                "payment_status": po.payment_status.name if po.payment_status else "-",
                "created_at": format_datetime_wib(po.created_at),
                "line_items": item_rows,
                "subtotal": format_idr(po_total),
                "item_count": len(items),
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
    meta_rows.extend([
        ("Waktu Cetak", datetime.now(WIB).strftime("%d/%m/%Y %H:%M WIB")),
        ("Petugas / User", generated_by),
        ("Jumlah PO", str(len(orders))),
        ("Jumlah Item", str(total_items)),
    ])

    context = {
        "title": "LAPORAN PURCHASE ORDER",
        "subtitle": "Purchasing Go — Daftar Purchase Order beserta Rincian Item",
        "meta_rows": meta_rows,
        "sections": sections,
        "total_amount": format_idr(total_amount),
        "empty_message": "Tidak ada data purchase order pada periode ini.",
        "empty_items_message": "Tidak ada item pada PO ini.",
        "footer_note": (
            "Catatan: Setiap bagian menampilkan rincian item per Purchase Order. "
            "Total dihitung dari jumlah nilai item PO saat ini. "
            "Dokumen ini dihasilkan otomatis oleh sistem Purchasing Go."
        ),
    }
    html = render_report_template("po_list_report.html", context)
    return html_to_pdf(html, landscape=True)


def generate_price_variance_pdf(
    rows: list[PrPoPriceVarianceRow],
    *,
    generated_by: Optional[str] = None,
    search: Optional[str] = None,
    unit_name: Optional[str] = None,
    only_variance: bool = False,
    unpaid_only: bool = False,
    date_from: date | None = None,
    date_to: date | None = None,
) -> bytes:
    table_rows = []
    total_po = Decimal("0")
    total_variance = Decimal("0")
    for idx, item in enumerate(rows, start=1):
        total_po += Decimal(str(item.current_po_total))
        total_variance += Decimal(str(item.total_variance))
        variance = Decimal(str(item.price_variance))
        table_rows.append(
            {
                "no": idx,
                "po_number": item.po_number,
                "pr_number": item.pr_number or "-",
                "product_name": item.product_name,
                "unit_name": item.unit_name or "-",
                "vendor_name": item.vendor_name or "-",
                "qty": format_qty(item.real_qty),
                "pr_price": format_idr(item.pr_request_price),
                "po_price": format_idr(item.current_po_price),
                "variance": format_idr(variance),
                "variance_class": _variance_class(variance),
                "total_po": format_idr(item.current_po_total),
                "total_variance": format_idr(item.total_variance),
                "payment_status": item.payment_status or "-",
                "notes": _notes_for_row(item),
            }
        )

    meta_rows = [
        ("Periode Laporan", format_date_range_label(date_from, date_to)),
        ("Pencarian", search or "—"),
        ("Unit Pemohon", unit_name or "Semua Unit"),
        ("Kriteria", _criteria_label(only_variance, unpaid_only)),
        ("Waktu Cetak", datetime.now(WIB).strftime("%d/%m/%Y %H:%M WIB")),
    ]
    if generated_by:
        meta_rows.append(("Petugas / User", generated_by))
    meta_rows.append(("Jumlah Baris", str(len(rows))))

    context = {
        "title": "LAPORAN SELISIH HARGA PR vs PO",
        "subtitle": "Purchasing Go — Audit Perbandingan Harga Pengajuan dan Realisasi Pembelian",
        "meta_rows": meta_rows,
        "rows": table_rows,
        "total_po": format_idr(total_po),
        "total_variance": format_idr(total_variance),
        "empty_message": "Tidak ada data sesuai filter yang dipilih.",
        "footer_note": (
            "Catatan: Selisih dihitung dari Harga/Total PO Saat Ini dikurangi nilai PR. "
            "Dokumen ini dihasilkan otomatis oleh sistem Purchasing Go."
        ),
    }
    html = render_report_template("price_variance_report.html", context)
    return html_to_pdf(html, landscape=True)

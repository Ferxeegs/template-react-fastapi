"""
PDF export for stock movement summary report.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.models.auth import User
from app.models.purchasing import Product
from app.schemas.inventory import StockDailySummaryRead
from app.services.excel_export_utils import (
    date_range_filename_suffix,
    format_date_range_label,
    format_report_date,
)
from app.services.pdf_report_utils import format_qty, html_to_pdf, render_report_template

WIB = ZoneInfo("Asia/Jakarta")


def _uom_for_product(db: Session, product_id: str) -> str:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return "-"
    db.refresh(product, ["uom"])
    if product.uom:
        return product.uom.shortname or product.uom.name or "-"
    return "-"


def _build_summary_table_data(db: Session, summary: StockDailySummaryRead) -> tuple[list[dict], dict[str, str], int]:
    rows: list[dict] = []
    totals = {
        "opening": Decimal("0"),
        "in": Decimal("0"),
        "out": Decimal("0"),
        "closing": Decimal("0"),
    }
    for idx, item in enumerate(summary.items or [], start=1):
        opening = Decimal(str(item.opening_qty))
        total_in = Decimal(str(item.total_in))
        total_out = Decimal(str(item.total_out))
        closing = Decimal(str(item.closing_qty))
        totals["opening"] += opening
        totals["in"] += total_in
        totals["out"] += total_out
        totals["closing"] += closing
        rows.append(
            {
                "no": idx,
                "product_name": item.product_name,
                "category_name": item.category_name,
                "unit_name": item.unit_name,
                "uom": _uom_for_product(db, item.product_id),
                "opening_qty": format_qty(opening),
                "total_in": format_qty(total_in),
                "total_out": format_qty(total_out),
                "closing_qty": format_qty(closing),
            }
        )
    formatted_totals = {
        "opening": format_qty(totals["opening"]),
        "in": format_qty(totals["in"]),
        "out": format_qty(totals["out"]),
        "closing": format_qty(totals["closing"]),
    }
    return rows, formatted_totals, len(rows)


def stock_summary_pdf_filename(summary: StockDailySummaryRead) -> str:
    date_from = summary.date_from or summary.date
    date_to = summary.date_to or summary.date
    stamp = datetime.now(WIB).strftime("%Y%m%d")
    return f"laporan-stok-kumulatif{date_range_filename_suffix(date_from, date_to)}_{stamp}.pdf"


def stock_per_day_pdf_filename(date_from: date, date_to: date) -> str:
    stamp = datetime.now(WIB).strftime("%Y%m%d")
    return f"laporan-stok-per-hari{date_range_filename_suffix(date_from, date_to)}_{stamp}.pdf"


def generate_stock_summary_pdf(
    db: Session,
    summary: StockDailySummaryRead,
    *,
    generated_by: Optional[str] = None,
) -> bytes:
    date_from = summary.date_from or summary.date
    date_to = summary.date_to or summary.date
    rows, totals, row_count = _build_summary_table_data(db, summary)

    meta_rows = [
        ("Jenis Laporan", "Kumulatif — satu ringkasan untuk seluruh periode"),
        ("Periode Laporan", format_date_range_label(date_from, date_to)),
        ("Unit Kerja", summary.unit_name or "Semua Unit"),
        ("Kategori Produk", summary.category_name or "Semua Kategori"),
        ("Waktu Cetak", datetime.now(WIB).strftime("%d/%m/%Y %H:%M WIB")),
    ]
    if generated_by:
        meta_rows.append(("Petugas / User", generated_by))
    meta_rows.append(("Jumlah Baris", str(row_count)))

    context = {
        "title": "LAPORAN PERGERAKAN STOK (KUMULATIF)",
        "subtitle": "Purchasing Go — Ringkasan Pergerakan Stok Seluruh Periode",
        "meta_rows": meta_rows,
        "rows": rows,
        "totals": totals,
        "empty_message": "Tidak ada pergerakan stok pada periode ini.",
        "footer_note": (
            "Catatan: Laporan kumulatif menggabungkan seluruh mutasi dalam periode. "
            "Stok Awal = saldo sebelum periode; Stok Akhir = saldo akhir periode. "
            "Dokumen ini dihasilkan otomatis oleh sistem Purchasing Go."
        ),
    }
    html = render_report_template("stock_summary_report.html", context)
    return html_to_pdf(html, landscape=row_count > 8)


def generate_stock_per_day_pdf(
    db: Session,
    user: User,
    *,
    date_from: date,
    date_to: date,
    unit_id: Optional[str] = None,
    category_id: Optional[int] = None,
    generated_by: Optional[str] = None,
) -> bytes:
    from app.services import stock_service as stock_svc

    sections: list[dict] = []
    max_rows = 0
    unit_name: Optional[str] = None
    category_name: Optional[str] = None
    current = date_from
    while current <= date_to:
        summary = stock_svc.get_daily_summary(
            db,
            user,
            date_from=current,
            date_to=current,
            unit_id=unit_id,
            category_id=category_id,
        )
        if unit_name is None:
            unit_name = summary.unit_name
        if category_name is None:
            category_name = summary.category_name
        rows, totals, row_count = _build_summary_table_data(db, summary)
        max_rows = max(max_rows, row_count)
        sections.append(
            {
                "date_label": format_report_date(current),
                "rows": rows,
                "totals": totals,
            }
        )
        current += timedelta(days=1)

    day_count = (date_to - date_from).days + 1
    meta_rows = [
        ("Jenis Laporan", "Per Hari — ringkasan terpisah untuk setiap tanggal"),
        ("Periode Laporan", format_date_range_label(date_from, date_to)),
        ("Jumlah Hari", str(day_count)),
        ("Unit Kerja", unit_name or "Semua Unit"),
        ("Kategori Produk", category_name or "Semua Kategori"),
        ("Waktu Cetak", datetime.now(WIB).strftime("%d/%m/%Y %H:%M WIB")),
    ]
    if generated_by:
        meta_rows.append(("Petugas / User", generated_by))

    context = {
        "title": "LAPORAN PERGERAKAN STOK (PER HARI)",
        "subtitle": "Purchasing Go — Ringkasan Pergerakan Stok per Tanggal",
        "meta_rows": meta_rows,
        "sections": sections,
        "empty_day_message": "Tidak ada pergerakan stok pada tanggal ini.",
        "footer_note": (
            "Catatan: Setiap bagian menampilkan stok awal, mutasi masuk/keluar, "
            "dan stok akhir untuk satu hari. "
            "Dokumen ini dihasilkan otomatis oleh sistem Purchasing Go."
        ),
    }
    html = render_report_template("stock_summary_per_day_report.html", context)
    return html_to_pdf(html, landscape=max_rows > 8)

"""
Inventory / stock management endpoints.
"""
from datetime import date
from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission
from app.models.auth import User
from app.schemas.common import WebResponse
from app.schemas.inventory import (
    StockAdjustmentCreate,
    StockDailySummaryRead,
    StockIssueCreate,
    StockMovementRead,
)
from app.core.exceptions import BadRequestException
from app.services import stock_daily_export_service as stock_export_svc
from app.services import stock_report_pdf_service as stock_pdf_svc
from app.services import stock_service as stock_svc

router = APIRouter()


def _resolve_summary_dates(
    *,
    summary_date: date | None,
    date_from: date | None,
    date_to: date | None,
) -> tuple[date, date | None]:
    start = date_from or summary_date
    if start is None:
        raise BadRequestException("Parameter date_from atau date wajib diisi")
    if date_from and summary_date and date_from != summary_date:
        raise BadRequestException("Gunakan date_from/date_to atau date, jangan keduanya")
    if start and date_to and start > date_to:
        raise BadRequestException("Tanggal mulai tidak boleh lebih besar dari tanggal akhir")
    return start, date_to


@router.get("/stocks", response_model=WebResponse[dict])
def list_product_stocks(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    unit_id: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    product_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_stock")),
):
    stocks, total, low_stock_count = stock_svc.list_stocks(
        db,
        current_user,
        page=page,
        limit=limit,
        search=search,
        unit_id=unit_id,
        category_id=category_id,
        product_id=product_id,
    )
    total_pages = (total + limit - 1) // limit if limit > 0 else 0
    return WebResponse(
        status="success",
        data={
            "stocks": stocks,
            "low_stock_count": low_stock_count,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
            },
        },
    )


@router.get("/movements", response_model=WebResponse[dict])
def list_stock_movements(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    unit_id: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    product_id: Optional[str] = Query(None),
    movement_type: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_stock_movement")),
):
    movements, total = stock_svc.list_movements(
        db,
        current_user,
        page=page,
        limit=limit,
        unit_id=unit_id,
        category_id=category_id,
        product_id=product_id,
        movement_type=movement_type,
        date_from=date_from,
        date_to=date_to,
    )
    total_pages = (total + limit - 1) // limit if limit > 0 else 0
    return WebResponse(
        status="success",
        data={
            "movements": movements,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
            },
        },
    )


@router.get("/daily-summary", response_model=WebResponse[StockDailySummaryRead])
def get_daily_stock_summary(
    summary_date: Optional[date] = Query(None, alias="date"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    unit_id: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_stock")),
):
    start, end = _resolve_summary_dates(
        summary_date=summary_date, date_from=date_from, date_to=date_to
    )
    summary = stock_svc.get_daily_summary(
        db,
        current_user,
        date_from=start,
        date_to=end,
        unit_id=unit_id,
        category_id=category_id,
    )
    return WebResponse(status="success", data=summary)


@router.get("/daily-summary/export")
def export_daily_stock_summary(
    summary_date: Optional[date] = Query(None, alias="date"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    unit_id: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_stock")),
):
    start, end = _resolve_summary_dates(
        summary_date=summary_date, date_from=date_from, date_to=date_to
    )
    summary = stock_svc.get_daily_summary(
        db,
        current_user,
        date_from=start,
        date_to=end,
        unit_id=unit_id,
        category_id=category_id,
    )
    generated_by = current_user.fullname or current_user.username
    excel_bytes = stock_export_svc.generate_daily_stock_excel(
        db,
        summary,
        generated_by=generated_by,
    )
    filename = stock_export_svc.daily_summary_filename(summary)
    ascii_name = filename.encode("ascii", "ignore").decode() or "laporan-stok.xlsx"
    encoded = quote(filename)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded}',
        },
    )


@router.get("/daily-summary/export/pdf")
def export_daily_stock_summary_pdf(
    summary_date: Optional[date] = Query(None, alias="date"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    unit_id: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_stock")),
):
    start, end = _resolve_summary_dates(
        summary_date=summary_date, date_from=date_from, date_to=date_to
    )
    summary = stock_svc.get_daily_summary(
        db,
        current_user,
        date_from=start,
        date_to=end,
        unit_id=unit_id,
        category_id=category_id,
    )
    generated_by = current_user.fullname or current_user.username
    pdf_bytes = stock_pdf_svc.generate_stock_summary_pdf(
        db,
        summary,
        generated_by=generated_by,
    )
    filename = stock_pdf_svc.stock_summary_pdf_filename(summary)
    ascii_name = filename.encode("ascii", "ignore").decode() or "laporan-stok.pdf"
    encoded = quote(filename)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded}',
        },
    )


@router.get("/daily-summary/export/pdf/per-day")
def export_daily_stock_summary_pdf_per_day(
    summary_date: Optional[date] = Query(None, alias="date"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    unit_id: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_stock")),
):
    start, end = _resolve_summary_dates(
        summary_date=summary_date, date_from=date_from, date_to=date_to
    )
    generated_by = current_user.fullname or current_user.username
    pdf_bytes = stock_pdf_svc.generate_stock_per_day_pdf(
        db,
        current_user,
        date_from=start,
        date_to=end,
        unit_id=unit_id,
        category_id=category_id,
        generated_by=generated_by,
    )
    filename = stock_pdf_svc.stock_per_day_pdf_filename(start, end)
    ascii_name = filename.encode("ascii", "ignore").decode() or "laporan-stok-per-hari.pdf"
    encoded = quote(filename)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded}',
        },
    )


@router.post("/movements/issue", response_model=WebResponse[StockMovementRead])
def create_stock_issue(
    data: StockIssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("create_stock_movement")),
):
    movement = stock_svc.create_issue(
        db,
        current_user,
        product_id=data.product_id,
        unit_id=data.unit_id,
        category_id=data.category_id,
        qty=data.qty,
        notes=data.notes,
    )
    return WebResponse(
        status="success",
        message="Stok berhasil dikurangi",
        data=stock_svc.build_movement_read(db, movement),
    )


@router.post("/movements/adjustment", response_model=WebResponse[StockMovementRead])
def create_stock_adjustment(
    data: StockAdjustmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("create_stock_movement")),
):
    movement = stock_svc.create_adjustment(
        db,
        current_user,
        product_id=data.product_id,
        unit_id=data.unit_id,
        category_id=data.category_id,
        qty=data.qty,
        direction=data.direction,
        notes=data.notes,
    )
    msg = "Penyesuaian stok masuk berhasil" if data.direction == "in" else "Penyesuaian stok keluar berhasil"
    return WebResponse(
        status="success",
        message=msg,
        data=stock_svc.build_movement_read(db, movement),
    )

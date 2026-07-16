"""
Shared utilities for HTML → PDF report generation.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo

from jinja2 import Environment, FileSystemLoader, select_autoescape

WIB = ZoneInfo("Asia/Jakarta")
REPORT_TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "reports"


def format_idr(amount) -> str:
    value = Decimal(str(amount or 0))
    formatted = f"{value:,.0f}".replace(",", ".")
    return f"Rp {formatted}"


def format_qty(qty) -> str:
    value = Decimal(str(qty or 0))
    text = f"{value:f}".rstrip("0").rstrip(".")
    return text or "0"


def format_datetime_wib(dt: Optional[datetime]) -> str:
    if not dt:
        return "-"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=WIB)
    else:
        dt = dt.astimezone(WIB)
    return dt.strftime("%d/%m/%Y %H:%M")


def render_report_template(template_name: str, context: dict) -> str:
    env = Environment(
        loader=FileSystemLoader(str(REPORT_TEMPLATE_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    template = env.get_template(template_name)
    return template.render(**context)


def html_to_pdf(html: str, *, landscape: bool = False) -> bytes:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            page.set_content(html, wait_until="load")
            return page.pdf(
                format="A4",
                landscape=landscape,
                print_background=True,
                margin={"top": "10mm", "right": "8mm", "bottom": "10mm", "left": "8mm"},
            )
        finally:
            browser.close()

"""
Helper utility functions.
"""
import secrets
from typing import Any, Dict, Optional
from datetime import datetime, timezone, timedelta, date, time
from zoneinfo import ZoneInfo

WIB = ZoneInfo("Asia/Jakarta")


def get_now_local() -> datetime:
    """Get current datetime in Asia/Jakarta (WIB) timezone."""
    try:
        return datetime.now(WIB)
    except Exception:
        # Fallback to UTC+7 if ZoneInfo fails
        return datetime.now(timezone.utc) + timedelta(hours=7)


def wib_day_start(d: date) -> datetime:
    """Start of calendar day in WIB (00:00:00)."""
    return datetime.combine(d, time.min, tzinfo=WIB)


def wib_day_end(d: date) -> datetime:
    """End of calendar day in WIB (23:59:59.999999)."""
    return datetime.combine(d, time.max, tzinfo=WIB)


def wib_date_start_as_utc_naive(d: date) -> datetime:
    """Start of WIB calendar day as naive UTC for MySQL DATETIME comparison."""
    return wib_day_start(d).astimezone(timezone.utc).replace(tzinfo=None)


def wib_date_end_as_utc_naive(d: date) -> datetime:
    """End of WIB calendar day as naive UTC for MySQL DATETIME comparison."""
    return wib_day_end(d).astimezone(timezone.utc).replace(tzinfo=None)


def assume_utc(dt: datetime | None) -> datetime | None:
    """Naive datetimes from MySQL are stored as UTC — attach UTC tzinfo."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def datetime_to_api_iso(dt: datetime | None) -> str | None:
    """Serialize datetime for JSON with explicit UTC (Z suffix) for JS clients."""
    if dt is None:
        return None
    utc = assume_utc(dt).astimezone(timezone.utc)
    text = utc.strftime("%Y-%m-%dT%H:%M:%S")
    if utc.microsecond:
        text += f".{utc.microsecond:06d}".rstrip("0").rstrip(".")
    return f"{text}Z"


def get_start_of_day_local(dt: Optional[datetime] = None) -> datetime:
    """
    Get 00:00:00 of the given datetime (or now) in local timezone.
    Returns a timezone-aware datetime.
    """
    if dt is None:
        dt = get_now_local()
    
    # If dt is not aware, assume it is local or convert to local
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=WIB)
    
    return dt.replace(hour=0, minute=0, second=0, microsecond=0)


def get_start_of_week_local_monday(dt: Optional[datetime] = None) -> datetime:
    """
    Monday 00:00:00 Asia/Jakarta for the week containing `dt` (ISO week: Mon–Sun).
    Quota resets at this instant (when Sunday becomes Monday in WIB).
    """
    if dt is None:
        dt = get_now_local()
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=WIB)
    day_start = get_start_of_day_local(dt)
    return day_start - timedelta(days=day_start.weekday())


def get_week_range_local_monday(dt: Optional[datetime] = None) -> tuple[datetime, datetime]:
    """Return (week_start_monday_00:00, next_monday_00:00) in Asia/Jakarta."""
    start = get_start_of_week_local_monday(dt)
    return start, start + timedelta(days=7)


def format_datetime(dt: datetime) -> Optional[str]:
    """Format datetime to ISO format string."""
    return dt.isoformat() if dt else None


def remove_none_values(data: Dict[str, Any]) -> Dict[str, Any]:
    """Remove None values from dictionary."""
    return {k: v for k, v in data.items() if v is not None}


def generate_qr_code_token() -> str:
    """
    Generate a secure random token for QR code.
    Uses secrets module for cryptographically strong random tokens.
    
    Returns:
        Secure random token string (32 characters, URL-safe)
    """
    # Generate a secure random token (32 bytes = 43 characters in base64)
    token = secrets.token_urlsafe(32)
    
    # Add a prefix to make it identifiable as QR code
    # Format: QR-<token>
    return f"QR-{token}"

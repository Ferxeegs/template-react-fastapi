/** Western Indonesian Time (WIB, UTC+7) */
export const WIB_TIMEZONE = "Asia/Jakarta";

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
/** ISO datetime without timezone offset (MySQL returns UTC as naive string). */
const HAS_TIMEZONE_RE = /(Z|[+-]\d{2}:\d{2})$/i;

/**
 * Parse API date/datetime strings.
 * - Date-only (YYYY-MM-DD): calendar date in WIB.
 * - Datetime without offset: treated as UTC (MySQL stores UTC naively).
 */
export function parseApiDateTime(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (DATE_ONLY_RE.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00+07:00`);
  }

  let normalized = trimmed.includes(" ") ? trimmed.replace(" ", "T") : trimmed;
  if (!HAS_TIMEZONE_RE.test(normalized)) {
    normalized = `${normalized}Z`;
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Current hour (0–23) in Asia/Jakarta */
export function getJakartaHour(date: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: WIB_TIMEZONE,
      hour: "numeric",
      hour12: false,
    }).format(date)
  );
}

/** Today's calendar date in WIB as YYYY-MM-DD */
export function todayIsoDateInWib(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatShortDate(value: string | null | undefined): string {
  if (!value) return "-";
  const dateObj = parseApiDateTime(value);
  if (!dateObj) return "-";
  return dateObj.toLocaleDateString("id-ID", {
    timeZone: WIB_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Alias for date-only display (no time). */
export const formatDate = formatShortDate;

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const dateObj = parseApiDateTime(value);
  if (!dateObj) return "-";

  const dateStr = dateObj.toLocaleDateString("id-ID", {
    timeZone: WIB_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = dateObj
    .toLocaleTimeString("id-ID", {
      timeZone: WIB_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(/\./g, ":");

  return `${dateStr} ${timeStr} WIB`;
}

/**
 * Week boundaries in Asia/Jakarta (Mon 00:00 → next Mon 00:00), aligned with backend quota.
 */
const JAKARTA_TZ = "Asia/Jakarta";

function jakartaYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function jakartaMidnightInstantMs(year: number, month: number, day: number): number {
  const y = String(year);
  const m = String(month).padStart(2, "0");
  const da = String(day).padStart(2, "0");
  return new Date(`${y}-${m}-${da}T00:00:00+07:00`).getTime();
}

const WEEKDAY_TO_OFFSET: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

/**
 * Returns [weekStartMs, weekEndExclusiveMs) as UTC epoch ms for the Jakarta week containing `d`.
 */
export function getJakartaWeekRangeMs(d: Date): { startMs: number; endExclusiveMs: number } {
  const ymd = jakartaYmd(d);
  const [y, mo, day] = ymd.split("-").map((x) => parseInt(x, 10));
  const midnight = jakartaMidnightInstantMs(y, mo, day);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TZ,
    weekday: "long",
  }).format(new Date(midnight));
  const dow = WEEKDAY_TO_OFFSET[weekday] ?? 0;
  const startMs = midnight - dow * 86_400_000;
  return { startMs, endExclusiveMs: startMs + 7 * 86_400_000 };
}

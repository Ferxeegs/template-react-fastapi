export const PR_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_brand_manager: "Menunggu Brand Manager",
  pending_finance: "Menunggu Finance",
  approved: "Disetujui",
  rejected: "Ditolak",
};

export const PR_STATUS_COLORS: Record<
  string,
  "warning" | "info" | "success" | "error" | "light"
> = {
  draft: "warning",
  pending_brand_manager: "info",
  pending_finance: "info",
  approved: "success",
  rejected: "error",
};

export {
  formatDateTime,
  formatShortDate,
  formatDate,
  todayIsoDateInWib,
  getJakartaHour,
  parseApiDateTime,
  WIB_TIMEZONE,
} from "../../utils/dateTime";

export function formatIdr(value: number | string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatQty(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(num);
}

export function getPrItemName(item: {
  product?: { name?: string } | null;
  description?: string | null;
}): string {
  return item.product?.name || item.description || "-";
}

export function getPrItemUom(item: {
  product?: { uom?: { shortname?: string; name?: string } | null } | null;
}): string {
  return item.product?.uom?.shortname || item.product?.uom?.name || "";
}

export function getPrItemVendorName(item: {
  vendor?: { company_name?: string } | null;
}): string {
  return item.vendor?.company_name || "-";
}

export function calculatePrTotal(pr: {
  total_amount?: number | string | null;
  items?: Array<{ request_total?: number | string }> | null;
}): number {
  if (pr.total_amount != null && Number(pr.total_amount) > 0) {
    return Number(pr.total_amount);
  }
  return (pr.items || []).reduce((sum, item) => sum + Number(item.request_total || 0), 0);
}

// Formats a raw number or numeric string to IDR format (dots as thousands, comma as decimal)
// e.g., 150000.5 -> "150.000,5"
export function formatNumberToIdrInput(val: string | number | null | undefined): string {
  if (val === undefined || val === null || val === "") return "";
  
  // Convert to string
  let str = typeof val === "number" ? val.toString() : val;
  
  // If it contains a dot (JS decimal), replace it with comma for Indonesian format
  str = str.replace(".", ",");
  
  // Split integer and decimal parts
  const parts = str.split(",");
  let integerPart = parts[0].replace(/\D/g, ""); // remove non-digits
  const decimalPart = parts[1] !== undefined ? parts[1].replace(/\D/g, "") : null;
  
  // Add dots as thousands separators
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  if (decimalPart !== null) {
    return `${integerPart},${decimalPart}`;
  }
  return integerPart;
}

// Parses formatted IDR input back to standard numeric string
// e.g., "150.000,50" -> "150000.50"
export function parseIdrInputToNumberString(val: string): string {
  if (!val) return "";
  
  // Remove all thousands separators (dots)
  let clean = val.replace(/\./g, "");
  
  // Replace Indonesian decimal separator (comma) with JS decimal separator (dot)
  clean = clean.replace(",", ".");
  
  // Keep only digits and at most one dot
  const parts = clean.split(".");
  const integerPart = parts[0].replace(/\D/g, "");
  const decimalPart = parts[1] !== undefined ? parts[1].replace(/\D/g, "") : null;
  
  if (decimalPart !== null) {
    return `${integerPart}.${decimalPart}`;
  }
  return integerPart;
}


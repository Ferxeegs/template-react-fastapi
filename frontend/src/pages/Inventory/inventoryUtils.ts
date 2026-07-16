import { todayIsoDateInWib } from "../../utils/dateTime";

export const MOVEMENT_TYPE_OPTIONS = [
  { value: "", label: "Semua tipe" },
  { value: "receipt_po", label: "Penerimaan PO" },
  { value: "issue_usage", label: "Pemakaian" },
  { value: "adjustment_in", label: "Penyesuaian (+)" },
  { value: "adjustment_out", label: "Penyesuaian (-)" },
];

export function todayIsoDate(): string {
  return todayIsoDateInWib();
}

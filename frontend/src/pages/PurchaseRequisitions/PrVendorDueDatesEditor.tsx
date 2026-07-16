import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import type { Vendor } from "../../utils/api";
import { CalenderIcon } from "../../icons";

export type VendorDueDateMap = Record<string, string>;

interface PrVendorDueDatesEditorProps {
  vendorsInItems: Array<{ vendor_id: string; vendor_name: string }>;
  dueDates: VendorDueDateMap;
  onChange: (dueDates: VendorDueDateMap) => void;
  disabled?: boolean;
  required?: boolean;
}

export function deriveVendorsFromItems(
  items: Array<{ vendor_id?: string | null }>,
  vendors: Vendor[]
): Array<{ vendor_id: string; vendor_name: string }> {
  const seen = new Map<string, string>();
  for (const row of items) {
    if (!row.vendor_id) continue;
    const vendor = vendors.find((v) => v.id === row.vendor_id);
    seen.set(row.vendor_id, vendor?.company_name || row.vendor_id);
  }
  return Array.from(seen.entries()).map(([vendor_id, vendor_name]) => ({
    vendor_id,
    vendor_name,
  }));
}

export function mapVendorDueDatesFromPr(
  entries?: Array<{ vendor_id: string; due_date?: string | null }> | null
): VendorDueDateMap {
  const map: VendorDueDateMap = {};
  for (const entry of entries || []) {
    if (entry.vendor_id && entry.due_date) {
      map[entry.vendor_id] = entry.due_date.slice(0, 10);
    }
  }
  return map;
}

export function vendorDueDatesToPayload(dueDates: VendorDueDateMap, vendorIds: string[]) {
  return vendorIds
    .filter((vendor_id) => Boolean(dueDates[vendor_id]))
    .map((vendor_id) => ({
      vendor_id,
      due_date: dueDates[vendor_id],
    }));
}

interface VendorDatePickerProps {
  value: string;
  onChange: (dateStr: string) => void;
  disabled?: boolean;
  required?: boolean;
}

function VendorDatePicker({ value, onChange, disabled, required }: VendorDatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpInstance = useRef<flatpickr.Instance | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    fpInstance.current = flatpickr(inputRef.current, {
      static: true,
      monthSelectorType: "static",
      dateFormat: "Y-m-d",
      defaultDate: value || undefined,
      position: "below",
      disableMobile: true,
      onChange: (_selectedDates, dateStr) => {
        onChange(dateStr);
      },
    });

    return () => {
      fpInstance.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (fpInstance.current) {
      const currentDate = fpInstance.current.input.value;
      if (currentDate !== value) {
        fpInstance.current.setDate(value || "", false);
      }
    }
  }, [value]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        disabled={disabled}
        required={required}
        placeholder="Pilih tanggal..."
        className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 pr-10 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-200 focus:border-brand-300 focus:ring-brand-500/20 dark:border-white/[0.05] dark:bg-white/[0.02] disabled:opacity-50"
      />
      <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
        <CalenderIcon className="w-5 h-5" />
      </span>
    </div>
  );
}

export default function PrVendorDueDatesEditor({
  vendorsInItems,
  dueDates,
  onChange,
  disabled = false,
  required = false,
}: PrVendorDueDatesEditorProps) {
  if (vendorsInItems.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Tambahkan item dengan vendor terlebih dahulu untuk mengisi jatuh tempo PO.
      </p>
    );
  }

  const handleChange = (vendorId: string, value: string) => {
    onChange({ ...dueDates, [vendorId]: value });
  };

  return (
    <div className="space-y-3">
      {vendorsInItems.map(({ vendor_id, vendor_name }) => (
        <div
          key={vendor_id}
          className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50/40 p-4 dark:border-white/[0.05] dark:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between relative focus-within:z-30 transition-all"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Vendor
            </p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">
              {vendor_name}
            </p>
            <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
              Satu PO per vendor — jatuh tempo berlaku untuk seluruh item vendor ini.
            </p>
          </div>
          <div className="w-full sm:w-52 shrink-0">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Jatuh Tempo PO {required && <span className="text-red-500">*</span>}
            </label>
            <VendorDatePicker
              disabled={disabled}
              required={required}
              value={dueDates[vendor_id] ?? ""}
              onChange={(dateStr) => handleChange(vendor_id, dateStr)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

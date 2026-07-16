import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { CalenderIcon } from "../../icons";

export interface CalendarDatePickerProps {
  value: string;
  onChange: (dateStr: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  size?: "sm" | "md";
  className?: string;
  position?: "above" | "auto" | "below";
}

const sizeClasses = {
  sm: "h-9 px-3 pr-9 text-sm",
  md: "h-10 px-3 pr-10 text-sm",
};

export default function CalendarDatePicker({
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = "Pilih tanggal...",
  size = "md",
  className = "",
  position = "below",
}: CalendarDatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpInstance = useRef<flatpickr.Instance | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!inputRef.current) return;

    fpInstance.current = flatpickr(inputRef.current, {
      static: true,
      monthSelectorType: "static",
      dateFormat: "Y-m-d",
      defaultDate: value || undefined,
      position,
      disableMobile: true,
      onChange: (_selectedDates, dateStr) => {
        onChangeRef.current(dateStr);
      },
    });

    return () => {
      fpInstance.current?.destroy();
      fpInstance.current = null;
    };
  }, [position]);

  useEffect(() => {
    if (!fpInstance.current) return;
    const currentDate = fpInstance.current.input.value;
    if (currentDate !== value) {
      fpInstance.current.setDate(value || "", false);
    }
  }, [value]);

  useEffect(() => {
    if (fpInstance.current) {
      fpInstance.current.set("disableMobile", true);
      if (disabled) {
        fpInstance.current.input.setAttribute("disabled", "");
      } else {
        fpInstance.current.input.removeAttribute("disabled");
      }
    }
  }, [disabled]);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        readOnly
        className={`w-full rounded-lg border appearance-none shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-200 focus:border-brand-300 focus:ring-brand-500/20 dark:border-white/[0.05] dark:bg-white/[0.02] disabled:opacity-50 cursor-pointer ${sizeClasses[size]}`}
      />
      <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
        <CalenderIcon className={size === "sm" ? "w-4 h-4" : "w-5 h-5"} />
      </span>
    </div>
  );
}

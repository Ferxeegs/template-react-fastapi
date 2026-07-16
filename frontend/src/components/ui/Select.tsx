import { useCallback, useEffect, useId, useRef, useState } from "react";

export interface SelectOption {
  value: string | number;
  label: string;
  subLabel?: string;
  disabled?: boolean;
}

interface SelectProps {
  label?: string;
  value: string | number | null | undefined;
  options: SelectOption[];
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  allowEmpty?: boolean;
  emptyLabel?: string;
  id?: string;
  name?: string;
  required?: boolean;
}

function valuesMatch(a: string | number | null | undefined, b: string | number) {
  return String(a ?? "") === String(b);
}

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = "Pilih opsi...",
  className = "",
  disabled = false,
  size = "md",
  allowEmpty = false,
  emptyLabel,
  id,
  name,
  required = false,
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allOptions: SelectOption[] = allowEmpty
    ? [{ value: "", label: emptyLabel ?? placeholder, disabled: required }, ...options]
    : options;

  const selectedOption = allOptions.find((opt) => valuesMatch(value, opt.value));
  const hasValue = selectedOption != null && !(allowEmpty && valuesMatch(value, ""));

  const sizeClasses =
    size === "sm"
      ? "min-h-10 px-3 text-sm"
      : "min-h-11 px-3.5 text-sm sm:text-sm";

  const close = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
  }, []);

  const open = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    const currentIndex = allOptions.findIndex(
      (opt) => valuesMatch(value, opt.value) && !opt.disabled
    );
    setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
  }, [allOptions, disabled, value]);

  const selectOption = useCallback(
    (opt: SelectOption) => {
      if (opt.disabled) return;
      onChange(opt.value);
      close();
    },
    [close, onChange]
  );

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [close, isOpen]);

  useEffect(() => {
    if (!isOpen || focusedIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-option-index="${focusedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        open();
      }
      return;
    }

    const enabledOptions = allOptions.filter((opt) => !opt.disabled);

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => {
          const idx = enabledOptions.findIndex((opt) => allOptions.indexOf(opt) === prev);
          const next = enabledOptions[(idx + 1) % enabledOptions.length];
          return allOptions.indexOf(next);
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => {
          const idx = enabledOptions.findIndex((opt) => allOptions.indexOf(opt) === prev);
          const next =
            enabledOptions[(idx - 1 + enabledOptions.length) % enabledOptions.length];
          return allOptions.indexOf(next);
        });
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusedIndex >= 0 && allOptions[focusedIndex]) {
          selectOption(allOptions[focusedIndex]);
        }
        break;
      case "Tab":
        close();
        break;
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {name && (
        <input
          type="hidden"
          name={name}
          value={value ?? ""}
          required={required}
          tabIndex={-1}
          aria-hidden
        />
      )}

      {label && (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}

      <button
        id={selectId}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-required={required}
        disabled={disabled}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white text-left shadow-theme-xs transition-all focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:bg-gray-900 ${
          disabled
            ? "cursor-not-allowed border-gray-200 opacity-60 dark:border-gray-800"
            : isOpen
              ? "border-brand-500 ring-4 ring-brand-500/10 dark:border-brand-500"
              : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
        } ${sizeClasses}`}
      >
        <span
          className={`block min-w-0 flex-1 truncate ${
            hasValue ? "font-medium text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {hasValue ? selectedOption?.label : placeholder}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute z-[9999] mt-1.5 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-950"
          style={{ maxHeight: "min(16rem, 50vh)" }}
        >
          <div className="max-h-[inherit] overflow-y-auto overscroll-contain py-1 custom-scrollbar">
            {allOptions.length === 0 ? (
              <div className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                Tidak ada pilihan
              </div>
            ) : (
              allOptions.map((opt, index) => {
                const isSelected = valuesMatch(value, opt.value);
                const isFocused = index === focusedIndex;
                return (
                  <button
                    key={`${opt.value}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-option-index={index}
                    disabled={opt.disabled}
                    onClick={() => selectOption(opt)}
                    onMouseEnter={() => !opt.disabled && setFocusedIndex(index)}
                    className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left transition-colors sm:px-4 ${
                      opt.disabled
                        ? "cursor-not-allowed opacity-50 text-gray-400 dark:text-gray-500"
                        : isSelected
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                          : isFocused
                            ? "bg-gray-50 text-gray-900 dark:bg-white/5 dark:text-white"
                            : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{opt.label}</span>
                      {opt.subLabel && (
                        <span className="mt-0.5 block truncate text-[11px] opacity-70">
                          {opt.subLabel}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <svg
                        className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Select;

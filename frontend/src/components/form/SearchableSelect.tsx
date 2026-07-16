import { useState, useEffect, useRef, useMemo } from "react";

interface Option {
  id: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Pilih opsi...",
  isLoading = false,
  disabled = false,
  className = "",
  size = "md",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.id === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const lowerSearch = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lowerSearch) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(lowerSearch))
    );
  }, [options, search]);

  const sizeClasses = size === "sm" ? "min-h-10 px-3 text-sm" : "min-h-11 px-3.5 text-sm";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    } else {
      setSearch("");
      setFocusedIndex(-1);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled && !isLoading) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || isLoading) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "Enter":
        if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
          handleSelect(filteredOptions[focusedIndex].id);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled || isLoading}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white text-left shadow-theme-xs transition-all focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:bg-gray-900 ${
          disabled || isLoading
            ? "cursor-not-allowed border-gray-200 opacity-60 dark:border-gray-800"
            : isOpen
              ? "border-brand-500 ring-4 ring-brand-500/10 dark:border-brand-500"
              : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
        } ${sizeClasses}`}
      >
        <span
          className={`block min-w-0 flex-1 truncate ${
            selectedOption ? "font-medium text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {isLoading ? "Memuat..." : selectedOption ? selectedOption.label : placeholder}
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
          className="absolute z-[9999] mt-1.5 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-950"
          style={{ maxHeight: "min(18rem, 55vh)" }}
        >
          <div className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-900/80">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="block w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                placeholder="Cari..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setFocusedIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Escape") {
                    handleKeyDown(e);
                  }
                }}
              />
            </div>
          </div>

          <ul className="max-h-[inherit] overflow-y-auto overscroll-contain py-1 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const isSelected = option.id === value;
                const isFocused = index === focusedIndex;

                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left transition-colors sm:px-4 ${
                        isFocused ? "bg-gray-50 dark:bg-white/5" : ""
                      } ${
                        isSelected
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                          : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                      }`}
                      onClick={() => handleSelect(option.id)}
                      onMouseEnter={() => setFocusedIndex(index)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{option.label}</span>
                        {option.sublabel && (
                          <span className="mt-0.5 block truncate text-[11px] opacity-70">
                            {option.sublabel}
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                Tidak ditemukan
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

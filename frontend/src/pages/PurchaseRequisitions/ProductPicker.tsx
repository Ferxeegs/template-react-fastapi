import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type Product, type Vendor } from "../../utils/api";
import { Select } from "../../components/ui/Select";
import { formatIdr } from "./prUtils";

interface ProductPickerProps {
  products: Product[];
  vendors: Vendor[];
  value: string;
  onChange: (productId: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

function getVendorName(product: Product, vendors: Vendor[]): string {
  return (
    product.vendor?.company_name ||
    vendors.find((v) => v.id === product.vendor_id)?.company_name ||
    ""
  );
}

export default function ProductPicker({
  products,
  vendors,
  value,
  onChange,
  disabled = false,
  placeholder = "Cari atau pilih produk...",
}: ProductPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === value) ?? null,
    [products, value]
  );

  const vendorsWithProducts = useMemo(() => {
    const vendorIds = new Set(products.map((p) => p.vendor_id));
    return vendors
      .filter((v) => vendorIds.has(v.id))
      .sort((a, b) => a.company_name.localeCompare(b.company_name, "id"));
  }, [products, vendors]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (vendorFilter) {
      list = list.filter((p) => p.vendor_id === vendorFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => {
        const vendorName = getVendorName(p, vendors);
        return (
          p.name.toLowerCase().includes(q) ||
          vendorName.toLowerCase().includes(q)
        );
      });
    }
    return [...list].sort((a, b) => {
      const labelA = `${a.name} ${getVendorName(a, vendors)}`;
      const labelB = `${b.name} ${getVendorName(b, vendors)}`;
      return labelA.localeCompare(labelB, "id");
    });
  }, [products, vendors, vendorFilter, search]);

  const updateDropdownPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const maxHeight = 320;
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUpward = spaceBelow < 240 && spaceAbove > spaceBelow;

    if (openUpward) {
      setDropdownStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        bottom: window.innerHeight - rect.top + gap,
        maxHeight: Math.min(maxHeight, spaceAbove),
        zIndex: 9999,
      });
    } else {
      setDropdownStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        top: rect.bottom + gap,
        maxHeight: Math.min(maxHeight, spaceBelow),
        zIndex: 9999,
      });
    }
  }, []);

  useLayoutEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
    }
  }, [isOpen, updateDropdownPosition]);

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setFocusedIndex(-1);
      setDropdownStyle({});
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleReposition = () => updateDropdownPosition();

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen, updateDropdownPosition]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (productId: string) => {
    onChange(productId);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "Enter":
        if (focusedIndex >= 0 && filteredProducts[focusedIndex]) {
          handleSelect(filteredProducts[focusedIndex].id);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < filteredProducts.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredProducts.length - 1
        );
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  const selectedVendorName = selectedProduct
    ? getVendorName(selectedProduct, vendors)
    : "";

  const dropdownPanel = isOpen && !disabled && (
    <div
      ref={dropdownRef}
      style={{
        ...dropdownStyle,
        visibility: dropdownStyle.top !== undefined || dropdownStyle.bottom !== undefined ? "visible" : "hidden"
      }}
      className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="shrink-0 space-y-2 border-b border-gray-100 p-2 dark:border-gray-800">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setFocusedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ketik nama produk atau vendor..."
            className="block w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-1 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
          />
        </div>
        <Select
          size="sm"
          value={vendorFilter}
          onChange={(v) => {
            setVendorFilter(String(v));
            setFocusedIndex(0);
          }}
          placeholder={`Semua vendor (${products.length})`}
          allowEmpty
          emptyLabel={`Semua vendor (${products.length})`}
          options={vendorsWithProducts.map((v) => {
            const count = products.filter((p) => p.vendor_id === v.id).length;
            return { value: v.id, label: `${v.company_name} (${count})` };
          })}
        />
      </div>

      <ul className="min-h-0 flex-1 overflow-auto py-1">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product, index) => {
            const isSelected = product.id === value;
            const isFocused = index === focusedIndex;
            const vendorName = getVendorName(product, vendors);
            return (
              <li
                key={product.id}
                className={`cursor-pointer px-3 py-2.5 ${
                  isFocused ? "bg-brand-50 dark:bg-brand-500/10" : ""
                } ${
                  isSelected
                    ? "bg-brand-500 text-white dark:bg-brand-600"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
                onClick={() => handleSelect(product.id)}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                <p className={`truncate text-sm font-medium ${isSelected ? "text-white" : "text-gray-800 dark:text-white"}`}>
                  {product.name}
                </p>
                <p className={`truncate text-xs ${isSelected ? "text-brand-100" : "text-gray-500 dark:text-gray-400"}`}>
                  {vendorName}
                  {product.price != null && ` · ${formatIdr(product.price)}`}
                </p>
              </li>
            );
          })
        ) : (
          <li className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Produk tidak ditemukan
          </li>
        )}
      </ul>
    </div>
  );

  return (
    <div className="space-y-2" ref={containerRef}>
      <div
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        className={`flex min-h-10 w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 ${
          disabled
            ? "cursor-not-allowed opacity-60 border-gray-200 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.01]"
            : isOpen
            ? "border-brand-300 bg-white dark:border-brand-800 dark:bg-white/[0.02]"
            : "border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.02]"
        }`}
      >
        <div className="min-w-0 flex-1 pr-2">
          {selectedProduct ? (
            <>
              <p className="truncate font-medium text-gray-800 dark:text-white">
                {selectedProduct.name}
              </p>
              {selectedVendorName && (
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {selectedVendorName}
                </p>
              )}
            </>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
          )}
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {dropdownPanel && createPortal(dropdownPanel, document.body)}
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  type Product,
  type Vendor,
  type Category,
  type PrItemInput,
  productAPI,
} from "../../utils/api";
import { formatIdr, formatNumberToIdrInput, parseIdrInputToNumberString } from "./prUtils";
import { TrashBinIcon, PlusIcon } from "../../icons";
import { Modal } from "../../components/ui/modal";
import { Select } from "../../components/ui/Select";
import ProductPicker from "./ProductPicker";
import CalendarDatePicker from "../../components/ui/CalendarDatePicker";

export type PrItemRow = Omit<PrItemInput, "request_qty" | "request_price" | "due_date"> & {
  _key: string;
  request_qty: number | string;
  request_price: number | string;
  due_date?: string;
};

interface PrItemsEditorProps {
  items: PrItemRow[];
  onChange: (items: PrItemRow[]) => void;
  products: Product[];
  vendors: Vendor[];
  categories: Category[];
  disabled?: boolean;
  onAddProduct?: (prod: Product) => void;
}

function newRow(): PrItemRow {
  return {
    _key: crypto.randomUUID(),
    vendor_id: null,
    product_id: null,
    category_id: null,
    description: "",
    request_qty: 1,
    request_price: 0,
    due_date: "",
  };
}

function getRowCategoryOptions(product: Product | undefined) {
  if (!product?.categories?.length) return [];
  return product.categories.map((c) => ({ value: c.id, label: c.name }));
}

function resolveCategoryForProduct(
  product: Product,
  currentCategoryId: number | null | undefined
) {
  const productCategoryIds = product.categories.map((c) => c.id);
  if (currentCategoryId && productCategoryIds.includes(currentCategoryId)) {
    return currentCategoryId;
  }
  return product.categories[0]?.id ?? null;
}

export default function PrItemsEditor({
  items,
  onChange,
  products,
  vendors,
  categories,
  disabled = false,
  onAddProduct,
}: PrItemsEditorProps) {
  const updateRow = (key: string, patch: Partial<PrItemRow>) => {
    onChange(
      items.map((row) => (row._key === key ? { ...row, ...patch } : row))
    );
  };

  const handleProductChange = (key: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      updateRow(key, { product_id: productId || null, category_id: null });
      return;
    }
    const row = items.find((r) => r._key === key);
    updateRow(key, {
      product_id: product.id,
      vendor_id: product.vendor_id,
      category_id: resolveCategoryForProduct(product, row?.category_id),
      request_price: Number(product.price),
      description: product.name,
    });
  };

  const addRow = () => onChange([...items, newRow()]);

  const removeRow = (key: string) => {
    if (items.length <= 1) return;
    onChange(items.filter((r) => r._key !== key));
  };

  const grandTotal = items.reduce(
    (sum, row) => sum + Number(row.request_qty || 0) * Number(row.request_price || 0),
    0
  );

  // New product modal state
  const [activeItemKeyForNewProduct, setActiveItemKeyForNewProduct] = useState<string | null>(null);
  const [uoms, setUoms] = useState<Array<{ id: number; name: string; shortname: string }>>([]);
  const [newProductName, setNewProductName] = useState("");
  const [newProductVendorId, setNewProductVendorId] = useState("");
  const [newProductUomId, setNewProductUomId] = useState<number | "">("");
  const [newProductPrice, setNewProductPrice] = useState<string>("");
  const [newProductCategoryId, setNewProductCategoryId] = useState<number | "">("");
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    const loadUoms = async () => {
      try {
        const res = await productAPI.getUoms();
        if (res.success && res.data) {
          setUoms(res.data.uoms);
        }
      } catch (e) {
        console.error("Gagal memuat UOMs", e);
      }
    };
    loadUoms();
  }, []);

  const activeRow = items.find((r) => r._key === activeItemKeyForNewProduct);

  useEffect(() => {
    if (activeItemKeyForNewProduct) {
      const row = items.find((r) => r._key === activeItemKeyForNewProduct);
      setNewProductName("");
      setNewProductVendorId(row?.vendor_id || "");
      setNewProductUomId("");
      setNewProductPrice("");
      setNewProductCategoryId(row?.category_id || "");
      setModalError(null);
    }
  }, [activeItemKeyForNewProduct]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      setModalError("Nama produk wajib diisi");
      return;
    }
    if (!newProductVendorId) {
      setModalError("Vendor rujukan wajib dipilih");
      return;
    }
    if (!newProductUomId) {
      setModalError("Satuan (UOM) wajib dipilih");
      return;
    }
    if (newProductPrice === "" || Number(newProductPrice) < 0) {
      setModalError("Harga referensi wajib diisi dan minimal 0");
      return;
    }
    if (!newProductCategoryId) {
      setModalError("Kategori wajib dipilih");
      return;
    }

    setIsCreatingProduct(true);
    setModalError(null);

    try {
      const res = await productAPI.createProduct({
        name: newProductName,
        vendor_id: newProductVendorId,
        uom_id: Number(newProductUomId),
        price: Number(newProductPrice),
        category_ids: newProductCategoryId ? [Number(newProductCategoryId)] : [],
        is_active: true,
      });

      if (res.success && res.data) {
        const createdProduct = res.data;
        if (onAddProduct) {
          onAddProduct(createdProduct);
        }
        updateRow(activeItemKeyForNewProduct!, {
          product_id: createdProduct.id,
          vendor_id: createdProduct.vendor_id,
          category_id: createdProduct.categories && createdProduct.categories.length > 0 
            ? createdProduct.categories[0].id 
            : activeRow?.category_id || null,
          request_price: createdProduct.price,
          description: createdProduct.name,
        });
        setActiveItemKeyForNewProduct(null);
      } else {
        setModalError(res.error || "Gagal membuat produk");
      }
    } catch (err: any) {
      setModalError(err?.message || "Terjadi kesalahan server");
    } finally {
      setIsCreatingProduct(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div>
        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Daftar Barang / Jasa Yang Diajukan
        </h4>
      </div>

      {/* Items Cards */}
      <div className="space-y-3">
        {items.map((row, idx) => {
          const lineTotal = Number(row.request_qty || 0) * Number(row.request_price || 0);
          const product = products.find((p) => p.id === row.product_id);
          const uomName = product?.uom?.shortname || product?.uom?.name;
          const productCategoryOptions = getRowCategoryOptions(product);
          return (
            <div
              key={row._key}
              className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.02] shadow-sm"
            >
              {/* Item Card Header — compact strip */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50/60 dark:bg-white/[0.01] border-b border-gray-100 dark:border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-950/40 text-[10px] font-extrabold text-brand-600 dark:text-brand-400">
                    {idx + 1}
                  </span>
                  {product && (
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {product.name} - {product.vendor?.company_name}
                    </span>
                  )}
                  {!product && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                      Belum ada produk dipilih
                    </span>
                  )}
                </div>
                {!disabled && items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(row._key)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20"
                    title="Hapus Item"
                  >
                    <TrashBinIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Item Card Body */}
              <div className="p-4 space-y-3">
                {/* Row 1: Product Picker (full width) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Produk Referensi
                    </label>
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => setActiveItemKeyForNewProduct(row._key)}
                        className="text-[10px] font-bold text-brand-600 hover:underline dark:text-brand-400"
                      >
                        + Produk Baru?
                      </button>
                    )}
                  </div>
                  <ProductPicker
                    products={products}
                    vendors={vendors}
                    value={row.product_id || ""}
                    onChange={(productId: string) => handleProductChange(row._key, productId)}
                    disabled={disabled}
                    placeholder="Cari produk berdasarkan nama atau vendor..."
                  />
                </div>

                {/* Row 2: Description (full width) */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Deskripsi Item *</label>
                  <input
                    disabled={disabled}
                    type="text"
                    required
                    placeholder="Nama / spesifikasi barang atau jasa yang diajukan"
                    value={row.description || ""}
                    onChange={(e) => updateRow(row._key, { description: e.target.value })}
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm transition-all focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white"
                  />
                </div>

                {/* Row 3: Kategori + Qty + Harga + Subtotal — compact inline row */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 items-end">
                  {/* Kategori */}
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Kategori <span className="text-red-500">*</span></label>
                    <Select
                      size="sm"
                      disabled={disabled || !product || productCategoryOptions.length === 0}
                      value={row.category_id ?? ""}
                      onChange={(v) =>
                        updateRow(row._key, {
                          category_id: v === "" ? null : Number(v),
                        })
                      }
                      required
                      placeholder={
                        !product
                          ? "— Pilih produk dulu —"
                          : productCategoryOptions.length === 0
                            ? "— Produk tanpa kategori —"
                            : "— Pilih kategori —"
                      }
                      allowEmpty
                      emptyLabel={
                        !product
                          ? "— Pilih produk dulu —"
                          : productCategoryOptions.length === 0
                            ? "— Produk tanpa kategori —"
                            : "— Pilih kategori —"
                      }
                      options={productCategoryOptions}
                    />
                  </div>

                  {/* Qty */}
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Qty{uomName ? ` (${uomName})` : ""}
                    </label>
                    <div className="relative flex items-center">
                      <input
                        disabled={disabled}
                        type="number"
                        step="any"
                        min={0}
                        value={row.request_qty}
                        onChange={(e) => updateRow(row._key, { request_qty: e.target.value })}
                        className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm transition-all focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Harga Satuan */}
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Harga Satuan</label>
                    <input
                      disabled={disabled}
                      type="text"
                      inputMode="decimal"
                      value={formatNumberToIdrInput(row.request_price)}
                      onChange={(e) => {
                        const parsed = parseIdrInputToNumberString(e.target.value);
                        updateRow(row._key, { request_price: parsed });
                      }}
                      className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm transition-all focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white"
                      placeholder="0"
                    />
                  </div>

                  {/* Subtotal */}
                  <div className="flex flex-col">
                    <span className="mb-1.5 block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Subtotal</span>
                    <div className="h-9 flex items-center px-3 rounded-lg bg-brand-50/50 dark:bg-brand-950/10 border border-brand-100 dark:border-brand-900/20">
                      <span className="text-sm font-bold text-brand-700 dark:text-brand-300 truncate">{formatIdr(lineTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Row 4: Jatuh tempo per item */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 items-end">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Jatuh Tempo Item <span className="text-red-500">*</span>
                    </label>
                    <CalendarDatePicker
                      size="sm"
                      disabled={disabled}
                      required
                      value={row.due_date || ""}
                      onChange={(dateStr) => updateRow(row._key, { due_date: dateStr })}
                    />
                    <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                      PO tetap dikelompokkan per vendor; jatuh tempo berlaku per baris item.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Item Button — below cards */}
      {!disabled && (
        <button
          type="button"
          onClick={addRow}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-brand-300 dark:border-brand-800/50 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/10 transition-all"
        >
          <PlusIcon className="w-4 h-4" />
          Tambah Item
        </button>
      )}


      {/* Summary Box */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-gray-200 bg-gray-50/40 dark:border-white/[0.05] dark:bg-white/[0.01]">
        <div>
          <h5 className="text-sm font-bold text-gray-800 dark:text-white">Estimasi Total Nilai PR</h5>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Akumulasi nilai seluruh item barang & jasa yang diajukan
          </p>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-lg font-black text-brand-600 dark:text-brand-400">{formatIdr(grandTotal)}</span>
        </div>
      </div>

      {/* Modal Tambah Produk Baru */}
      <Modal
        isOpen={activeItemKeyForNewProduct !== null}
        onClose={() => setActiveItemKeyForNewProduct(null)}
        className="max-w-md p-6"
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Tambah Produk Baru
        </h3>
        
        {modalError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-xs font-medium text-red-600 dark:text-red-400">
            {modalError}
          </div>
        )}

        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Nama Produk *
            </label>
            <input
              type="text"
              required
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              placeholder="Contoh: Tepung Terigu Segitiga Biru"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm transition-all focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Vendor Rujukan *
            </label>
            <Select
              value={newProductVendorId}
              onChange={(v) => setNewProductVendorId(String(v))}
              required
              placeholder="— Pilih vendor rujukan —"
              allowEmpty
              emptyLabel="— Pilih vendor rujukan —"
              options={vendors.map((v) => ({ value: v.id, label: v.company_name }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Satuan (UOM) *
              </label>
              <Select
                value={newProductUomId || ""}
                onChange={(v) => setNewProductUomId(v === "" ? 0 : Number(v))}
                required
                placeholder="— Pilih UOM —"
                allowEmpty
                emptyLabel="— Pilih UOM —"
                options={uoms.map((u) => ({
                  value: u.id,
                  label: `${u.name} (${u.shortname})`,
                }))}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Harga Referensi *
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={formatNumberToIdrInput(newProductPrice)}
                onChange={(e) => {
                  const parsed = parseIdrInputToNumberString(e.target.value);
                  setNewProductPrice(parsed);
                }}
                placeholder="0"
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm transition-all focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Kategori *
            </label>
            <Select
              value={newProductCategoryId}
              onChange={(v) => setNewProductCategoryId(v === "" ? "" : Number(v))}
              required
              placeholder="— Pilih kategori —"
              allowEmpty
              emptyLabel="— Pilih kategori —"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
            <button
              type="button"
              onClick={() => setActiveItemKeyForNewProduct(null)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold dark:border-white/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.02]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isCreatingProduct}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {isCreatingProduct ? (
                <>
                  <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Menyimpan...
                </>
              ) : (
                "Simpan Produk"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function createDefaultItems(): PrItemRow[] {
  return [newRow()];
}

export function mapPrItemsToRows(
  items: Array<{
    id?: string;
    vendor_id?: string | null;
    product_id?: string | null;
    category_id?: number | null;
    description?: string | null;
    request_qty: number;
    request_price: number;
    due_date?: string | null;
  }>,
  options?: { preserveKeys?: boolean }
): PrItemRow[] {
  if (!items.length) return createDefaultItems();
  return items.map((it) => ({
    _key: options?.preserveKeys && it.id ? it.id : crypto.randomUUID(),
    vendor_id: it.vendor_id ?? null,
    product_id: it.product_id ?? null,
    category_id: it.category_id ?? null,
    description: it.description ?? "",
    request_qty: Number(it.request_qty),
    request_price: Number(it.request_price),
    due_date: it.due_date ? it.due_date.slice(0, 10) : "",
  }));
}

export function itemsToPayload(items: PrItemRow[]) {
  return items.map(({ _key, due_date, ...rest }) => ({
    ...rest,
    request_qty: Number(rest.request_qty || 0),
    request_price: Number(rest.request_price || 0),
    due_date: due_date || null,
  }));
}

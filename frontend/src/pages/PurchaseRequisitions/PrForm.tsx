import { useEffect, useState, FormEvent, useMemo } from "react";
import { Link } from "react-router";
import {
  unitAPI,
  productAPI,
  vendorAPI,
  categoryAPI,
  purchaseRequisitionAPI,
  type Product,
  type Vendor,
  type Category,
  type PurchaseRequisition,
} from "../../utils/api";
import { AngleLeftIcon, PaperPlaneIcon } from "../../icons";
import { useToast } from "../../context/ToastContext";
import { LoadingModal } from "../../components/ui/modal";
import ComponentCard from "../../components/common/ComponentCard";
import PrItemsEditor, {
  createDefaultItems,
  itemsToPayload,
  mapPrItemsToRows,
  type PrItemRow,
} from "./PrItemsEditor";
import PrTemplatePicker from "./PrTemplatePicker";
import { Select } from "../../components/ui/Select";

interface PrFormProps {
  mode: "create" | "edit";
  prId?: string;
  onSaved: (pr: PurchaseRequisition) => void;
  backTo: string;
  title: string;
}

export default function PrForm({ mode, prId, onSaved, backTo, title }: PrFormProps) {
  const { success: showSuccess, error: showError } = useToast();
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [units, setUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [purchaseTypes, setPurchaseTypes] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [unitId, setUnitId] = useState<string>("");
  const [purchaseTypeId, setPurchaseTypeId] = useState<number | null>(null);
  const [items, setItems] = useState<PrItemRow[]>(createDefaultItems());

  const scopedCategories = useMemo(() => {
    if (!unitId) return [];
    return categories.filter((c) => c.unit_id === unitId);
  }, [categories, unitId]);

  const scopedVendors = useMemo(() => {
    if (!unitId) return [];
    return vendors.filter((v) => v.unit_id === unitId);
  }, [vendors, unitId]);

  const scopedProducts = useMemo(() => {
    if (!unitId) return [];
    return products.filter((p) => {
      const vendor = vendors.find((v) => v.id === p.vendor_id);
      return vendor?.unit_id === unitId;
    });
  }, [products, vendors, unitId]);

  const isUnitLocked = mode === "create" && units.length === 1;

  const formHasData = useMemo(() => {
    if (purchaseTypeId) return true;
    return items.some(
      (row) =>
        row.vendor_id ||
        row.product_id ||
        (row.description && row.description.trim()) ||
        Number(row.request_price) > 0
    );
  }, [purchaseTypeId, items]);

  const applyTemplate = (pr: PurchaseRequisition) => {
    if (pr.unit_id) setUnitId(pr.unit_id);
    setPurchaseTypeId(pr.purchase_type_id);
    setItems(mapPrItemsToRows(pr.items || []));
    setError(null);
    showSuccess(`Data dimuat dari ${pr.pr_number}`);
  };

  useEffect(() => {
    if (mode !== "create" || units.length !== 1) return;
    setUnitId((current) => current || units[0].id);
  }, [mode, units]);

  useEffect(() => {
    const loadOptions = async () => {
      const [u, pt, p, v, c] = await Promise.all([
        unitAPI.getAllUnits({ all: true }),
        purchaseRequisitionAPI.getPurchaseTypes(),
        productAPI.getAllProducts({ all: true }),
        vendorAPI.getAllVendors({ all: true }),
        categoryAPI.getAllCategories({ all: true }),
      ]);
      if (u.success && u.data) {
        setUnits(u.data.units);
      } else if (!u.success) {
        setError(u.message || "Gagal memuat daftar unit");
      }
      if (pt.success && pt.data) setPurchaseTypes(pt.data.purchase_types);
      if (p.success && p.data) setProducts(p.data.products);
      if (v.success && v.data) setVendors(v.data.vendors);
      if (c.success && c.data) setCategories(c.data.categories);
    };
    loadOptions();
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !prId) return;
    const loadPr = async () => {
      setIsLoading(true);
      try {
        const res = await purchaseRequisitionAPI.getById(prId);
        if (res.success && res.data) {
          const pr = res.data;
          if (pr.approval_status !== "draft") {
            setError("PR tidak dapat diedit karena bukan draft");
            return;
          }
          setUnitId(pr.unit_id || "");
          setPurchaseTypeId(pr.purchase_type_id);
          setItems(mapPrItemsToRows(pr.items || [], { preserveKeys: true }));
        } else {
          setError(res.message || "Gagal memuat PR");
        }
      } catch {
        setError("Terjadi kesalahan saat memuat PR");
      } finally {
        setIsLoading(false);
      }
    };
    loadPr();
  }, [mode, prId]);

  const validate = (forSubmit = false): boolean => {
    if (!unitId) {
      showError("Unit wajib dipilih");
      return false;
    }
    if (!purchaseTypeId) {
      showError("Tipe pengadaan wajib dipilih");
      return false;
    }
    for (const row of items) {
      if (!row.category_id) {
        showError("Kategori wajib dipilih untuk setiap item");
        return false;
      }
      if (!row.vendor_id) {
        showError("Setiap item harus memiliki vendor");
        return false;
      }
      if (Number(row.request_qty || 0) <= 0) {
        showError("Qty harus lebih dari 0");
        return false;
      }
    }
    if (forSubmit) {
      for (const row of items) {
        if (!row.due_date) {
          showError("Jatuh tempo wajib diisi untuk setiap item");
          return false;
        }
      }
    }
    return true;
  };

  const handleSave = async (e: FormEvent, andSubmit = false) => {
    e.preventDefault();
    setError(null);
    if (!validate(andSubmit)) return;

    setIsSubmitting(true);
    try {
      const payload = {
        unit_id: unitId,
        purchase_type_id: purchaseTypeId,
        items: itemsToPayload(items),
      };

      let res;
      if (mode === "create") {
        res = await purchaseRequisitionAPI.create(payload);
      } else {
        res = await purchaseRequisitionAPI.update(prId!, payload);
      }

      if (!res.success || !res.data) {
        showError(res.message || "Gagal menyimpan PR");
        return;
      }

      let saved = res.data;
      if (andSubmit) {
        const submitRes = await purchaseRequisitionAPI.submit(saved.id);
        if (!submitRes.success || !submitRes.data) {
          showError(submitRes.message || "Tersimpan, tetapi gagal submit");
          onSaved(saved);
          return;
        }
        saved = submitRes.data;
        showSuccess("PR berhasil disimpan dan disubmit");
      } else {
        showSuccess(mode === "create" ? "Draft PR berhasil dibuat" : "PR berhasil diperbarui");
      }
      onSaved(saved);
    } catch {
      showError("Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[320px] w-full items-center justify-center rounded-2xl border border-gray-155 bg-white/50 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600 dark:border-brand-900/30 dark:border-t-brand-400" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Memuat data formulir...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => handleSave(e, false)} className="space-y-6">
      {/* Header Bar */}
      <div className="border-b border-gray-100 pb-5 dark:border-white/[0.05]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={backTo}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-brand-600 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-brand-400"
            >
              <AngleLeftIcon className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">{title}</h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Isi data pengadaan barang & jasa di bawah ini
              </p>
            </div>
          </div>
          {mode === "create" && (
            <div className="shrink-0 sm:self-center">
              <PrTemplatePicker
                onLoad={applyTemplate}
                onError={(msg) => showError(msg)}
                formHasData={formHasData}
                unitId={unitId || undefined}
              />
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50/80 border border-red-100 dark:bg-red-950/20 dark:border-red-900/30 text-sm text-red-800 dark:text-red-400 flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Information Section */}
      <ComponentCard title="Informasi Pengadaan">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wider text-xs">
              Unit / Brand <span className="text-red-500">*</span>
            </label>
            <Select
              value={unitId}
              onChange={(v) => setUnitId(String(v))}
              disabled={isUnitLocked}
              required
              placeholder="— Pilih unit / brand —"
              allowEmpty={!isUnitLocked}
              emptyLabel="— Pilih unit / brand —"
              options={units.map((u) => ({ value: u.id, label: u.name }))}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wider text-xs">
              Tipe Pengadaan <span className="text-red-500">*</span>
            </label>
            <Select
              value={purchaseTypeId ?? ""}
              onChange={(v) => setPurchaseTypeId(v === "" ? null : Number(v))}
              required
              placeholder="— Pilih tipe pengadaan —"
              allowEmpty
              emptyLabel="— Pilih tipe pengadaan —"
              options={purchaseTypes.map((t) => ({ value: t.id, label: t.name }))}
            />
          </div>
        </div>
      </ComponentCard>

      {/* Items List Editor Section */}
      <PrItemsEditor
        items={items}
        onChange={setItems}
        products={scopedProducts}
        vendors={scopedVendors}
        categories={scopedCategories}
        onAddProduct={(newProd) => setProducts((prev) => [...prev, newProd])}
      />

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 dark:border-white/[0.05] pt-6">
        <Link
          to={backTo}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-white/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.05]"
        >
          Batal
        </Link>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-gray-100 px-5 text-sm font-semibold text-gray-800 transition-all hover:bg-gray-200 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.1] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Simpan Draft
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={(e) => handleSave(e, true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white transition-all hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <PaperPlaneIcon className="w-4 h-4" />
            Simpan & Submit
          </button>
        </div>
      </div>

      <LoadingModal isOpen={isSubmitting} />
    </form>
  );
}

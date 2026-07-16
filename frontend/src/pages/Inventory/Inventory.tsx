import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import { Modal, LoadingModal } from "../../components/ui/modal";
import { Select } from "../../components/ui/Select";
import {
  inventoryAPI,
  unitAPI,
  productAPI,
  categoryAPI,
  type ProductStock,
  type StockMovement,
  type Product,
  type Category,
} from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { PlusIcon, BoxIcon, HistoryIcon, CalenderIcon } from "../../icons";
import { formatDateTime, formatQty } from "../PurchaseRequisitions/prUtils";
import { MOVEMENT_TYPE_OPTIONS, todayIsoDate } from "./inventoryUtils";
import CalendarDatePicker from "../../components/ui/CalendarDatePicker";

type TabId = "balances" | "movements" | "daily";

export default function Inventory() {
  const { hasPermission } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("balances");

  const canCreateMovement = hasPermission("create_stock_movement");

  const [units, setUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [unitFilter, setUnitFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [stocks, setStocks] = useState<ProductStock[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [dailyDateFrom, setDailyDateFrom] = useState(todayIsoDate());
  const [dailyDateTo, setDailyDateTo] = useState(todayIsoDate());
  const [dailyItems, setDailyItems] = useState<
    Array<{
      product_id: string;
      product_name: string;
      unit_name: string;
      category_name: string;
      opening_qty: number;
      total_in: number;
      total_out: number;
      closing_qty: number;
    }>
  >([]);

  const [movementTypeFilter, setMovementTypeFilter] = useState("");
  const [movementDateFrom, setMovementDateFrom] = useState("");
  const [movementDateTo, setMovementDateTo] = useState("");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExportingDaily, setIsExportingDaily] = useState(false);
  const [isExportingDailyPdfCumulative, setIsExportingDailyPdfCumulative] = useState(false);
  const [isExportingDailyPdfPerDay, setIsExportingDailyPdfPerDay] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"issue" | "adjustment">("issue");
  const [formProductId, setFormProductId] = useState("");
  const [formUnitId, setFormUnitId] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formQty, setFormQty] = useState("1");
  const [formDirection, setFormDirection] = useState<"in" | "out">("out");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formCategories, setFormCategories] = useState<Category[]>([]);
  const [isLoadingFormCategories, setIsLoadingFormCategories] = useState(false);
  const [isFormCategoryFromRow, setIsFormCategoryFromRow] = useState(false);

  const filteredCategories = useMemo(() => {
    if (!unitFilter) return [];
    return categories.filter((c) => c.unit_id === unitFilter);
  }, [categories, unitFilter]);

  const isUnitFilterLocked = units.length === 1;
  const isCategoryFilterLocked = Boolean(unitFilter) && filteredCategories.length === 1;
  const isFormUnitLocked = units.length === 1;

  const getUomForProduct = (productId: string) => {
    const p = products.find((prod) => prod.id === productId);
    return p?.uom?.shortname || p?.uom?.name || "";
  };

  const formProductUom = getUomForProduct(formProductId);

  const mergeFormCategories = (
    unitId: string,
    productId: string,
    productDetail?: Product | null,
    stockRows: ProductStock[] = [],
  ) => {
    const byId = new Map<number, Category>();
    const addCategory = (cat?: Category | null, opts?: { fromStock?: boolean }) => {
      if (!cat?.id) return;
      if (opts?.fromStock) {
        if (cat.unit_id && cat.unit_id !== unitId) return;
      } else if (cat.unit_id !== unitId) {
        return;
      }
      byId.set(Number(cat.id), cat);
    };

    const product = productDetail ?? products.find((p) => p.id === productId);
    (product?.categories || []).forEach((cat) => addCategory(cat));

    for (const stock of stockRows) {
      if (stock.category) {
        addCategory(stock.category as Category, { fromStock: true });
      } else if (stock.category_id) {
        addCategory(
          categories.find((c) => Number(c.id) === Number(stock.category_id)),
          { fromStock: true },
        );
      }
    }

    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, "id"));
  };

  useEffect(() => {
    if (!isModalOpen || !formUnitId || !formProductId) {
      setFormCategories([]);
      setIsLoadingFormCategories(false);
      return;
    }

    let cancelled = false;
    setIsLoadingFormCategories(true);

    const loadFormCategories = async () => {
      let productDetail: Product | null = null;
      let stockRows: ProductStock[] = [];

      try {
        const [productRes, stockRes] = await Promise.all([
          productAPI.getProductById(formProductId),
          inventoryAPI.getStocks({
            product_id: formProductId,
            unit_id: formUnitId,
            limit: 100,
          }),
        ]);
        if (productRes.success && productRes.data) {
          productDetail = productRes.data;
        }
        if (stockRes.success && stockRes.data) {
          stockRows = stockRes.data.stocks;
        }
      } catch {
        // Fallback to cached product + stock list below.
      }

      if (cancelled) return;

      const resolved = mergeFormCategories(
        formUnitId,
        formProductId,
        productDetail,
        stockRows.length > 0
          ? stockRows
          : stocks.filter(
              (s) => s.product_id === formProductId && s.unit_id === formUnitId,
            ),
      );
      setFormCategories(resolved);
      setIsLoadingFormCategories(false);

      setFormCategoryId((current) => {
        if (isFormCategoryFromRow && current) return current;
        if (resolved.length === 1) return String(resolved[0].id);
        if (current && resolved.some((c) => String(c.id) === current)) return current;
        return "";
      });
    };

    loadFormCategories();
    return () => {
      cancelled = true;
    };
  }, [isModalOpen, formUnitId, formProductId, products, categories, stocks, isFormCategoryFromRow]);

  const currentStockRow = useMemo(() => {
    if (!formProductId || !formUnitId || !formCategoryId) return null;
    return stocks.find(
      (s) =>
        s.product_id === formProductId &&
        s.unit_id === formUnitId &&
        s.category_id === Number(formCategoryId)
    );
  }, [stocks, formProductId, formUnitId, formCategoryId]);

  const scopedProducts = useMemo(() => {
    if (!formUnitId) return products;
    return products.filter((p) => p.vendor?.unit_id === formUnitId);
  }, [products, formUnitId]);

  const isFormCategoryLocked = Boolean(formUnitId && formProductId) && formCategories.length === 1;

  useEffect(() => {
    if (units.length !== 1) return;
    setUnitFilter((current) => current || units[0].id);
  }, [units]);

  useEffect(() => {
    if (!unitFilter) {
      setCategoryFilter("");
      return;
    }
    if (filteredCategories.length === 1) {
      setCategoryFilter(String(filteredCategories[0].id));
      return;
    }
    setCategoryFilter((current) =>
      current && !filteredCategories.some((c) => String(c.id) === current) ? "" : current
    );
  }, [unitFilter, filteredCategories]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, unitFilter, categoryFilter, activeTab, movementTypeFilter, movementDateFrom, movementDateTo]);

  useEffect(() => {
    const loadOptions = async () => {
      const [u, p, c] = await Promise.all([
        unitAPI.getAllUnits({ all: true }),
        productAPI.getAllProducts({ all: true }),
        categoryAPI.getAllCategories({ all: true }),
      ]);
      if (u.success && u.data) setUnits(u.data.units);
      if (p.success && p.data) setProducts(p.data.products);
      if (c.success && c.data) setCategories(c.data.categories);
    };
    loadOptions();
  }, []);

  const fetchData = async (forceLoading = false) => {
    if (forceLoading || (activeTab === "balances" && stocks.length === 0)) {
      setIsLoading(true);
    }
    try {
      if (activeTab === "balances") {
        const res = await inventoryAPI.getStocks({
          page,
          limit: 15,
          search: debouncedSearch.trim() || undefined,
          unit_id: unitFilter || undefined,
          category_id: categoryFilter ? Number(categoryFilter) : undefined,
        });
        if (res.success && res.data) {
          setStocks(res.data.stocks);
          setLowStockCount(res.data.low_stock_count ?? 0);
          if (res.data.pagination) setPagination(res.data.pagination);
        }
      } else if (activeTab === "movements") {
        const res = await inventoryAPI.getMovements({
          page,
          limit: 15,
          unit_id: unitFilter || undefined,
          category_id: categoryFilter ? Number(categoryFilter) : undefined,
          movement_type: movementTypeFilter || undefined,
          date_from: movementDateFrom || undefined,
          date_to: movementDateTo || undefined,
        });
        if (res.success && res.data) {
          setMovements(res.data.movements);
          if (res.data.pagination) setPagination(res.data.pagination);
        }
      } else {
        const res = await inventoryAPI.getDailySummary({
          date_from: dailyDateFrom,
          date_to: dailyDateTo || dailyDateFrom,
          unit_id: unitFilter || undefined,
          category_id: categoryFilter ? Number(categoryFilter) : undefined,
        });
        if (res.success && res.data) {
          setDailyItems(res.data.items);
        }
      }
    } catch {
      showError("Gagal memuat data stok");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
  }, [page, debouncedSearch, unitFilter, categoryFilter, activeTab, movementTypeFilter, movementDateFrom, movementDateTo, dailyDateFrom, dailyDateTo]);

  const openMovementModal = (
    mode: "issue" | "adjustment",
    initialData?: { productId?: string; unitId?: string; categoryId?: string }
  ) => {
    const fromRow = Boolean(initialData?.categoryId);
    setModalMode(mode);
    setFormProductId(initialData?.productId || "");
    setFormCategoryId(initialData?.categoryId || "");
    setFormUnitId(initialData?.unitId || (units.length === 1 ? units[0].id : unitFilter || ""));
    setFormQty("1");
    setFormDirection(mode === "issue" ? "out" : "in");
    setFormNotes("");
    setFormError(null);
    setIsFormCategoryFromRow(fromRow);
    if (fromRow && initialData?.categoryId) {
      const lockedCategory = categories.find((c) => String(c.id) === initialData.categoryId);
      setFormCategories(lockedCategory ? [lockedCategory] : []);
    } else {
      setFormCategories([]);
    }
    setIsModalOpen(true);
  };

  const closeMovementModal = () => {
    setIsModalOpen(false);
    setIsFormCategoryFromRow(false);
  };

  const handleSubmitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formProductId || !formUnitId || !formCategoryId) {
      setFormError("Unit, kategori, dan produk wajib dipilih");
      return;
    }
    const qty = Number(formQty);
    if (!qty || qty <= 0) {
      setFormError("Qty harus lebih dari 0");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        product_id: formProductId,
        unit_id: formUnitId,
        category_id: Number(formCategoryId),
        qty,
        notes: formNotes.trim() || null,
      };
      const res =
        modalMode === "issue"
          ? await inventoryAPI.createIssue(payload)
          : await inventoryAPI.createAdjustment({ ...payload, direction: formDirection });

      if (res.success) {
        showSuccess(res.message || "Mutasi stok berhasil");
        closeMovementModal();
        fetchData(true);
      } else {
        setFormError(res.message || "Gagal menyimpan mutasi");
      }
    } catch {
      setFormError("Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportDaily = async () => {
    setIsExportingDaily(true);
    try {
      const res = await inventoryAPI.exportDailySummary({
        date_from: dailyDateFrom,
        date_to: dailyDateTo || dailyDateFrom,
        unit_id: unitFilter || undefined,
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
      });
      if (res.success) {
        showSuccess("Laporan Excel berhasil diunduh");
      } else {
        showError(res.message || "Gagal mengunduh laporan Excel");
      }
    } catch {
      showError("Terjadi kesalahan saat mengunduh laporan");
    } finally {
      setIsExportingDaily(false);
    }
  };

  const isExportingDailyPdf = isExportingDailyPdfCumulative || isExportingDailyPdfPerDay;

  const handleExportDailyPdfCumulative = async () => {
    setIsExportingDailyPdfCumulative(true);
    try {
      const res = await inventoryAPI.exportDailySummaryPdf({
        date_from: dailyDateFrom,
        date_to: dailyDateTo || dailyDateFrom,
        unit_id: unitFilter || undefined,
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
      });
      if (res.success) {
        showSuccess("Laporan PDF kumulatif berhasil diunduh");
      } else {
        showError(res.message || "Gagal mengunduh laporan PDF kumulatif");
      }
    } catch {
      showError("Terjadi kesalahan saat mengunduh laporan");
    } finally {
      setIsExportingDailyPdfCumulative(false);
    }
  };

  const handleExportDailyPdfPerDay = async () => {
    setIsExportingDailyPdfPerDay(true);
    try {
      const res = await inventoryAPI.exportDailySummaryPdfPerDay({
        date_from: dailyDateFrom,
        date_to: dailyDateTo || dailyDateFrom,
        unit_id: unitFilter || undefined,
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
      });
      if (res.success) {
        showSuccess("Laporan PDF per hari berhasil diunduh");
      } else {
        showError(res.message || "Gagal mengunduh laporan PDF per hari");
      }
    } catch {
      showError("Terjadi kesalahan saat mengunduh laporan");
    } finally {
      setIsExportingDailyPdfPerDay(false);
    }
  };

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "balances", label: "Saldo Stok" },
    { id: "movements", label: "Riwayat Mutasi" },
    { id: "daily", label: "Laporan Harian" },
  ];

  const totalPhysicalStock = useMemo(() => {
    return stocks.reduce((sum, s) => sum + Number(s.qty_on_hand || 0), 0);
  }, [stocks]);

  return (
    <>
      <PageMeta title="Manajemen Stok" description="Saldo stok, mutasi, dan laporan harian" />
      <PageBreadcrumb pageTitle="Manajemen Stok" />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-theme-xs dark:border-white/[0.05] dark:bg-white/[0.03] transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Total Jenis Barang
              </span>
              <h4 className="mt-2 text-2xl font-black text-gray-800 dark:text-white/90">
                {activeTab === "balances" ? pagination.total : stocks.length}
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 ml-1.5 font-normal">item</span>
              </h4>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400">
              <BoxIcon className="w-6 h-6" />
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Jumlah variasi produk terdaftar
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-theme-xs dark:border-white/[0.05] dark:bg-white/[0.03] transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Total Kuantitas Stok
              </span>
              <h4 className="mt-2 text-2xl font-black text-gray-800 dark:text-white/90">
                {formatQty(totalPhysicalStock)}
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 ml-1.5 font-normal">unit</span>
              </h4>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Total barang fisik dalam gudang saat ini
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-theme-xs dark:border-white/[0.05] dark:bg-white/[0.03] transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Peringatan Stok Menipis
              </span>
              <h4 className={`mt-2 text-2xl font-black ${
                lowStockCount > 0
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-gray-800 dark:text-white/90"
              }`}>
                {lowStockCount}
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 ml-1.5 font-normal">item</span>
              </h4>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
              lowStockCount > 0
                ? "bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            }`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Stok di bawah minimum yang ditetapkan pada produk
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 dark:border-white/[0.05]">
        <div className="flex gap-1.5 p-1 bg-gray-100/70 dark:bg-white/[0.03] rounded-xl self-start sm:self-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  isActive
                    ? "bg-white text-gray-800 shadow-xs dark:bg-white/[0.08] dark:text-white"
                    : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {tab.id === "balances" && <BoxIcon className="w-3.5 h-3.5" />}
                {tab.id === "movements" && <HistoryIcon className="w-3.5 h-3.5" />}
                {tab.id === "daily" && <CalenderIcon className="w-3.5 h-3.5" />}
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => fetchData(true)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-gray-300 transition-colors self-end sm:self-auto shadow-theme-xs"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <polyline points="21 3 21 8 16 8" />
          </svg>
          Segarkan Data
        </button>
      </div>

      <ComponentCard
        title={
          activeTab === "balances"
            ? "Saldo Stok Saat Ini"
            : activeTab === "movements"
              ? "Riwayat Mutasi Stok"
              : "Laporan Pergerakan Stok Harian"
        }
      >
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between p-4 rounded-2xl bg-gray-50/50 dark:bg-white/[0.01] border border-gray-100 dark:border-white/[0.03]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap items-end flex-1">
            <div className="flex flex-col">
              <label className="mb-1.5 block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Unit Kerja</label>
              <Select
                size="sm"
                className="min-w-[180px]"
                value={unitFilter}
                disabled={isUnitFilterLocked}
                onChange={(v) => {
                  setUnitFilter(String(v));
                  setCategoryFilter("");
                }}
                placeholder="Semua Unit"
                allowEmpty={!isUnitFilterLocked}
                emptyLabel="Semua Unit"
                options={units.map((u) => ({ value: u.id, label: u.name }))}
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1.5 block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Kategori</label>
              <Select
                size="sm"
                className="min-w-[180px]"
                value={categoryFilter}
                disabled={!unitFilter || isCategoryFilterLocked}
                onChange={(v) => setCategoryFilter(String(v))}
                placeholder={unitFilter ? "Semua Kategori" : "Pilih unit terlebih dahulu"}
                allowEmpty={!isCategoryFilterLocked}
                emptyLabel={unitFilter ? "Semua Kategori" : "Pilih unit terlebih dahulu"}
                options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>

            {activeTab === "balances" && (
              <div className="flex flex-col flex-1 min-w-[220px]">
                <label className="mb-1.5 block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Cari Produk</label>
                <div className="relative">
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nama produk / vendor..."
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm transition-all focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white"
                  />
                  <svg className="absolute left-3 top-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            )}

            {activeTab === "movements" && (
              <>
                <div className="flex flex-col">
                  <label className="mb-1.5 block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tipe Mutasi</label>
                  <Select
                    size="sm"
                    className="min-w-[160px]"
                    value={movementTypeFilter}
                    onChange={(v) => setMovementTypeFilter(String(v))}
                    options={MOVEMENT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  />
                </div>
                <div className="flex flex-col w-full sm:w-[150px]">
                  <label className="mb-1.5 block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Dari Tanggal</label>
                  <CalendarDatePicker
                    value={movementDateFrom}
                    onChange={(dateStr) => setMovementDateFrom(dateStr)}
                  />
                </div>
                <div className="flex flex-col w-full sm:w-[150px]">
                  <label className="mb-1.5 block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Sampai Tanggal</label>
                  <CalendarDatePicker
                    value={movementDateTo}
                    onChange={(dateStr) => setMovementDateTo(dateStr)}
                  />
                </div>
              </>
            )}

            {activeTab === "daily" && (
              <div className="flex flex-col sm:flex-row gap-2.5 sm:items-end w-full sm:w-auto flex-wrap">
                <div className="flex flex-col w-full sm:w-[150px]">
                  <label className="mb-1.5 block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Dari Tanggal</label>
                  <CalendarDatePicker
                    value={dailyDateFrom}
                    onChange={(dateStr) => setDailyDateFrom(dateStr)}
                  />
                </div>
                <div className="flex flex-col w-full sm:w-[150px]">
                  <label className="mb-1.5 block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Sampai Tanggal</label>
                  <CalendarDatePicker
                    value={dailyDateTo}
                    onChange={(dateStr) => setDailyDateTo(dateStr)}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleExportDaily}
                  disabled={isExportingDaily || isExportingDailyPdf}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-gray-300 transition-colors shadow-xs"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M4 12V7a2 2 0 012-2h3m10 0h3a2 2 0 012 2v5" />
                  </svg>
                  {isExportingDaily ? "Mengekspor..." : "Export Excel"}
                </button>
                <button
                  type="button"
                  onClick={handleExportDailyPdfCumulative}
                  disabled={isExportingDaily || isExportingDailyPdf}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300 transition-colors shadow-xs"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {isExportingDailyPdfCumulative ? "Mengekspor..." : "PDF Kumulatif"}
                </button>
                <button
                  type="button"
                  onClick={handleExportDailyPdfPerDay}
                  disabled={isExportingDaily || isExportingDailyPdf}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-4 text-sm font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-60 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300 transition-colors shadow-xs"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {isExportingDailyPdfPerDay ? "Mengekspor..." : "PDF Per Hari"}
                </button>
              </div>
            )}
          </div>

          {canCreateMovement && activeTab !== "daily" && (
            <div className="flex flex-wrap gap-2.5 lg:self-end">
              <button
                type="button"
                onClick={() => openMovementModal("issue")}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-xs"
              >
                <PlusIcon className="h-4 w-4" />
                Catat Pemakaian
              </button>
              <button
                type="button"
                onClick={() => openMovementModal("adjustment")}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-gray-300 transition-colors shadow-xs"
              >
                Penyesuaian
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
          </div>
        ) : activeTab === "balances" ? (
          stocks.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">Belum ada data stok.</p>
          ) : (
            <div className="space-y-4">
              {lowStockCount > 0 && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300">
                  <span className="font-semibold">{lowStockCount} item</span> memiliki stok di bawah minimum.
                  Periksa baris yang ditandai peringatan.
                </div>
              )}
              {/* Desktop View */}
              <div className="hidden md:block overflow-hidden rounded-xl border border-gray-100 dark:border-white/[0.05]">
                <Table>
                  <TableHeader className="bg-gray-50/50 dark:bg-white/[0.02]">
                    <TableRow>
                      <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Produk</TableCell>
                      <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kategori</TableCell>
                      <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unit</TableCell>
                      <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vendor</TableCell>
                      <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Stok
                      </TableCell>
                      {canCreateMovement && (
                        <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Aksi
                        </TableCell>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {stocks.map((s) => (
                      <TableRow
                        key={s.id}
                        className={`hover:bg-gray-50/55 dark:hover:bg-white/[0.01] ${
                          s.is_below_minimum ? "bg-orange-50/40 dark:bg-orange-950/10" : ""
                        }`}
                      >
                        <TableCell className="px-5 py-4 text-sm font-semibold text-gray-800 dark:text-white/90 align-middle">
                          <div className="flex items-center gap-2">
                            <span>{s.product?.name || "-"}</span>
                            {s.is_below_minimum && (
                              <Badge color="warning" size="sm">Stok menipis</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-sm text-brand-600 dark:text-brand-400 font-medium align-middle">
                          {s.category?.name || "-"}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 align-middle">{s.unit?.name || "-"}</TableCell>
                        <TableCell className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400 align-middle">
                          {s.product?.vendor?.company_name || "-"}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-right align-middle">
                          <span
                            className={`font-bold text-base ${
                              s.is_below_minimum
                                ? "text-orange-600 dark:text-orange-400"
                                : "text-gray-800 dark:text-white/95"
                            }`}
                          >
                            {formatQty(s.qty_on_hand)}
                          </span>
                          <span className="ml-1.5 text-xs font-bold text-gray-400 dark:text-gray-550 uppercase">
                            {s.product?.uom?.shortname || s.product?.uom?.name || ""}
                          </span>
                          {Number(s.minimum_stock || 0) > 0 && (
                            <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                              Min: {formatQty(s.minimum_stock || 0)}
                            </p>
                          )}
                        </TableCell>
                        {canCreateMovement && (
                          <TableCell className="px-5 py-4 text-right align-middle whitespace-nowrap">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  openMovementModal("issue", {
                                    productId: s.product_id || s.product?.id,
                                    unitId: s.unit_id || s.unit?.id,
                                    categoryId: s.category_id
                                      ? String(s.category_id)
                                      : s.category?.id
                                        ? String(s.category?.id)
                                        : undefined,
                                  })
                                }
                                className="inline-flex h-8 items-center justify-center rounded-lg bg-brand-50 px-2.5 text-xs font-semibold text-brand-600 hover:bg-brand-100 transition-colors dark:bg-brand-950/20 dark:text-brand-400 dark:hover:bg-brand-950/30"
                              >
                                Catat Pemakaian
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  openMovementModal("adjustment", {
                                    productId: s.product_id || s.product?.id,
                                    unitId: s.unit_id || s.unit?.id,
                                    categoryId: s.category_id
                                      ? String(s.category_id)
                                      : s.category?.id
                                        ? String(s.category?.id)
                                        : undefined,
                                  })
                                }
                                className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-gray-300 dark:hover:bg-white/[0.05]"
                              >
                                Penyesuaian
                              </button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden space-y-3">
                {stocks.map((s) => (
                  <div
                    key={s.id}
                    className={`p-4 bg-white dark:bg-white/[0.02] rounded-xl border space-y-3 shadow-xs ${
                      s.is_below_minimum
                        ? "border-orange-200 dark:border-orange-900/40"
                        : "border-gray-200 dark:border-white/[0.05]"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-col gap-1 border-b border-gray-100 dark:border-white/[0.05] pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-gray-800 dark:text-white/90 text-sm">
                          {s.product?.name || "-"}
                        </h4>
                        {s.is_below_minimum && (
                          <Badge color="warning" size="sm">Menipis</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {s.category?.name && (
                          <span className="inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-50/50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400">
                            {s.category.name}
                          </span>
                        )}
                        {s.unit?.name && (
                          <span className="inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-650 dark:text-gray-400">
                            {s.unit.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                      <div className="col-span-2">
                        <span className="text-gray-400 dark:text-gray-500 block uppercase text-[9px] font-bold tracking-wider mb-0.5">Vendor</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{s.product?.vendor?.company_name || "-"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 dark:text-gray-500 block uppercase text-[9px] font-bold tracking-wider mb-0.5">Stok Terkini</span>
                        <span
                          className={`font-bold text-sm ${
                            s.is_below_minimum
                              ? "text-orange-600 dark:text-orange-400"
                              : "text-gray-850 dark:text-white"
                          }`}
                        >
                          {formatQty(s.qty_on_hand)}{" "}
                          <span className="text-xs text-gray-400 dark:text-gray-500 uppercase font-medium">
                            {s.product?.uom?.shortname || s.product?.uom?.name || ""}
                          </span>
                        </span>
                        {Number(s.minimum_stock || 0) > 0 && (
                          <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            Min: {formatQty(s.minimum_stock || 0)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {canCreateMovement && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-white/[0.05]">
                        <button
                          type="button"
                          onClick={() =>
                            openMovementModal("issue", {
                              productId: s.product_id || s.product?.id,
                              unitId: s.unit_id || s.unit?.id,
                              categoryId: s.category_id
                                ? String(s.category_id)
                                : s.category?.id
                                  ? String(s.category?.id)
                                  : undefined,
                            })
                          }
                          className="inline-flex h-8.5 items-center justify-center rounded-lg bg-brand-50 px-2.5 text-xs font-semibold text-brand-600 hover:bg-brand-100 transition-colors dark:bg-brand-950/20 dark:text-brand-400 dark:hover:bg-brand-950/30"
                        >
                          Catat Pemakaian
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openMovementModal("adjustment", {
                              productId: s.product_id || s.product?.id,
                              unitId: s.unit_id || s.unit?.id,
                              categoryId: s.category_id
                                ? String(s.category_id)
                                : s.category?.id
                                  ? String(s.category?.id)
                                  : undefined,
                            })
                          }
                          className="inline-flex h-8.5 items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-gray-300 dark:hover:bg-white/[0.05]"
                        >
                          Penyesuaian
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        ) : activeTab === "movements" ? (
          movements.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">Belum ada mutasi stok.</p>
          ) : (
            <div className="space-y-4">
              {/* Desktop View */}
              <div className="hidden md:block overflow-hidden rounded-xl border border-gray-100 dark:border-white/[0.05]">
                <Table>
                  <TableHeader className="bg-gray-50/50 dark:bg-white/[0.02]">
                    <TableRow>
                      <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Waktu</TableCell>
                      <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipe</TableCell>
                      <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Produk</TableCell>
                      <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kategori</TableCell>
                      <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unit</TableCell>
                      <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Kuantitas
                      </TableCell>
                      <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Sebelum
                      </TableCell>
                      <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Sesudah
                      </TableCell>
                      <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Oleh</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {movements.map((m) => {
                      const isAddition = m.movement_type === "receipt_po" || m.movement_type === "adjustment_in";
                      return (
                        <TableRow key={m.id} className="hover:bg-gray-50/55 dark:hover:bg-white/[0.01]">
                          <TableCell className="px-5 py-4 whitespace-nowrap text-xs text-gray-500 align-middle">
                            {formatDateTime(m.created_at)}
                          </TableCell>
                          <TableCell className="px-5 py-4 align-middle">
                            <Badge
                              size="sm"
                              color={
                                m.movement_type === "receipt_po" || m.movement_type === "adjustment_in"
                                  ? "success"
                                  : m.movement_type === "issue_usage"
                                    ? "warning"
                                    : "error"
                              }
                            >
                              {m.movement_type_label || m.movement_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-sm font-semibold text-gray-800 dark:text-white/95 align-middle">
                            {m.product?.name || "-"}
                          </TableCell>
                          <TableCell className="px-5 py-4 text-xs font-medium text-brand-600 dark:text-brand-400 align-middle">
                            {m.category?.name || "-"}
                          </TableCell>
                          <TableCell className="px-5 py-4 text-xs text-gray-600 dark:text-gray-300 align-middle">{m.unit?.name || "-"}</TableCell>
                          <TableCell className="px-5 py-4 text-right align-middle">
                            <span className={`font-bold text-sm ${isAddition ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                              {isAddition ? "+" : "-"}{formatQty(m.qty)}
                            </span>
                            <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-550 uppercase">
                              {m.product?.uom?.shortname || m.product?.uom?.name || ""}
                            </span>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-right text-gray-400 text-xs align-middle">
                            {formatQty(m.qty_before)}
                            <span className="ml-1 text-[10px] text-gray-400/80 dark:text-gray-550/80 uppercase">
                              {m.product?.uom?.shortname || m.product?.uom?.name || ""}
                            </span>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-right font-bold text-gray-800 dark:text-white/90 align-middle">
                            {formatQty(m.qty_after)}
                            <span className="ml-1 text-xs text-gray-400 dark:text-gray-550 font-normal uppercase">
                              {m.product?.uom?.shortname || m.product?.uom?.name || ""}
                            </span>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-xs text-gray-500 font-semibold align-middle">
                            {m.actor_name || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden space-y-3">
                {movements.map((m) => {
                  const isAddition = m.movement_type === "receipt_po" || m.movement_type === "adjustment_in";
                  return (
                    <div
                      key={m.id}
                      className="p-4 bg-white dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.05] space-y-3 shadow-xs"
                    >
                      {/* Header */}
                      <div className="flex flex-col gap-2 border-b border-gray-100 dark:border-white/[0.05] pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-gray-850 dark:text-white/90 text-sm">
                            {m.product?.name || "-"}
                          </h4>
                          <Badge
                            size="sm"
                            color={
                              m.movement_type === "receipt_po" || m.movement_type === "adjustment_in"
                                ? "success"
                                : m.movement_type === "issue_usage"
                                  ? "warning"
                                  : "error"
                            }
                          >
                            {m.movement_type_label || m.movement_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {m.category?.name && (
                            <span className="inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-50/50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400">
                              {m.category.name}
                            </span>
                          )}
                          {m.unit?.name && (
                            <span className="inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-650 dark:text-gray-400">
                              {m.unit.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
                        <div>
                          <span className="text-gray-400 dark:text-gray-500 block uppercase text-[9px] font-bold tracking-wider mb-0.5">Waktu</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{formatDateTime(m.created_at)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 dark:text-gray-500 block uppercase text-[9px] font-bold tracking-wider mb-0.5">Oleh</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{m.actor_name || "-"}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 dark:text-gray-500 block uppercase text-[9px] font-bold tracking-wider mb-0.5">Kuantitas</span>
                          <span className={`font-bold text-sm ${isAddition ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                            {isAddition ? "+" : "-"}{formatQty(m.qty)}
                          </span>
                          <span className="ml-1 text-xs text-gray-400 dark:text-gray-550 uppercase font-medium">
                            {m.product?.uom?.shortname || m.product?.uom?.name || ""}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 dark:text-gray-500 block uppercase text-[9px] font-bold tracking-wider mb-0.5">Mutasi Saldo</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {formatQty(m.qty_before)} → <span className="font-bold text-gray-800 dark:text-white">{formatQty(m.qty_after)}</span>
                          </span>
                          <span className="ml-1 text-xs text-gray-400 dark:text-gray-550 uppercase font-medium">
                            {m.product?.uom?.shortname || m.product?.uom?.name || ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : dailyItems.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">
            Tidak ada pergerakan stok pada periode ini.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Desktop View */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-gray-100 dark:border-white/[0.05]">
              <Table>
                <TableHeader className="bg-gray-50/50 dark:bg-white/[0.02]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Produk</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kategori</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unit</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Stok Awal
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Masuk
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Keluar
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Stok Akhir
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {dailyItems.map((row, idx) => {
                    const uom = getUomForProduct(row.product_id);
                    return (
                      <TableRow key={`${row.product_name}-${row.category_name}-${row.unit_name}-${idx}`} className="hover:bg-gray-50/55 dark:hover:bg-white/[0.01]">
                        <TableCell className="px-5 py-4 text-sm font-semibold text-gray-800 dark:text-white/95 align-middle">
                          {row.product_name}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-xs font-medium text-brand-600 dark:text-brand-400 align-middle">
                          {row.category_name}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-xs text-gray-600 dark:text-gray-300 align-middle">{row.unit_name}</TableCell>
                        <TableCell className="px-5 py-4 text-right text-gray-400 align-middle">
                          {formatQty(row.opening_qty)}
                          {uom && <span className="ml-1 text-[10px] text-gray-400 uppercase">{uom}</span>}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-right text-green-600 dark:text-green-400 font-bold align-middle">
                          {row.total_in > 0 ? `+${formatQty(row.total_in)}` : "0"}
                          {row.total_in > 0 && uom && <span className="ml-1 text-[10px] text-green-500/80 dark:text-green-400/85 uppercase font-normal">{uom}</span>}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-right text-red-500 font-bold align-middle">
                          {row.total_out > 0 ? `-${formatQty(row.total_out)}` : "0"}
                          {row.total_out > 0 && uom && <span className="ml-1 text-[10px] text-red-400/80 uppercase font-normal">{uom}</span>}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-right font-bold text-gray-800 dark:text-white align-middle">
                          {formatQty(row.closing_qty)}
                          {uom && <span className="ml-1 text-xs text-gray-400 dark:text-gray-500 uppercase font-normal">{uom}</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden space-y-3">
              {dailyItems.map((row, idx) => {
                const uom = getUomForProduct(row.product_id);
                return (
                  <div
                    key={`${row.product_name}-${row.category_name}-${row.unit_name}-${idx}`}
                    className="p-4 bg-white dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.05] space-y-3 shadow-xs"
                  >
                    {/* Header */}
                    <div className="flex flex-col gap-1 border-b border-gray-100 dark:border-white/[0.05] pb-2">
                      <h4 className="font-semibold text-gray-800 dark:text-white/90 text-sm">
                        {row.product_name}
                      </h4>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {row.category_name && (
                          <span className="inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-50/50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400">
                            {row.category_name}
                          </span>
                        )}
                        {row.unit_name && (
                          <span className="inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-650 dark:text-gray-400">
                            {row.unit_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
                      <div>
                        <span className="text-gray-400 dark:text-gray-500 block uppercase text-[9px] font-bold tracking-wider mb-0.5">Saldo Awal</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {formatQty(row.opening_qty)}
                          {uom && <span className="ml-1 text-[10px] text-gray-400 uppercase">{uom}</span>}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 dark:text-gray-500 block uppercase text-[9px] font-bold tracking-wider mb-0.5">Masuk</span>
                        <span className="font-bold text-green-600 dark:text-green-400">
                          {row.total_in > 0 ? `+${formatQty(row.total_in)}` : "0"}
                          {row.total_in > 0 && uom && <span className="ml-1 text-[10px] text-green-500/80 dark:text-green-400/85 uppercase font-normal">{uom}</span>}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 dark:text-gray-500 block uppercase text-[9px] font-bold tracking-wider mb-0.5">Keluar</span>
                        <span className="font-bold text-red-500">
                          {row.total_out > 0 ? `-${formatQty(row.total_out)}` : "0"}
                          {row.total_out > 0 && uom && <span className="ml-1 text-[10px] text-red-400/80 uppercase font-normal">{uom}</span>}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 dark:text-gray-500 block uppercase text-[9px] font-bold tracking-wider mb-0.5">Saldo Akhir</span>
                        <span className="font-bold text-gray-850 dark:text-white text-sm">
                          {formatQty(row.closing_qty)}
                          {uom && <span className="ml-1 text-xs text-gray-400 dark:text-gray-500 uppercase font-normal">{uom}</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab !== "daily" && pagination.totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>
              Menampilkan Halaman {pagination.page} dari {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-50 hover:bg-gray-50 dark:border-white/[0.05] dark:hover:bg-white/[0.03] text-gray-700 dark:text-gray-300 font-semibold transition-colors"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-50 hover:bg-gray-50 dark:border-white/[0.05] dark:hover:bg-white/[0.03] text-gray-700 dark:text-gray-300 font-semibold transition-colors"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </ComponentCard>

      <Modal isOpen={isModalOpen} onClose={closeMovementModal} className="max-w-md">
        <form onSubmit={handleSubmitMovement} className="p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            {modalMode === "issue" ? "Catat Pemakaian Stok" : "Penyesuaian Stok"}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {modalMode === "issue"
              ? "Kurangi stok karena pemakaian operasional."
              : "Koreksi stok setelah opname atau koreksi data."}
          </p>

          {formError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-xs font-semibold text-red-600 dark:text-red-400">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unit Kerja *</label>
              <Select
                value={formUnitId}
                disabled={isFormUnitLocked}
                onChange={(v) => {
                  setFormUnitId(String(v));
                  setFormProductId("");
                  setFormCategoryId("");
                }}
                required
                placeholder="Pilih unit kerja..."
                allowEmpty={!isFormUnitLocked}
                emptyLabel="Pilih unit kerja..."
                options={units.map((u) => ({ value: u.id, label: u.name }))}
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Produk *</label>
              <Select
                value={formProductId}
                onChange={(v) => {
                  setFormProductId(String(v));
                  setFormCategoryId("");
                }}
                disabled={!formUnitId}
                required
                placeholder="Pilih produk..."
                allowEmpty
                emptyLabel="Pilih produk..."
                options={scopedProducts.map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kategori *</label>
              <Select
                value={formCategoryId}
                onChange={(v) => setFormCategoryId(String(v))}
                disabled={
                  !formUnitId ||
                  !formProductId ||
                  isFormCategoryLocked ||
                  isLoadingFormCategories ||
                  isFormCategoryFromRow
                }
                required
                placeholder={isLoadingFormCategories ? "Memuat kategori..." : "Pilih kategori..."}
                allowEmpty={!isFormCategoryLocked && !isFormCategoryFromRow}
                emptyLabel={isLoadingFormCategories ? "Memuat kategori..." : "Pilih kategori..."}
                options={formCategories.map((c) => ({ value: c.id, label: c.name }))}
              />
              {!isFormCategoryFromRow &&
                !isLoadingFormCategories &&
                formProductId &&
                formUnitId &&
                formCategories.length === 0 && (
                <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                  Produk belum memiliki kategori atau stok pada unit ini. Atur kategori di menu Produk terlebih dahulu.
                </p>
              )}
            </div>

            {modalMode === "adjustment" && (
              <div className="flex flex-col">
                <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Arah Penyesuaian *</label>
                <Select
                  value={formDirection}
                  onChange={(v) => setFormDirection(v as "in" | "out")}
                  options={[
                    { value: "in", label: "Tambah stok (+)" },
                    { value: "out", label: "Kurangi stok (-)" },
                  ]}
                />
              </div>
            )}

            {formProductId && formUnitId && formCategoryId && (
              <div className="rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05] p-3 text-xs flex justify-between items-center">
                <span className="font-semibold text-gray-500 dark:text-gray-400">Stok Saat Ini:</span>
                <span className="font-bold text-gray-800 dark:text-white text-sm">
                  {formatQty(currentStockRow?.qty_on_hand || 0)} {formProductUom}
                </span>
              </div>
            )}

            <div className="flex flex-col">
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Kuantitas * {formProductUom && <span className="text-brand-500 lowercase font-medium">({formProductUom})</span>}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  required
                  value={formQty}
                  onChange={(e) => setFormQty(e.target.value)}
                  className={`h-10 w-full rounded-lg border border-gray-200 bg-white text-sm transition-all focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white ${formProductUom ? "pr-14 pl-3" : "px-3"}`}
                  placeholder="1"
                />
                {formProductUom && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase pointer-events-none">
                    {formProductUom}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Catatan</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-all focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white"
                placeholder="Tulis alasan pemakaian atau penyesuaian stok..."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={closeMovementModal}
              className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/[0.05] dark:text-gray-300 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-xs"
            >
              Simpan Mutasi
            </button>
          </div>
        </form>
      </Modal>

      <LoadingModal isOpen={isSubmitting || isExportingDaily} />
    </>
  );
}

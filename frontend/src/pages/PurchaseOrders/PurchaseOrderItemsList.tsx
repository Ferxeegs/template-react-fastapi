import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import {
  categoryAPI,
  purchaseOrderAPI,
  type Category,
  type PurchaseOrderItemListRow,
} from "../../utils/api";
import { EyeIcon, TableIcon } from "../../icons";
import {
  formatDateTime,
  formatIdr,
  formatQty,
  formatShortDate,
} from "../PurchaseRequisitions/prUtils";
import { LoadingModal } from "../../components/ui/modal";
import { Select } from "../../components/ui/Select";
import CalendarDatePicker from "../../components/ui/CalendarDatePicker";
import { useToast } from "../../context/ToastContext";

export default function PurchaseOrderItemsList() {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();
  const [items, setItems] = useState<PurchaseOrderItemListRow[]>([]);
  const [deliveryStatuses, setDeliveryStatuses] = useState<Array<{ id: number; name: string }>>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<Array<{ id: number; name: string }>>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, deliveryFilter, paymentFilter, categoryFilter, dateFrom, dateTo]);

  useEffect(() => {
    const loadFilters = async () => {
      const [d, p, c] = await Promise.all([
        purchaseOrderAPI.getDeliveryStatuses(),
        purchaseOrderAPI.getPaymentStatuses(),
        categoryAPI.getAllCategories({ all: true }),
      ]);
      if (d.success && d.data) setDeliveryStatuses(d.data.delivery_statuses);
      if (p.success && p.data) setPaymentStatuses(p.data.payment_statuses);
      if (c.success && c.data) setCategories(c.data.categories);
    };
    loadFilters();
  }, []);

  const fetchItems = async (forceLoading = false) => {
    if (forceLoading || items.length === 0) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const res = await purchaseOrderAPI.getItems({
        page,
        limit: 10,
        search: debouncedSearch.trim() || undefined,
        delivery_status_id: deliveryFilter ? Number(deliveryFilter) : undefined,
        payment_status_id: paymentFilter ? Number(paymentFilter) : undefined,
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      if (res.success && res.data) {
        setItems(res.data.purchase_order_items);
        if (res.data.pagination) setPagination(res.data.pagination);
      } else {
        setError(res.message || "Gagal mengambil data item PO");
      }
    } catch {
      setError("Terjadi kesalahan saat mengambil data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [page, debouncedSearch, deliveryFilter, paymentFilter, categoryFilter, dateFrom, dateTo]);

  const exportParams = () => ({
    search: debouncedSearch.trim() || undefined,
    delivery_status_id: deliveryFilter ? Number(deliveryFilter) : undefined,
    payment_status_id: paymentFilter ? Number(paymentFilter) : undefined,
    category_id: categoryFilter ? Number(categoryFilter) : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await purchaseOrderAPI.exportItems(exportParams());
      if (res.success) {
        showSuccess("Daftar item PO berhasil diekspor");
      } else {
        showError(res.message || "Gagal mengekspor daftar item PO");
      }
    } catch {
      showError("Terjadi kesalahan saat mengunduh laporan");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const res = await purchaseOrderAPI.exportItemsPdf(exportParams());
      if (res.success) {
        showSuccess("Laporan PDF berhasil diunduh");
      } else {
        showError(res.message || "Gagal mengunduh laporan PDF");
      }
    } catch {
      showError("Terjadi kesalahan saat mengunduh laporan");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3 flex-1 w-full">
          <div className="flex flex-col w-full sm:w-[240px]">
            <label className="mb-1 block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Cari PO
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nomor PO..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-200 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
              <svg
                className="absolute -translate-y-1/2 left-3.5 top-1/2 fill-gray-500 dark:fill-gray-400"
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                />
              </svg>
            </div>
          </div>

          <div className="flex flex-col w-full sm:w-[180px]">
            <label className="mb-1 block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Pengiriman
            </label>
            <Select
              size="sm"
              value={deliveryFilter}
              onChange={(v) => setDeliveryFilter(String(v))}
              placeholder="Semua Pengiriman"
              allowEmpty
              emptyLabel="Semua Pengiriman"
              options={deliveryStatuses.map((s) => ({ value: s.id, label: s.name }))}
            />
          </div>

          <div className="flex flex-col w-full sm:w-[180px]">
            <label className="mb-1 block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Pembayaran
            </label>
            <Select
              size="sm"
              value={paymentFilter}
              onChange={(v) => setPaymentFilter(String(v))}
              placeholder="Semua Pembayaran"
              allowEmpty
              emptyLabel="Semua Pembayaran"
              options={paymentStatuses.map((s) => ({ value: s.id, label: s.name }))}
            />
          </div>

          <div className="flex flex-col w-full sm:w-[180px]">
            <label className="mb-1 block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Kategori
            </label>
            <Select
              size="sm"
              value={categoryFilter}
              onChange={(v) => setCategoryFilter(String(v))}
              placeholder="Semua Kategori"
              allowEmpty
              emptyLabel="Semua Kategori"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>

          <div className="flex flex-col w-full sm:w-[140px]">
            <label className="mb-1 block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Dari Tanggal
            </label>
            <CalendarDatePicker
              value={dateFrom}
              onChange={(dateStr) => setDateFrom(dateStr)}
            />
          </div>

          <div className="flex flex-col w-full sm:w-[140px]">
            <label className="mb-1 block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Sampai Tanggal
            </label>
            <CalendarDatePicker
              value={dateTo}
              onChange={(dateStr) => setDateTo(dateStr)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between lg:justify-end shrink-0 gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || isExportingPdf || isLoading}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-gray-300 transition-colors shadow-xs"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M4 12V7a2 2 0 012-2h3m10 0h3a2 2 0 012 2v5" />
            </svg>
            {isExporting ? "Mengekspor..." : "Export Excel"}
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting || isExportingPdf || isLoading}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300 transition-colors shadow-xs"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {isExportingPdf ? "Mengekspor..." : "Export PDF"}
          </button>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 shrink-0">
            Total: <span className="font-semibold text-gray-800 dark:text-white">{pagination.total}</span> item
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-white/[0.01]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 mb-4">
            <TableIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Belum ada item PO</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs text-center">
            {search || deliveryFilter || paymentFilter || categoryFilter || dateFrom || dateTo
              ? "Tidak ada item PO yang cocok dengan kriteria pencarian Anda."
              : "Belum ada item pada purchase order."}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <Table className="min-w-[1400px] w-full table-fixed border-collapse">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[130px]">No. PO</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[130px]">No. PR</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[180px]">Vendor</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[220px]">Nama Item</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[140px]">Kategori</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[80px]">Qty</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[80px]">Satuan</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[120px]">Harga</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[120px]">Total</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[110px]">Pengiriman</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[110px]">Pembayaran</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[130px]">Tgl. PO</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[70px]">Aksi</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest("a") || target.closest("button")) return;
                        navigate(`/purchase-orders/${item.po_id}`);
                      }}
                    >
                      <TableCell className="px-5 py-4 font-semibold text-gray-800 dark:text-white/90">{item.po_number}</TableCell>
                      <TableCell className="px-5 py-4 text-left text-sm text-gray-600 dark:text-gray-300">
                        {item.pr_id ? (
                          <Link
                            to={`/purchase-requisitions/${item.pr_id}`}
                            className="text-brand-500 hover:underline"
                          >
                            {item.pr_number || item.pr_id.slice(0, 8)}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-left text-sm text-gray-600 dark:text-gray-300 truncate" title={item.vendor_name || ""}>
                        {item.vendor_name || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-left text-sm text-gray-800 dark:text-white/90">{item.product_name}</TableCell>
                      <TableCell className="px-5 py-4 text-left text-sm text-gray-600 dark:text-gray-300">{item.category_name || "-"}</TableCell>
                      <TableCell className="px-5 py-4 text-right text-sm text-gray-600 dark:text-gray-300">{formatQty(item.real_qty)}</TableCell>
                      <TableCell className="px-5 py-4 text-center text-sm text-gray-600 dark:text-gray-300">{item.uom || "-"}</TableCell>
                      <TableCell className="px-5 py-4 text-right text-sm text-gray-600 dark:text-gray-300">{formatIdr(item.real_price)}</TableCell>
                      <TableCell className="px-5 py-4 text-right text-sm font-semibold text-brand-600 dark:text-brand-400">{formatIdr(item.real_total)}</TableCell>
                      <TableCell className="px-5 py-4 text-center">
                        {item.delivery_status ? (
                          <Badge color="info" size="sm">{item.delivery_status.name}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center">
                        {item.payment_status ? (
                          <Badge color="warning" size="sm">{item.payment_status.name}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-left text-sm text-gray-500 dark:text-gray-400">
                        {formatDateTime(item.po_created_at)}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center">
                        <Link
                          to={`/purchase-orders/${item.po_id}`}
                          className="p-1.5 text-gray-500 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors inline-flex"
                          title="Lihat PO"
                        >
                          <EyeIcon className="w-4.5 h-4.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-white rounded-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700 space-y-2 cursor-pointer"
                onClick={() => navigate(`/purchase-orders/${item.po_id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white">{item.po_number}</p>
                    <p className="text-sm text-gray-800 dark:text-white/90 mt-1">{item.product_name}</p>
                    <p className="text-xs text-gray-500 mt-1">Vendor: {item.vendor_name || "-"}</p>
                    <p className="text-xs text-gray-500">Kategori: {item.category_name || "-"}</p>
                  </div>
                  <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">{formatIdr(item.real_total)}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                  <span>Qty: {formatQty(item.real_qty)} {item.uom || ""}</span>
                  <span>•</span>
                  <span>{formatShortDate(item.po_created_at)}</span>
                </div>
                <div className="flex gap-2">
                  {item.delivery_status && <Badge color="info" size="sm">{item.delivery_status.name}</Badge>}
                  {item.payment_status && <Badge color="warning" size="sm">{item.payment_status.name}</Badge>}
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4">
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
                Menampilkan {((page - 1) * pagination.limit) + 1} - {Math.min(page * pagination.limit, pagination.total)} dari {pagination.total} item
              </div>
              <div className="flex gap-2 justify-center sm:justify-end">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <LoadingModal isOpen={isLoading || isExporting || isExportingPdf} />
    </div>
  );
}

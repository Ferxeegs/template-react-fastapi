import { useEffect, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
// import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import { purchaseOrderAPI, unitAPI, type PrPoPriceVarianceRow } from "../../utils/api";
import { formatIdr, formatQty } from "../PurchaseRequisitions/prUtils";
import { LoadingModal } from "../../components/ui/modal";
import { Select } from "../../components/ui/Select";
import { ChevronLeftIcon } from "../../icons";
import { useToast } from "../../context/ToastContext";
import CalendarDatePicker from "../../components/ui/CalendarDatePicker";

export default function PoPriceVarianceReport() {
  const { success: showSuccess, error: showError } = useToast();
  const [rows, setRows] = useState<PrPoPriceVarianceRow[]>([]);
  const [units, setUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [onlyVariance, setOnlyVariance] = useState(true);
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, unitFilter, onlyVariance, unpaidOnly, dateFrom, dateTo]);

  useEffect(() => {
    unitAPI.getAllUnits({ all: true }).then((res) => {
      if (res.success && res.data) setUnits(res.data.units);
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await purchaseOrderAPI.getPriceVarianceReport({
          page,
          limit: 20,
          search: debouncedSearch.trim() || undefined,
          unit_id: unitFilter || undefined,
          only_variance: onlyVariance,
          unpaid_only: unpaidOnly,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        });
        if (res.success && res.data) {
          setRows(res.data.rows);
          if (res.data.pagination) setPagination(res.data.pagination);
        }
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [page, debouncedSearch, unitFilter, onlyVariance, unpaidOnly, dateFrom, dateTo]);

  const varianceClass = (v: number) =>
    v > 0
      ? "text-red-600 dark:text-red-400 font-semibold"
      : v < 0
        ? "text-emerald-600 dark:text-emerald-400 font-semibold"
        : "text-gray-500";

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await purchaseOrderAPI.exportPriceVarianceReport({
        search: debouncedSearch.trim() || undefined,
        unit_id: unitFilter || undefined,
        only_variance: onlyVariance,
        unpaid_only: unpaidOnly,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      if (res.success) {
        showSuccess("Laporan Excel berhasil diunduh");
      } else {
        showError(res.message || "Gagal mengunduh laporan Excel");
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
      const res = await purchaseOrderAPI.exportPriceVarianceReportPdf({
        search: debouncedSearch.trim() || undefined,
        unit_id: unitFilter || undefined,
        only_variance: onlyVariance,
        unpaid_only: unpaidOnly,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
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
    <>
      <PageMeta title="Laporan Selisih Harga PR vs PO" description="Perbandingan harga PR dan PO" />
      {/* <PageBreadcrumb pageTitle="Laporan Selisih Harga" /> */}

      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Laporan Harga PR vs PO</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Bandingkan harga pengajuan PR dengan harga aktual di PO, termasuk revisi Finance sebelum pembayaran.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || isExportingPdf}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-gray-300 transition-colors shadow-xs"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M4 12V7a2 2 0 012-2h3m10 0h3a2 2 0 012 2v5" />
            </svg>
            {isExporting ? "Mengekspor..." : "Export Excel"}
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting || isExportingPdf}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300 transition-colors shadow-xs"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {isExportingPdf ? "Mengekspor..." : "Export PDF"}
          </button>
          <Link
            to="/purchase-orders"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-gray-300 transition-colors shadow-xs"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Kembali ke Daftar PO
          </Link>
        </div>
      </div>

      <ComponentCard title="Filter Pencarian & Kriteria" className="mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Cari PR / PO</label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nomor PR atau PO..."
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white transition-all"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Unit Pemohon</label>
            <Select
              value={unitFilter}
              onChange={(v) => setUnitFilter(String(v))}
              placeholder="Semua Unit"
              allowEmpty
              emptyLabel="Semua Unit"
              options={units.map((u) => ({ value: u.id, label: u.name }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Dari Tanggal</label>
            <CalendarDatePicker
              value={dateFrom}
              onChange={(dateStr) => setDateFrom(dateStr)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Sampai Tanggal</label>
            <CalendarDatePicker
              value={dateTo}
              onChange={(dateStr) => setDateTo(dateStr)}
            />
          </div>
          <div className="flex items-center pt-2 md:pt-6">
            <label className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyVariance}
                onChange={(e) => setOnlyVariance(e.target.checked)}
                className="w-4 h-4 rounded-md border-gray-300 dark:border-white/[0.08] text-brand-600 focus:ring-brand-500/25 dark:bg-white/[0.02]"
              />
              <span className="font-medium">Hanya Selisih Harga</span>
            </label>
          </div>
          <div className="flex items-center pt-2 md:pt-6">
            <label className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={unpaidOnly}
                onChange={(e) => setUnpaidOnly(e.target.checked)}
                className="w-4 h-4 rounded-md border-gray-300 dark:border-white/[0.08] text-brand-600 focus:ring-brand-500/25 dark:bg-white/[0.02]"
              />
              <span className="font-medium">Hanya Belum Lunas</span>
            </label>
          </div>
        </div>
      </ComponentCard>

      <ComponentCard title="Data Perbandingan Harga" className="mt-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">Tidak ada data perbandingan harga.</p>
        ) : (
          <div className="space-y-4">
            {/* Desktop View */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-gray-100 dark:border-white/[0.05]">
              <Table>
                <TableHeader className="bg-gray-50/50 dark:bg-white/[0.02]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">PO / PR</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Produk</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unit / Vendor</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qty</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Harga PR</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Harga PO Awal</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Harga PO Saat Ini</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Selisih vs PR</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status & Pembayaran</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {rows.map((row) => (
                    <TableRow key={row.purchase_item_id} className="hover:bg-gray-50/55 dark:hover:bg-white/[0.01]">
                      <TableCell className="px-5 py-4 text-sm align-middle">
                        <Link to={`/purchase-orders/${row.po_id}`} className="font-semibold text-brand-600 hover:text-brand-700 hover:underline block">
                          {row.po_number}
                        </Link>
                        {row.pr_number && (
                          <p className="text-xs text-gray-400 dark:text-gray-550 mt-1">
                            PR:{" "}
                            <Link to={`/purchase-requisitions/${row.pr_id}`} className="hover:text-brand-500 hover:underline">
                              {row.pr_number}
                            </Link>
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm font-semibold text-gray-800 dark:text-white/95 align-middle">{row.product_name}</TableCell>
                      <TableCell className="px-5 py-4 text-xs align-middle">
                        <p className="font-medium text-gray-700 dark:text-gray-300">{row.unit_name || "-"}</p>
                        <p className="text-gray-400 mt-0.5">{row.vendor_name || "-"}</p>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 align-middle">{formatQty(row.real_qty)}</TableCell>
                      <TableCell className="px-5 py-4 text-right text-sm text-gray-700 dark:text-gray-300 align-middle">{formatIdr(row.pr_request_price)}</TableCell>
                      <TableCell className="px-5 py-4 text-right text-sm text-gray-405 dark:text-gray-500 align-middle">{formatIdr(row.original_po_price)}</TableCell>
                      <TableCell className="px-5 py-4 text-right text-sm font-bold text-gray-800 dark:text-white align-middle">{formatIdr(row.current_po_price)}</TableCell>
                      <TableCell className={`px-5 py-4 text-right text-sm align-middle ${varianceClass(Number(row.price_variance))}`}>
                        {Number(row.price_variance) > 0 ? "+" : ""}
                        {formatIdr(row.price_variance)}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center align-middle">
                        <div className="flex flex-col items-center gap-1.5">
                          {row.payment_status && (
                            <Badge color={row.payment_status === "Lunas" ? "success" : "warning"} size="sm">
                              {row.payment_status}
                            </Badge>
                          )}
                          <div className="flex justify-center gap-1 flex-wrap">
                            {row.has_price_change && (
                              <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30">
                                Revisi PO
                              </span>
                            )}
                            {row.differs_from_pr && (
                              <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                                ≠ PR
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden space-y-3">
              {rows.map((row) => (
                <div
                  key={row.purchase_item_id}
                  className="p-4 bg-white dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.05] space-y-3.5 shadow-xs"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-gray-100 dark:border-white/[0.05] pb-2.5">
                    <div>
                      <Link to={`/purchase-orders/${row.po_id}`} className="font-bold text-brand-600 hover:underline text-sm block">
                        {row.po_number}
                      </Link>
                      {row.pr_number && (
                        <span className="text-[11px] text-gray-400 mt-0.5 block">
                          PR:{" "}
                          <Link to={`/purchase-requisitions/${row.pr_id}`} className="hover:underline font-medium text-gray-500 dark:text-gray-400">
                            {row.pr_number}
                          </Link>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {row.payment_status && (
                        <Badge color={row.payment_status === "Lunas" ? "success" : "warning"} size="sm">
                          {row.payment_status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="space-y-1">
                    <h4 className="font-semibold text-gray-850 dark:text-white/90 text-sm">
                      {row.product_name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {row.unit_name || "-"} <span className="mx-1 text-gray-300">•</span> <span className="text-gray-400">{row.vendor_name || "-"}</span>
                    </p>
                  </div>

                  {/* Pricing Comparison Grid */}
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs bg-gray-50/50 dark:bg-white/[0.01] p-3 rounded-lg border border-gray-100 dark:border-white/[0.03]">
                    <div>
                      <span className="text-gray-400 dark:text-gray-500 block uppercase text-[9px] font-bold tracking-wider mb-0.5">Kuantitas</span>
                      <span className="font-bold text-gray-700 dark:text-gray-300">{formatQty(row.real_qty)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-gray-500 block uppercase text-[9px] font-bold tracking-wider mb-0.5">Selisih vs PR</span>
                      <span className={`font-bold text-sm ${varianceClass(Number(row.price_variance))}`}>
                        {Number(row.price_variance) > 0 ? "+" : ""}
                        {formatIdr(row.price_variance)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-gray-500 block uppercase text-[9px] font-bold tracking-wider mb-0.5">Harga PR</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{formatIdr(row.pr_request_price)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-gray-500 block uppercase text-[9px] font-bold tracking-wider mb-0.5">Harga PO Saat Ini</span>
                      <span className="font-bold text-gray-850 dark:text-white">{formatIdr(row.current_po_price)}</span>
                      {Number(row.original_po_price) !== Number(row.current_po_price) && (
                        <span className="text-[10px] text-gray-400 line-through block mt-0.5">
                          {formatIdr(row.original_po_price)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Indicator Badges */}
                  <div className="flex gap-1.5 flex-wrap">
                    {row.has_price_change && (
                      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30">
                        Revisi PO (Finance)
                      </span>
                    )}
                    {row.differs_from_pr && (
                      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                        Beda Harga dengan PR
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between text-xs text-gray-400 dark:text-gray-550 border-t border-gray-100 pt-4 dark:border-white/[0.05]">
            <span>
              Menampilkan Halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} item)
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

      <LoadingModal isOpen={isLoading && rows.length === 0} />
    </>
  );
}

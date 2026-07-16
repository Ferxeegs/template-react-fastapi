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
  purchaseRequisitionAPI,
  type PurchaseRequisition,
} from "../../utils/api";
import { EyeIcon, PencilIcon, TrashBinIcon, PlusIcon, PaperPlaneIcon, TableIcon } from "../../icons";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ConfirmModal, LoadingModal } from "../../components/ui/modal";
import { Select } from "../../components/ui/Select";
import CalendarDatePicker from "../../components/ui/CalendarDatePicker";
import {
  PR_STATUS_COLORS,
  PR_STATUS_LABELS,
  formatDateTime,
  formatIdr,
} from "./prUtils";

export default function PurchaseRequisitionsList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [deleteTarget, setDeleteTarget] = useState<PurchaseRequisition | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [submitTarget, setSubmitTarget] = useState<PurchaseRequisition | null>(null);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const canCreate = hasPermission("create_purchase_requisition");
  const canUpdate = hasPermission("update_purchase_requisition");
  const canDelete = hasPermission("delete_purchase_requisition");
  const canSubmit = hasPermission("submit_purchase_requisition");
  const canApprove = hasPermission("approve_purchase_requisition");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, pendingOnly, dateFrom, dateTo]);

  const fetchPrs = async (forceLoading = false) => {
    if (forceLoading || prs.length === 0) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const res = await purchaseRequisitionAPI.getAll({
        page,
        limit: 10,
        search: debouncedSearch.trim() || undefined,
        approval_status: statusFilter || undefined,
        pending_approval: pendingOnly || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      if (res.success && res.data) {
        setPrs(res.data.purchase_requisitions);
        if (res.data.pagination) setPagination(res.data.pagination);
      } else {
        setError(res.message || "Gagal mengambil data PR");
      }
    } catch {
      setError("Terjadi kesalahan saat mengambil data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrs();
  }, [page, debouncedSearch, statusFilter, pendingOnly, dateFrom, dateTo]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await purchaseRequisitionAPI.exportAll({
        search: debouncedSearch.trim() || undefined,
        approval_status: statusFilter || undefined,
        pending_approval: pendingOnly || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      if (res.success) {
        showSuccess("Daftar PR berhasil diekspor");
      } else {
        showError(res.message || "Gagal mengekspor daftar PR");
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
      const res = await purchaseRequisitionAPI.exportAllPdf({
        search: debouncedSearch.trim() || undefined,
        approval_status: statusFilter || undefined,
        pending_approval: pendingOnly || undefined,
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleteLoading(true);
    try {
      const res = await purchaseRequisitionAPI.delete(deleteTarget.id);
      if (res.success) {
        showSuccess("PR berhasil dihapus");
        setDeleteTarget(null);
        fetchPrs(true);
      } else {
        showError(res.message || "Gagal menghapus PR");
      }
    } catch {
      showError("Terjadi kesalahan saat menghapus PR");
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!submitTarget) return;
    setIsSubmitLoading(true);
    try {
      const res = await purchaseRequisitionAPI.submit(submitTarget.id);
      if (res.success) {
        showSuccess(res.message || "PR berhasil disubmit");
        setSubmitTarget(null);
        fetchPrs(true);
      } else {
        showError(res.message || "Gagal submit PR");
      }
    } catch {
      showError("Terjadi kesalahan saat submit PR");
    } finally {
      setIsSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3 flex-1 w-full">
          <div className="flex flex-col w-full sm:w-[240px]">
            <label className="mb-1 block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Cari PR
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nomor PR..."
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
              Status
            </label>
            <Select
              size="sm"
              value={statusFilter}
              onChange={(v) => setStatusFilter(String(v))}
              placeholder="Semua Status"
              allowEmpty
              emptyLabel="Semua Status"
              options={Object.entries(PR_STATUS_LABELS).map(([k, v]) => ({
                value: k,
                label: v,
              }))}
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

          {canApprove && (
            <label className="flex items-center gap-2.5 h-10 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={pendingOnly}
                onChange={(e) => setPendingOnly(e.target.checked)}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 size-4 dark:border-gray-800 dark:bg-gray-900"
              />
              <span>Menunggu approval saya</span>
            </label>
          )}
        </div>

        <div className="flex items-center justify-between lg:justify-end shrink-0 gap-2 flex-wrap">
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
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Total: <span className="font-semibold text-gray-800 dark:text-white">{pagination.total}</span> PR
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={() => navigate("/purchase-requisitions/create")}
              className="inline-flex h-10 items-center justify-center gap-1.5 px-4 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors shadow-theme-xs"
            >
              <PlusIcon className="w-4 h-4" />
              Buat Pengajuan
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
          {error}
        </div>
      )}

      {prs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-white/[0.01]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 mb-4">
            <TableIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Belum ada pengajuan</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs text-center">
            {search || statusFilter || pendingOnly || dateFrom || dateTo
              ? "Tidak ada pengajuan pengadaan yang cocok dengan kriteria pencarian Anda."
              : "Silakan buat pengajuan pengadaan baru dengan mengklik tombol Buat Pengajuan."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <Table className="min-w-[1130px] w-full table-fixed border-collapse">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[180px]">
                      No. PR
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[200px]">
                      Unit
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[120px]">
                      Tipe
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[160px]">
                      Total Nilai
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[160px]">
                      Status
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[170px]">
                      Dibuat
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[140px]">
                      Aksi
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {prs.map((pr) => (
                    <TableRow
                      key={pr.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest("a") || target.closest("button")) {
                          return;
                        }
                        navigate(`/purchase-requisitions/${pr.id}`);
                      }}
                    >
                      <TableCell className="px-5 py-4 font-semibold text-gray-800 dark:text-white/90">
                        {pr.pr_number}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-left text-sm text-gray-600 dark:text-gray-300">
                        {pr.unit?.name || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                        {pr.purchase_type?.name || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right text-sm font-semibold text-brand-600 dark:text-brand-400">
                        {formatIdr(pr.total_amount || 0)}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center">
                        <Badge
                          color={PR_STATUS_COLORS[pr.approval_status] || "light"}
                          size="sm"
                        >
                          {PR_STATUS_LABELS[pr.approval_status] || pr.approval_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-left text-sm text-gray-500 dark:text-gray-400">
                        {formatDateTime(pr.created_at)}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            to={`/purchase-requisitions/${pr.id}`}
                            className="p-1.5 text-gray-500 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            title="Lihat Rincian"
                          >
                            <EyeIcon className="w-4.5 h-4.5" />
                          </Link>
                          {pr.approval_status === "draft" && canUpdate && (
                            <Link
                              to={`/purchase-requisitions/${pr.id}/edit`}
                              className="p-1.5 text-gray-500 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="w-4.5 h-4.5" />
                            </Link>
                          )}
                          {pr.approval_status === "draft" && canSubmit && (
                            <button
                              type="button"
                              onClick={() => setSubmitTarget(pr)}
                              className="p-1.5 text-gray-500 hover:text-success-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                              title="Submit PR"
                            >
                              <PaperPlaneIcon className="w-4.5 h-4.5" />
                            </button>
                          )}
                          {pr.approval_status === "draft" && canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(pr)}
                              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                              title="Hapus"
                            >
                              <TrashBinIcon className="w-4.5 h-4.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {prs.map((pr) => (
              <div
                key={pr.id}
                className="p-4 bg-white rounded-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700 space-y-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("a") || target.closest("button")) {
                    return;
                  }
                  navigate(`/purchase-requisitions/${pr.id}`);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white/90 text-base">
                      {pr.pr_number}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Unit: {pr.unit?.name || "-"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Tipe: {pr.purchase_type?.name || "-"}
                    </p>
                    <p className="text-sm font-semibold text-brand-600 dark:text-brand-400 mt-1.5">
                      Total: {formatIdr(pr.total_amount || 0)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">
                      Dibuat: {formatDateTime(pr.created_at)}
                    </p>
                  </div>
                  <Badge color={PR_STATUS_COLORS[pr.approval_status] || "light"} size="sm">
                    {PR_STATUS_LABELS[pr.approval_status] || pr.approval_status}
                  </Badge>
                </div>
                
                <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <Link
                    to={`/purchase-requisitions/${pr.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <EyeIcon className="w-3.5 h-3.5" />
                    Detail
                  </Link>
                  {pr.approval_status === "draft" && canUpdate && (
                    <Link
                      to={`/purchase-requisitions/${pr.id}/edit`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-755 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <PencilIcon className="w-3.5 h-3.5" />
                      Edit
                    </Link>
                  )}
                  {pr.approval_status === "draft" && canSubmit && (
                    <button
                      type="button"
                      onClick={() => setSubmitTarget(pr)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-success-500 hover:bg-success-600 rounded-lg transition-colors"
                    >
                      <PaperPlaneIcon className="w-3.5 h-3.5" />
                      Submit
                    </button>
                  )}
                  {pr.approval_status === "draft" && canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(pr)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                    >
                      <TrashBinIcon className="w-3.5 h-3.5" />
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4">
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
                Menampilkan {((page - 1) * pagination.limit) + 1} - {Math.min(page * pagination.limit, pagination.total)} dari {pagination.total} PR
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

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus PR"
        message={`Yakin ingin menghapus ${deleteTarget?.pr_number}?`}
        confirmText="Hapus"
        isLoading={isDeleteLoading}
      />

      <ConfirmModal
        isOpen={!!submitTarget}
        onClose={() => setSubmitTarget(null)}
        onConfirm={handleSubmit}
        title="Submit PR"
        message={`Submit ${submitTarget?.pr_number} untuk approval Brand Manager?`}
        confirmText="Submit"
        isLoading={isSubmitLoading}
      />

      <LoadingModal isOpen={isLoading || isDeleteLoading || isSubmitLoading || isExporting || isExportingPdf} />
    </div>
  );
}

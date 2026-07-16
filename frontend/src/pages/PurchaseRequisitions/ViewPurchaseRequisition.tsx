import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
// import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  purchaseRequisitionAPI,
  purchaseOrderAPI,
  type PurchaseRequisition,
} from "../../utils/api";
import { AngleLeftIcon, PencilIcon, PaperPlaneIcon, CheckLineIcon, CloseLineIcon } from "../../icons";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ConfirmModal, LoadingModal } from "../../components/ui/modal";
import {
  PR_STATUS_COLORS,
  PR_STATUS_LABELS,
  formatDateTime,
  formatIdr,
  formatQty,
  formatShortDate,
} from "./prUtils";
import PrApprovalTimeline from "./PrApprovalTimeline";

export default function ViewPurchaseRequisition() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  const canViewPo = hasPermission("view_purchase_order");
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [exportingPoId, setExportingPoId] = useState<string | null>(null);

  const [pr, setPr] = useState<PurchaseRequisition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"submit" | "approve" | "reject" | null>(null);
  const [actionNote, setActionNote] = useState("");

  const loadPr = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await purchaseRequisitionAPI.getById(id);
      if (res.success && res.data) {
        setPr(res.data);
      } else {
        setError(res.message || "Gagal memuat PR");
      }
    } catch {
      setError("Terjadi kesalahan saat memuat PR");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPr();
  }, [id]);

  const runAction = async () => {
    if (!pr || !confirmAction) return;
    setActionLoading(true);
    try {
      let res;
      if (confirmAction === "submit") {
        res = await purchaseRequisitionAPI.submit(pr.id);
      } else if (confirmAction === "approve") {
        res = await purchaseRequisitionAPI.approve(pr.id, actionNote);
      } else {
        res = await purchaseRequisitionAPI.reject(pr.id, actionNote);
      }
      if (res.success && res.data) {
        showSuccess(res.message || "Berhasil");
        setPr(res.data);
        setConfirmAction(null);
        setActionNote("");
      } else {
        showError(res.message || "Gagal memproses aksi");
      }
    } catch {
      showError("Terjadi kesalahan");
    } finally {
      setActionLoading(false);
    }
  };

  const poPdfFilename = (poNumber: string, vendorName?: string) => {
    const vendor = (vendorName || "vendor")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 40);
    const safePo = poNumber.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-|-$/g, "");
    return safePo.toUpperCase().startsWith("PO-")
      ? `${safePo}-${vendor || "vendor"}.pdf`
      : `PO-${safePo}-${vendor || "vendor"}.pdf`;
  };

  const handleExportPoPdf = async (poId: string, poNumber: string, vendorName?: string) => {
    setExportingPoId(poId);
    try {
      const res = await purchaseOrderAPI.downloadPdf(poId, poPdfFilename(poNumber, vendorName));
      if (res.success) {
        showSuccess("PDF PO berhasil diunduh");
      } else {
        showError(res.message || "Gagal mengunduh PDF PO");
      }
    } catch {
      showError("Terjadi kesalahan saat mengunduh PDF");
    } finally {
      setExportingPoId(null);
    }
  };

  const handleExportAllPoPdfs = async () => {
    if (!pr) return;
    setIsExportingZip(true);
    try {
      const safePr = pr.pr_number.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-|-$/g, "");
      const res = await purchaseRequisitionAPI.downloadPoPdfsZip(
        pr.id,
        `PO-${safePr}-semua-vendor.zip`,
      );
      if (res.success) {
        showSuccess("Semua PDF PO berhasil diunduh");
      } else {
        showError(res.message || "Gagal mengunduh arsip PDF PO");
      }
    } catch {
      showError("Terjadi kesalahan saat mengunduh arsip PDF");
    } finally {
      setIsExportingZip(false);
    }
  };

  const confirmMessages = {
    submit: `Submit ${pr?.pr_number} untuk approval Brand Manager?`,
    approve:
      pr?.approval_status === "pending_finance"
        ? `Setujui ${pr?.pr_number}? PO akan dibuat otomatis per vendor.`
        : `Setujui ${pr?.pr_number} dan lanjutkan ke Finance?`,
    reject: `Tolak pengajuan ${pr?.pr_number}?`,
  };

  const confirmTitles = {
    submit: "Submit PR",
    approve: "Setujui PR",
    reject: "Tolak PR",
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-500"></div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 font-medium">Memuat data Purchase Requisition...</p>
      </div>
    );
  }

  if (error || !pr) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 mb-4">
          <CloseLineIcon className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">PR Tidak Ditemukan</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">{error || "Data Permintaan Pembelian tidak dapat ditemukan atau telah dihapus."}</p>
        <button
          onClick={() => navigate("/purchase-requisitions")}
          className="mt-6 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-750 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors shadow-theme-xs"
        >
          <AngleLeftIcon className="w-4 h-4" />
          Kembali ke Daftar
        </button>
      </div>
    );
  }

  const itemsTotal = (pr.items || []).reduce(
    (s, it) => s + Number(it.request_total),
    0
  );

  return (
    <>
      <PageMeta title={`${pr.pr_number}`} description="Detail permintaan pembelian" />
      {/* <PageBreadcrumb pageTitle={pr.pr_number} /> */}

      {/* Main Header / Top Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/purchase-requisitions")}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-750 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors shadow-theme-xs"
            title="Kembali"
          >
            <AngleLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
              {pr.pr_number}
              <Badge color={PR_STATUS_COLORS[pr.approval_status] || "light"} size="sm">
                {PR_STATUS_LABELS[pr.approval_status] || pr.approval_status}
              </Badge>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Dibuat pada {formatDateTime(pr.created_at)}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {pr.can_edit && (
            <button
              type="button"
              onClick={() => navigate(`/purchase-requisitions/${pr.id}/edit`)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors shadow-theme-xs"
            >
              <PencilIcon className="w-4 h-4" />
              Edit Draft
            </button>
          )}
          {pr.can_submit && (
            <button
              type="button"
              onClick={() => setConfirmAction("submit")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors shadow-theme-xs"
            >
              <PaperPlaneIcon className="w-4 h-4" />
              Submit PR
            </button>
          )}
          {pr.can_approve && (
            <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto">
              <button
                type="button"
                onClick={() => setConfirmAction("approve")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-success-500 rounded-lg hover:bg-success-600 transition-colors shadow-theme-xs"
              >
                <CheckLineIcon className="w-4.5 h-4.5" />
                Setujui
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction("reject")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors shadow-theme-xs"
              >
                <CloseLineIcon className="w-4.5 h-4.5" />
                Tolak
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Approval Timeline — horizontal, top priority */}
        <PrApprovalTimeline
          logs={pr.approval_logs || []}
          approvalStatus={pr.approval_status}
          creatorName={pr.creator_name}
          createdAt={pr.created_at}
        />

        {/* Info Card Grid */}
        <ComponentCard title="Informasi PR">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 p-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Nomor PR</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{pr.pr_number}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Unit / Brand</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{pr.unit?.name || "-"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tipe Pengadaan</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{pr.purchase_type?.name || "-"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Dibuat Pada</span>
              <span className="text-sm font-medium text-gray-800 dark:text-white/90">{formatDateTime(pr.created_at)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Disubmit Oleh</span>
              <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                {pr.submitted_at
                  ? `${pr.submitter_name || "-"} (${formatDateTime(pr.submitted_at)})`
                  : "-"}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Nilai Anggaran</span>
              <span className="text-base font-bold text-brand-600 dark:text-brand-400">{formatIdr(itemsTotal)}</span>
            </div>
          </div>
        </ComponentCard>

        {/* PR Items Table */}
        <ComponentCard title="Daftar Item Pengajuan">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <Table className="w-full table-fixed border-collapse">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                      Nama Produk / Deskripsi
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[140px]">
                      Kategori
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[200px]">
                      Vendor Rujukan
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[90px]">
                      Qty
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[160px]">
                      Harga Satuan
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[110px]">
                      Jatuh Tempo
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[180px]">
                      Subtotal
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {(pr.items || []).map((item) => (
                    <TableRow key={item.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <TableCell className="px-5 py-4 text-left text-sm font-semibold text-gray-800 dark:text-white/90">
                        {item.product?.name || item.description || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-left text-sm text-gray-600 dark:text-gray-300">
                        {item.category?.name || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-left text-sm text-gray-600 dark:text-gray-300">
                        {item.vendor?.company_name || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                        {formatQty(item.request_qty)}{" "}
                        {item.product?.uom?.shortname || item.product?.uom?.name || ""}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right text-sm text-gray-600 dark:text-gray-300">
                        {formatIdr(item.request_price)}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                        {formatShortDate(item.due_date)}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right text-sm font-semibold text-gray-800 dark:text-white/90">
                        {formatIdr(item.request_total)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total Row */}
                  <TableRow className="bg-gray-50/30 dark:bg-white/[0.01] font-semibold">
                    <TableCell colSpan={6} className="px-5 py-4 text-left text-sm text-gray-500 dark:text-gray-400">
                      Total Nilai Pengajuan
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right text-base font-bold text-brand-600 dark:text-brand-400">
                      {formatIdr(itemsTotal)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {(pr.items || []).map((item) => (
              <div
                key={item.id}
                className="p-4 bg-white dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.05] space-y-3 shadow-xs"
              >
                {/* Header: Product name & Category */}
                <div className="flex flex-col gap-1 border-b border-gray-100 dark:border-white/[0.05] pb-2">
                  <h4 className="font-semibold text-gray-800 dark:text-white/90 text-sm">
                    {item.product?.name || item.description || "-"}
                  </h4>
                  {item.category?.name && (
                    <span className="inline-self-start text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 w-fit">
                      {item.category.name}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div className="col-span-2">
                    <span className="text-gray-400 dark:text-gray-500 block uppercase text-[10px] font-bold tracking-wider mb-0.5">Vendor Rujukan</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{item.vendor?.company_name || "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 dark:text-gray-500 block uppercase text-[10px] font-bold tracking-wider mb-0.5">Kuantitas</span>
                    <span className="font-medium text-gray-750 dark:text-white">
                      {formatQty(item.request_qty)}{" "}
                      {item.product?.uom?.shortname || item.product?.uom?.name || ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 dark:text-gray-500 block uppercase text-[10px] font-bold tracking-wider mb-0.5">Harga Satuan</span>
                    <span className="font-medium text-gray-750 dark:text-white">{formatIdr(item.request_price)}</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100 dark:border-white/[0.05] pt-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Subtotal</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatIdr(item.request_total)}
                  </span>
                </div>
              </div>
            ))}

            {/* Mobile Total Card */}
            <div className="p-4 bg-gray-50/50 dark:bg-white/[0.02] rounded-xl border border-gray-250 dark:border-white/[0.08] flex items-center justify-between">
              <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Total Nilai Pengajuan</span>
              <span className="text-base font-extrabold text-brand-600 dark:text-brand-400">
                {formatIdr(itemsTotal)}
              </span>
            </div>
          </div>
        </ComponentCard>

        {/* PO List section */}
        {pr.approval_status === "approved" && (pr.purchase_orders || []).length > 0 && (
          <ComponentCard title="Daftar Purchase Order (PO) Terbit">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between -mt-2 mb-4">
              <div className="p-4 rounded-lg bg-brand-50/50 border border-brand-100 dark:bg-brand-950/10 dark:border-brand-900/30 text-sm text-brand-800 dark:text-brand-300 flex-1">
                Permintaan Requisition (PR) ini telah disetujui sepenuhnya dan telah dipecah secara otomatis menjadi <strong>{pr.purchase_orders!.length} PO</strong> berdasarkan masing-masing vendor rujukan.
              </div>
              {canViewPo && (
                <button
                  type="button"
                  onClick={handleExportAllPoPdfs}
                  disabled={isExportingZip}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-900/40 dark:bg-brand-950/20 dark:text-brand-300 transition-colors shadow-xs"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {isExportingZip ? "Menyiapkan..." : "Unduh Semua PDF"}
                </button>
              )}
            </div>
            <div className="space-y-6">
              {pr.purchase_orders!.map((po) => {
                const poTotal = po.items.reduce((s, i) => s + Number(i.real_total), 0);
                return (
                  <div
                    key={po.id}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]"
                  >
                    {/* Header PO Card */}
                    <div className="p-5 bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/[0.05] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Nomor PO</span>
                        <Link
                          to={`/purchase-orders/${po.id}`}
                          className="text-base font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 inline-flex items-center gap-1 mt-0.5"
                        >
                          {po.po_number}
                        </Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                          Vendor: <span className="font-semibold text-gray-700 dark:text-gray-300">{po.vendor?.company_name || "-"}</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Jatuh Tempo:{" "}
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {formatShortDate(po.due_date)}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        {canViewPo && (
                          <button
                            type="button"
                            onClick={() =>
                              handleExportPoPdf(
                                po.id,
                                po.po_number,
                                po.vendor?.company_name,
                              )
                            }
                            disabled={exportingPoId === po.id || isExportingZip}
                            className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300 transition-colors"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {exportingPoId === po.id ? "..." : "PDF"}
                          </button>
                        )}
                        {po.delivery_status && (
                          <Badge color="info" size="sm">
                            {po.delivery_status.name}
                          </Badge>
                        )}
                        {po.payment_status && (
                          <Badge color="warning" size="sm">
                            {po.payment_status.name}
                          </Badge>
                        )}
                      </div>
                    </div>                    {/* Items Table in PO - Desktop */}
                    <div className="hidden md:block max-w-full overflow-x-auto custom-scrollbar">
                      <Table className="w-full table-fixed border-collapse">
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/20 dark:bg-white/[0.01]">
                          <TableRow>
                            <TableCell isHeader className="px-5 py-3 text-left text-theme-xs font-medium text-gray-400 dark:text-gray-500">Item</TableCell>
                            <TableCell isHeader className="px-5 py-3 text-center text-theme-xs font-medium text-gray-400 dark:text-gray-500 w-[90px]">Qty</TableCell>
                            <TableCell isHeader className="px-5 py-3 text-right text-theme-xs font-medium text-gray-400 dark:text-gray-500 w-[150px]">Harga</TableCell>
                            <TableCell isHeader className="px-5 py-3 text-right text-theme-xs font-medium text-gray-400 dark:text-gray-500 w-[180px]">Total</TableCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                          {po.items.map((pi) => (
                            <TableRow key={pi.id} className="transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                              <TableCell className="px-5 py-3 text-left text-sm font-medium text-gray-800 dark:text-white/90">
                                {pi.product?.name || pi.description || "-"}
                              </TableCell>
                              <TableCell className="px-5 py-3 text-center text-sm text-gray-600 dark:text-gray-300">
                                {formatQty(pi.real_qty)}
                              </TableCell>
                              <TableCell className="px-5 py-3 text-right text-sm text-gray-600 dark:text-gray-300">{formatIdr(pi.real_price)}</TableCell>
                              <TableCell className="px-5 py-3 text-right text-sm font-semibold text-gray-800 dark:text-white/90">{formatIdr(pi.real_total)}</TableCell>
                            </TableRow>
                          ))}
                          {/* Total Row */}
                          <TableRow className="bg-gray-50/10 dark:bg-white/[0.005] font-semibold">
                            <TableCell colSpan={3} className="px-5 py-3 text-left text-xs text-gray-500 dark:text-gray-400">
                              Total Nilai Purchase Order
                            </TableCell>
                            <TableCell className="px-5 py-3 text-right text-sm font-bold text-brand-600 dark:text-brand-400">
                              {formatIdr(poTotal)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Items Table in PO - Mobile */}
                    <div className="md:hidden space-y-2.5 p-4 bg-gray-50/30 dark:bg-white/[0.01] border-t border-gray-100 dark:border-white/[0.05]">
                      {po.items.map((pi) => (
                        <div
                          key={pi.id}
                          className="p-3 bg-white dark:bg-white/[0.02] rounded-lg border border-gray-100 dark:border-white/[0.05] space-y-2 text-xs shadow-theme-xs"
                        >
                          <div className="font-semibold text-gray-800 dark:text-white/90">
                            {pi.product?.name || pi.description || "-"}
                          </div>
                          <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                            <span>Qty: <span className="font-medium text-gray-850 dark:text-gray-200">{formatQty(pi.real_qty)}</span></span>
                            <span>Harga: <span className="font-medium text-gray-850 dark:text-gray-200">{formatIdr(pi.real_price)}</span></span>
                          </div>
                          <div className="border-t border-gray-100 dark:border-white/[0.05] pt-1.5 flex items-center justify-between">
                            <span className="font-medium text-gray-400 uppercase text-[9px] tracking-wider">Subtotal</span>
                            <span className="font-bold text-gray-900 dark:text-white">{formatIdr(pi.real_total)}</span>
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
                        <span>Total Nilai Purchase Order</span>
                        <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{formatIdr(poTotal)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ComponentCard>
        )}
      </div>

      {confirmAction && (
        <ConfirmModal
          isOpen={!!confirmAction}
          onClose={() => {
            setConfirmAction(null);
            setActionNote("");
          }}
          onConfirm={runAction}
          title={confirmTitles[confirmAction]}
          message={confirmMessages[confirmAction]}
          confirmText={confirmAction === "reject" ? "Tolak" : "Ya, Lanjutkan"}
          confirmButtonColor={confirmAction === "reject" ? "danger" : confirmAction === "approve" ? "success" : "primary"}
          isLoading={actionLoading}
        >
          {(confirmAction === "approve" || confirmAction === "reject") && (
            <div className="mt-4 text-left">
              <label htmlFor="actionNote" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Catatan / Keterangan (Opsional)
              </label>
              <textarea
                id="actionNote"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={confirmAction === "reject" ? "Tuliskan alasan penolakan..." : "Tuliskan catatan persetujuan..."}
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-1 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>
          )}
        </ConfirmModal>
      )}

      <LoadingModal isOpen={actionLoading} />
    </>
  );
}




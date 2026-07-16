import { useEffect, useMemo, useState } from "react";
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
import { purchaseOrderAPI, type PurchaseItem, type PurchaseOrder } from "../../utils/api";
import { AngleLeftIcon, CloseLineIcon } from "../../icons";
import { useToast } from "../../context/ToastContext";
import { LoadingModal } from "../../components/ui/modal";
import { formatDateTime, formatIdr, formatQty, formatShortDate } from "../PurchaseRequisitions/prUtils";
import PoStatusUpdateModal from "./PoStatusUpdateModal";
import PoStatusSection from "./PoStatusSection";
import PoItemPriceModal from "./PoItemPriceModal";
import PoItemQtyModal from "./PoItemQtyModal";

type StatusModalState = {
  type: "delivery" | "payment";
  item: PurchaseItem;
} | null;

export default function ViewPurchaseOrder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [deliveryStatuses, setDeliveryStatuses] = useState<Array<{ id: number; name: string }>>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [isSavingQty, setIsSavingQty] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [statusModal, setStatusModal] = useState<StatusModalState>(null);
  const [priceModalItem, setPriceModalItem] = useState<PurchaseItem | null>(null);
  const [qtyModalItem, setQtyModalItem] = useState<PurchaseItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPo = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await purchaseOrderAPI.getById(id);
      if (res.success && res.data) {
        setPo(res.data);
      } else {
        setError(res.message || "Gagal memuat PO");
      }
    } catch {
      setError("Terjadi kesalahan saat memuat PO");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadOptions = async () => {
      const [d, p] = await Promise.all([
        purchaseOrderAPI.getDeliveryStatuses(),
        purchaseOrderAPI.getPaymentStatuses(),
      ]);
      if (d.success && d.data) setDeliveryStatuses(d.data.delivery_statuses);
      if (p.success && p.data) setPaymentStatuses(p.data.payment_statuses);
    };
    loadOptions();
    loadPo();
  }, [id]);

  const handleUpdateStatus = async (payload: {
    statusId: number;
    notes: string;
    proofs: File[];
  }) => {
    if (!po || !statusModal) return;
    setIsSavingStatus(true);
    try {
      const apiCall =
        statusModal.type === "delivery"
          ? purchaseOrderAPI.updateItemDeliveryStatus
          : purchaseOrderAPI.updateItemPaymentStatus;
      const res = await apiCall(po.id, statusModal.item.id, {
        status_id: payload.statusId,
        notes: payload.notes || undefined,
        proofs: payload.proofs.length > 0 ? payload.proofs : undefined,
      });
      if (res.success && res.data) {
        showSuccess(res.message || "Status berhasil diperbarui");
        setPo(res.data);
        setStatusModal(null);
      } else {
        showError(res.message || "Gagal memperbarui status");
      }
    } catch {
      showError("Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleUpdatePrice = async (payload: { price: number; notes: string }) => {
    if (!po || !priceModalItem) return;
    setIsSavingPrice(true);
    try {
      const res = await purchaseOrderAPI.updateItemPrice(po.id, priceModalItem.id, {
        real_price: payload.price,
        notes: payload.notes || undefined,
      });
      if (res.success && res.data) {
        showSuccess(res.message || "Harga item berhasil diperbarui");
        setPo(res.data);
        setPriceModalItem(null);
      } else {
        showError(res.message || "Gagal memperbarui harga");
      }
    } catch {
      showError("Terjadi kesalahan saat menyimpan harga");
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleUpdateQty = async (payload: { qty: number; notes: string }) => {
    if (!po || !qtyModalItem) return;
    setIsSavingQty(true);
    try {
      const res = await purchaseOrderAPI.updateItemQty(po.id, qtyModalItem.id, {
        real_qty: payload.qty,
        notes: payload.notes || undefined,
      });
      if (res.success && res.data) {
        showSuccess(res.message || "Qty item berhasil diperbarui");
        setPo(res.data);
        setQtyModalItem(null);
      } else {
        showError(res.message || "Gagal memperbarui qty");
      }
    } catch {
      showError("Terjadi kesalahan saat menyimpan qty");
    } finally {
      setIsSavingQty(false);
    }
  };

  const handleExportPdf = async () => {
    if (!po) return;
    setIsExportingPdf(true);
    try {
      const vendor = (po.vendor?.company_name || "vendor")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase()
        .slice(0, 40);
      const safePo = po.po_number.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-|-$/g, "");
      const filename = safePo.toUpperCase().startsWith("PO-")
        ? `${safePo}-${vendor}.pdf`
        : `PO-${safePo}-${vendor}.pdf`;
      const res = await purchaseOrderAPI.downloadPdf(po.id, filename);
      if (res.success) {
        showSuccess("PDF PO berhasil diunduh");
      } else {
        showError(res.message || "Gagal mengunduh PDF PO");
      }
    } catch {
      showError("Terjadi kesalahan saat mengunduh PDF");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const itemLabel = (item: PurchaseItem) =>
    item.product?.name || item.description || "Item";

  const priceDiffersFromPr = (item: PurchaseItem) =>
    item.pr_request_price != null && Number(item.pr_request_price) !== Number(item.real_price);

  const qtyDiffersFromPr = (item: PurchaseItem) =>
    item.pr_request_qty != null && Number(item.pr_request_qty) !== Number(item.real_qty);

  const itemUom = (item: PurchaseItem) =>
    item.product?.uom?.shortname || item.product?.uom?.name || "";

  const modalCurrentStatusId = useMemo(() => {
    if (!statusModal) return null;
    return statusModal.type === "delivery"
      ? statusModal.item.delivery_status_id
      : statusModal.item.payment_status_id;
  }, [statusModal]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-500"></div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 font-medium">Memuat data Purchase Order...</p>
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 mb-4">
          <CloseLineIcon className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">PO Tidak Ditemukan</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">{error || "Data Purchase Order tidak dapat ditemukan atau telah dihapus."}</p>
        <button
          onClick={() => navigate("/purchase-orders")}
          className="mt-6 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-750 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors shadow-theme-xs"
        >
          <AngleLeftIcon className="w-4 h-4" />
          Kembali ke Daftar
        </button>
      </div>
    );
  }

  const itemsTotal = (po.items || []).reduce((s, i) => s + Number(i.real_total), 0);

  return (
    <>
      <PageMeta title={`${po.po_number}`} description="Detail purchase order" />
      {/* <PageBreadcrumb pageTitle={po.po_number} /> */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/purchase-orders")}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-755 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors shadow-theme-xs"
            title="Kembali"
          >
            <AngleLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex flex-wrap items-center gap-2">
              {po.po_number}
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
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Dibuat pada {formatDateTime(po.created_at)} · Status header = ringkasan seluruh item
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={isExportingPdf}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-900/40 dark:bg-brand-950/20 dark:text-brand-300 transition-colors shadow-xs self-start sm:self-auto"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {isExportingPdf ? "Menyiapkan PDF..." : "Export PDF"}
        </button>
      </div>

      <div className="space-y-6">
        <ComponentCard title="Informasi PO">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 p-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Nomor PO</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{po.po_number}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Nomor PR</span>
              <span className="text-sm font-semibold text-gray-850 dark:text-white/90">
                {po.pr_id ? (
                  <Link to={`/purchase-requisitions/${po.pr_id}`} className="text-brand-500 hover:underline">
                    {po.pr_number || po.pr_id}
                  </Link>
                ) : (
                  "-"
                )}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Vendor</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{po.vendor?.company_name || "-"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Unit / Brand</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{po.unit?.name || "-"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tipe Pengadaan</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{po.purchase_type?.name || "-"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Nilai</span>
              <span className="text-base font-bold text-brand-600 dark:text-brand-400">
                {formatIdr(po.total_amount ?? itemsTotal)}
              </span>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard title="Item PO">
          <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <Table className="w-full border-collapse min-w-[1100px]">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
                  <TableRow>
                    <TableCell isHeader className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500">Produk</TableCell>
                    <TableCell isHeader className="px-4 py-3 text-center text-theme-xs font-medium text-gray-500 w-[80px]">Qty</TableCell>
                    <TableCell isHeader className="px-4 py-3 text-right text-theme-xs font-medium text-gray-500 w-[110px]">Harga PR</TableCell>
                    <TableCell isHeader className="px-4 py-3 text-right text-theme-xs font-medium text-gray-500 w-[110px]">Harga PO</TableCell>
                    <TableCell isHeader className="px-4 py-3 text-right text-theme-xs font-medium text-gray-500 w-[120px]">Total</TableCell>
                    <TableCell isHeader className="px-4 py-3 text-center text-theme-xs font-medium text-gray-500 w-[110px]">Jatuh Tempo</TableCell>
                    <TableCell isHeader className="px-4 py-3 text-center text-theme-xs font-medium text-gray-500 w-[110px]">Pengiriman</TableCell>
                    <TableCell isHeader className="px-4 py-3 text-center text-theme-xs font-medium text-gray-500 w-[110px]">Pembayaran</TableCell>
                    <TableCell isHeader className="px-4 py-3 text-right text-theme-xs font-medium text-gray-500 w-[140px]">Aksi</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {(po.items || []).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                        {itemLabel(item)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-300">
                        <span
                          className={
                            qtyDiffersFromPr(item)
                              ? "font-semibold text-amber-600 dark:text-amber-400"
                              : undefined
                          }
                        >
                          {formatQty(item.real_qty)}
                        </span>{" "}
                        {itemUom(item)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                        {item.pr_request_price != null ? formatIdr(item.pr_request_price) : "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-sm">
                        <span className={priceDiffersFromPr(item) ? "font-semibold text-amber-600 dark:text-amber-400" : "text-gray-600 dark:text-gray-300"}>
                          {formatIdr(item.real_price)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-sm font-semibold text-gray-800 dark:text-white/90">
                        {formatIdr(item.real_total)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center text-xs text-gray-600 dark:text-gray-300">
                        {formatShortDate(item.due_date)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        {item.delivery_status ? (
                          <Badge color="info" size="sm">{item.delivery_status.name}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        {item.payment_status ? (
                          <Badge color="warning" size="sm">{item.payment_status.name}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex flex-col gap-1 items-end">
                          {item.can_update_qty && (
                            <button
                              type="button"
                              onClick={() => setQtyModalItem(item)}
                              className="text-[11px] font-semibold text-teal-600 hover:underline dark:text-teal-400"
                            >
                              Ubah qty
                            </button>
                          )}
                          {item.can_update_price && (
                            <button
                              type="button"
                              onClick={() => setPriceModalItem(item)}
                              className="text-[11px] font-semibold text-violet-600 hover:underline dark:text-violet-400"
                            >
                              Ubah harga
                            </button>
                          )}
                          {item.can_update_delivery && (
                            <button
                              type="button"
                              onClick={() => setStatusModal({ type: "delivery", item })}
                              className="text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
                            >
                              Update pengiriman
                            </button>
                          )}
                          {item.can_update_payment && (
                            <button
                              type="button"
                              onClick={() => setStatusModal({ type: "payment", item })}
                              className="text-[11px] font-semibold text-amber-600 hover:underline dark:text-amber-400"
                            >
                              Update pembayaran
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

          <div className="md:hidden space-y-3">
            {(po.items || []).map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.05] space-y-3">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">{itemLabel(item)}</h4>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    Qty:{" "}
                    <span
                      className={
                        qtyDiffersFromPr(item)
                          ? "font-semibold text-amber-600 dark:text-amber-400"
                          : "font-medium text-gray-800 dark:text-gray-200"
                      }
                    >
                      {formatQty(item.real_qty)}
                      {itemUom(item) ? ` ${itemUom(item)}` : ""}
                    </span>
                    {item.pr_request_qty != null && qtyDiffersFromPr(item) && (
                      <span className="text-gray-400"> (PR: {formatQty(item.pr_request_qty)})</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    PR: {item.pr_request_price != null ? formatIdr(item.pr_request_price) : "-"}
                    <span className="mx-1">→</span>
                    PO: {formatIdr(item.real_price)}
                  </span>
                  <span className="font-bold text-gray-800 dark:text-white/90">{formatIdr(item.real_total)}</span>
                </div>
                <div className="text-xs text-gray-500">Jatuh tempo: {formatShortDate(item.due_date)}</div>
                <div className="flex flex-wrap gap-2">
                  {item.delivery_status && <Badge color="info" size="sm">{item.delivery_status.name}</Badge>}
                  {item.payment_status && <Badge color="warning" size="sm">{item.payment_status.name}</Badge>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.can_update_qty && (
                    <button
                      type="button"
                      onClick={() => setQtyModalItem(item)}
                      className="rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Ubah qty
                    </button>
                  )}
                  {item.can_update_price && (
                    <button
                      type="button"
                      onClick={() => setPriceModalItem(item)}
                      className="rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Ubah harga
                    </button>
                  )}
                  {item.can_update_delivery && (
                    <button
                      type="button"
                      onClick={() => setStatusModal({ type: "delivery", item })}
                      className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Update pengiriman
                    </button>
                  )}
                  {item.can_update_payment && (
                    <button
                      type="button"
                      onClick={() => setStatusModal({ type: "payment", item })}
                      className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Update pembayaran
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ComponentCard>

        {(po.price_logs || []).length > 0 && (
          <ComponentCard title="Riwayat Perubahan Harga">
            <div className="space-y-2">
              {(po.price_logs || []).map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-1 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2 dark:border-white/[0.05] dark:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      {formatIdr(log.old_price)} → {formatIdr(log.new_price)}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {log.actor_name || "Sistem"} · {formatDateTime(log.created_at)}
                    </p>
                    {log.notes && (
                      <p className="text-[11px] italic text-gray-500 dark:text-gray-400">&ldquo;{log.notes}&rdquo;</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Total: {formatIdr(log.old_total)} → {formatIdr(log.new_total)}
                  </p>
                </div>
              ))}
            </div>
          </ComponentCard>
        )}

        {(po.status_logs || []).length > 0 && (
          <PoStatusSection
            deliveryStatuses={deliveryStatuses}
            paymentStatuses={paymentStatuses}
            deliveryStatusId={po.delivery_status_id}
            paymentStatusId={po.payment_status_id}
            logs={po.status_logs || []}
            canUpdateDelivery={false}
            canUpdatePayment={false}
          />
        )}
      </div>

      <PoItemPriceModal
        isOpen={priceModalItem !== null}
        onClose={() => setPriceModalItem(null)}
        productName={priceModalItem ? itemLabel(priceModalItem) : ""}
        currentPrice={Number(priceModalItem?.real_price ?? 0)}
        prPrice={priceModalItem?.pr_request_price}
        onSubmit={handleUpdatePrice}
        isSubmitting={isSavingPrice}
      />

      <PoItemQtyModal
        isOpen={qtyModalItem !== null}
        onClose={() => setQtyModalItem(null)}
        productName={qtyModalItem ? itemLabel(qtyModalItem) : ""}
        currentQty={Number(qtyModalItem?.real_qty ?? 0)}
        prQty={qtyModalItem?.pr_request_qty}
        uomLabel={qtyModalItem ? itemUom(qtyModalItem) : ""}
        onSubmit={handleUpdateQty}
        isSubmitting={isSavingQty}
      />

      <PoStatusUpdateModal
        isOpen={statusModal !== null}
        onClose={() => setStatusModal(null)}
        statusType={statusModal?.type ?? "delivery"}
        subtitle={
          statusModal
            ? `${statusModal.type === "delivery" ? "Pengiriman" : "Pembayaran"} — ${itemLabel(statusModal.item)}`
            : ""
        }
        roleHint={
          statusModal?.type === "delivery"
            ? "Memerlukan permission update status pengiriman item PO"
            : "Memerlukan permission update status pembayaran item PO"
        }
        allStatuses={statusModal?.type === "delivery" ? deliveryStatuses : paymentStatuses}
        currentStatusId={modalCurrentStatusId}
        onSubmit={handleUpdateStatus}
        isSubmitting={isSavingStatus}
      />

      <LoadingModal isOpen={isSavingStatus || isSavingPrice || isSavingQty} />
    </>
  );
}

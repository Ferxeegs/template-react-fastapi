import { useMemo, useState } from "react";
import type { PoStatusLog } from "../../utils/api";
import { getMediaUrl } from "../../utils/api";
import { formatDateTime } from "../PurchaseRequisitions/prUtils";
import Badge from "../../components/ui/badge/Badge";
import { Modal } from "../../components/ui/modal";

interface StatusOption {
  id: number;
  name: string;
}

const DELIVERY_NEXT: Record<string, string[]> = {
  Diproses: ["Diterima", "Dibatalkan"],
};

const PAYMENT_NEXT: Record<string, string[]> = {
  "Belum Dibayar": ["Lunas"],
};

function canAdvance(currentName: string | undefined, map: Record<string, string[]>): boolean {
  if (!currentName) return false;
  return (map[currentName] ?? []).length > 0;
}

interface StatusRowProps {
  label: string;
  currentName?: string;
  badgeColor: "info" | "warning";
  logs: PoStatusLog[];
  statusType: "delivery" | "payment";
  canUpdate: boolean;
  onUpdate?: () => void;
}

function StatusRow({
  label,
  currentName,
  badgeColor,
  logs,
  statusType,
  canUpdate,
  onUpdate,
}: StatusRowProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const typeLogs = useMemo(
    () =>
      [...logs]
        .filter((l) => l.status_type === statusType)
        .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")),
    [logs, statusType]
  );

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-white/[0.05] dark:bg-white/[0.02]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</span>
          {currentName ? (
            <Badge color={badgeColor} size="sm">
              {currentName}
            </Badge>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}
        </div>
        {canUpdate && onUpdate && (
          <button
            type="button"
            onClick={onUpdate}
            className="inline-flex h-8 items-center rounded-lg bg-brand-500 px-3 text-xs font-semibold text-white hover:bg-brand-600"
          >
            Perbarui
          </button>
        )}
      </div>

      {typeLogs.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3 dark:border-white/[0.05]">
          {typeLogs.slice(0, 3).map((log) => {
            const proofItems = log.proof_media ?? [];
            return (
              <div
                key={log.id}
                className="flex gap-2 rounded-lg bg-white px-2.5 py-2 dark:bg-white/[0.03]"
              >
                {proofItems.length > 0 && (
                  <div className="flex shrink-0 gap-1">
                    {proofItems.slice(0, 3).map((media) => {
                      const proofUrl = media.url ? getMediaUrl(media.url) : null;
                      if (!proofUrl) return null;
                      return (
                        <button
                          key={media.id}
                          type="button"
                          onClick={() => setPreviewImage(proofUrl)}
                          className="cursor-zoom-in focus:outline-hidden"
                        >
                          <img
                            src={proofUrl}
                            alt="Bukti"
                            className="h-10 w-10 rounded border border-gray-200 object-cover dark:border-white/[0.08]"
                          />
                        </button>
                      );
                    })}
                    {proofItems.length > 3 && (
                      <span className="flex h-10 w-10 items-center justify-center rounded border border-gray-200 text-[10px] text-gray-500 dark:border-white/[0.08]">
                        +{proofItems.length - 3}
                      </span>
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-gray-800 dark:text-white/90">
                    {log.status_name}
                    {log.item_label && (
                      <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">
                        · {log.item_label}
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {log.actor_name || "Sistem"} · {formatDateTime(log.created_at)}
                  </p>
                  {log.notes && (
                    <p className="mt-0.5 truncate text-[10px] italic text-gray-500 dark:text-gray-400">
                      &ldquo;{log.notes}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {typeLogs.length > 3 && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              +{typeLogs.length - 3} riwayat lainnya
            </p>
          )}
        </div>
      )}

      <Modal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        className="max-w-3xl"
      >
        <div className="flex flex-col p-1 sm:p-2">
          <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2 dark:border-white/[0.05]">
            <h4 className="text-sm font-bold text-gray-950 dark:text-white">
              Pratinjau Bukti Foto
            </h4>
          </div>
          <div className="flex items-center justify-center overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-950/40 p-1">
            <img
              src={previewImage || ""}
              alt="Pratinjau Bukti"
              className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow-sm"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export interface PoStatusSectionProps {
  deliveryStatuses: StatusOption[];
  paymentStatuses: StatusOption[];
  deliveryStatusId?: number | null;
  paymentStatusId?: number | null;
  logs?: PoStatusLog[];
  canUpdateDelivery?: boolean;
  canUpdatePayment?: boolean;
  onOpenDeliveryModal?: () => void;
  onOpenPaymentModal?: () => void;
}

export default function PoStatusSection({
  deliveryStatuses,
  paymentStatuses,
  deliveryStatusId,
  paymentStatusId,
  logs = [],
  canUpdateDelivery = false,
  canUpdatePayment = false,
  onOpenDeliveryModal,
  onOpenPaymentModal,
}: PoStatusSectionProps) {
  const deliveryName = deliveryStatuses.find((s) => s.id === deliveryStatusId)?.name;
  const paymentName = paymentStatuses.find((s) => s.id === paymentStatusId)?.name;

  const showDeliveryUpdate =
    canUpdateDelivery && canAdvance(deliveryName, DELIVERY_NEXT);
  const showPaymentUpdate =
    canUpdatePayment && canAdvance(paymentName, PAYMENT_NEXT);

  const hasDeliveryLogs = logs.some((l) => l.status_type === "delivery");
  const hasPaymentLogs = logs.some((l) => l.status_type === "payment");
  const showDelivery =
    showDeliveryUpdate || hasDeliveryLogs || deliveryStatusId != null;
  const showPayment =
    showPaymentUpdate || hasPaymentLogs || paymentStatusId != null;

  if (!showDelivery && !showPayment) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.06] dark:bg-white/[0.02] sm:p-5">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Riwayat Status</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Log perubahan pengiriman dan pembayaran per item
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {showDelivery && (
          <StatusRow
            label="Pengiriman"
            currentName={deliveryName}
            badgeColor="info"
            logs={logs}
            statusType="delivery"
            canUpdate={showDeliveryUpdate}
            onUpdate={onOpenDeliveryModal}
          />
        )}
        {showPayment && (
          <StatusRow
            label="Pembayaran"
            currentName={paymentName}
            badgeColor="warning"
            logs={logs}
            statusType="payment"
            canUpdate={showPaymentUpdate}
            onUpdate={onOpenPaymentModal}
          />
        )}
      </div>
    </div>
  );
}

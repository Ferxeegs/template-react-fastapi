import { useState } from "react";
import type { PoStatusLog } from "../../utils/api";
import { getMediaUrl } from "../../utils/api";
import Badge from "../../components/ui/badge/Badge";
import { formatDateTime } from "../PurchaseRequisitions/prUtils";
import { Modal } from "../../components/ui/modal";

type StepState = "completed" | "current" | "pending" | "cancelled";

interface StatusOption {
  id: number;
  name: string;
}

interface TrackStep {
  id: number;
  label: string;
  state: StepState;
  actor?: string | null;
  datetime?: string | null;
  hint?: string;
}

interface StatusTrackProps {
  title: string;
  subtitle: string;
  steps: TrackStep[];
  editable?: boolean;
  selectedId?: number | "";
  onSelect?: (id: number) => void;
}

const DELIVERY_FLOW = ["Diproses", "Diterima"];

const PAYMENT_FLOW = ["Belum Dibayar", "Lunas"];

const CANCELLED_LABEL = "Dibatalkan";

function orderStatuses(statuses: StatusOption[], flow: string[]): StatusOption[] {
  const ordered = flow
    .map((name) => statuses.find((s) => s.name === name))
    .filter((s): s is StatusOption => Boolean(s));
  const cancelled = statuses.find((s) => s.name === CANCELLED_LABEL);
  return cancelled ? [...ordered, cancelled] : ordered;
}

function buildTrackSteps(
  ordered: StatusOption[],
  currentId: number | null | undefined,
  logs: PoStatusLog[],
  statusType: "delivery" | "payment"
): TrackStep[] {
  const current = ordered.find((s) => s.id === currentId);
  const isCancelled = current?.name === CANCELLED_LABEL;
  const flowSteps = ordered.filter((s) => s.name !== CANCELLED_LABEL);
  const currentFlowIndex = flowSteps.findIndex((s) => s.id === currentId);

  const typeLogs = logs.filter((l) => l.status_type === statusType);

  return ordered.map((status) => {
    const log = [...typeLogs].reverse().find((l) => l.status_id === status.id);

    let state: StepState = "pending";
    if (isCancelled) {
      if (status.name === CANCELLED_LABEL) state = "cancelled";
      else if (flowSteps.findIndex((s) => s.id === status.id) <= currentFlowIndex && currentFlowIndex >= 0) {
        state = "completed";
      }
    } else if (status.name === CANCELLED_LABEL) {
      state = "pending";
    } else {
      const idx = flowSteps.findIndex((s) => s.id === status.id);
      if (idx < currentFlowIndex) state = "completed";
      else if (idx === currentFlowIndex) state = "current";
    }

    let hint: string | undefined;
    if (state === "current" && !log) hint = "Status saat ini";
    if (state === "pending" && status.name !== CANCELLED_LABEL) hint = "Belum dicapai";
    if (state === "cancelled") hint = "PO dibatalkan";

    return {
      id: status.id,
      label: status.name,
      state,
      actor: log?.actor_name,
      datetime: log?.created_at,
      hint,
    };
  });
}

function circleClasses(state: StepState): string {
  switch (state) {
    case "completed":
      return "border-success-500 bg-success-500 text-white";
    case "current":
      return "border-brand-500 bg-brand-500 text-white ring-4 ring-brand-500/20";
    case "cancelled":
      return "border-error-500 bg-error-500 text-white";
    default:
      return "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-500";
  }
}

function connectorClasses(from: StepState): string {
  if (from === "completed") return "bg-success-400 dark:bg-success-700/60";
  if (from === "cancelled") return "bg-error-300 dark:bg-error-800/50";
  if (from === "current") return "bg-brand-300 dark:bg-brand-800/50";
  return "bg-gray-200 dark:bg-gray-800";
}

function stateBadgeLabel(state: StepState): string {
  switch (state) {
    case "completed":
      return "Selesai";
    case "current":
      return "Aktif";
    case "cancelled":
      return "Batal";
    default:
      return "Menunggu";
  }
}

function stateBadgeClasses(state: StepState): string {
  switch (state) {
    case "completed":
      return "bg-success-50 text-success-700 dark:bg-success-950/40 dark:text-success-400";
    case "current":
      return "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400";
    case "cancelled":
      return "bg-error-50 text-error-700 dark:bg-error-950/40 dark:text-error-400";
    default:
      return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
  }
}

function StepIcon({ state, stepNumber }: { state: StepState; stepNumber: number }) {
  if (state === "completed") {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (state === "cancelled") {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }
  return <span className="text-[11px] font-bold">{stepNumber}</span>;
}

function StatusTrack({
  title,
  subtitle,
  steps,
  editable,
  selectedId,
  onSelect,
}: StatusTrackProps) {
  const completedCount = steps.filter((s) => s.state === "completed" || s.state === "current").length;

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/[0.05] dark:bg-white/[0.02] sm:p-5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
        <Badge color="info" size="sm">
          {completedCount} / {steps.length} tahap
        </Badge>
      </div>

      <div className="hidden sm:block">
        <div className="relative flex w-full items-start">
          {steps.map((step, index) => {
            const isSelected = editable && selectedId === step.id;
            const clickable = editable && onSelect;

            return (
              <div key={step.id} className="relative flex min-w-0 flex-1 flex-col items-center px-0.5">
                {index < steps.length - 1 && (
                  <div
                    className="absolute left-[calc(50%+1.25rem)] right-[calc(-50%+1.25rem)] top-5 z-0 h-0.5"
                    aria-hidden
                  >
                    <div className={`h-full w-full ${connectorClasses(step.state)}`} />
                  </div>
                )}

                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => onSelect?.(step.id)}
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-transform ${circleClasses(step.state)} ${
                    clickable ? "cursor-pointer hover:scale-105" : "cursor-default"
                  } ${isSelected ? "ring-4 ring-brand-400/40" : ""}`}
                  title={clickable ? `Set ke: ${step.label}` : step.label}
                >
                  <StepIcon state={step.state} stepNumber={index + 1} />
                </button>

                <div className="mt-3 flex w-full max-w-[9.5rem] flex-col items-center text-center">
                  <span
                    className={`mb-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${stateBadgeClasses(step.state)}`}
                  >
                    {stateBadgeLabel(step.state)}
                  </span>
                  <p className="text-[11px] font-bold leading-snug text-gray-900 dark:text-white line-clamp-2">
                    {step.label}
                  </p>

                  <div className="mt-2 flex min-h-[3rem] w-full flex-col justify-center rounded-lg border border-gray-100 bg-white/80 px-2 py-1.5 dark:border-white/[0.05] dark:bg-white/[0.03]">
                    {step.actor ? (
                      <p className="line-clamp-2 text-[10px] font-medium leading-tight text-gray-700 dark:text-gray-300">
                        {step.actor}
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">—</p>
                    )}
                    {step.datetime ? (
                      <p className="mt-0.5 text-[9px] leading-tight text-gray-400 dark:text-gray-500">
                        {formatDateTime(step.datetime)}
                      </p>
                    ) : step.hint ? (
                      <p className="mt-0.5 text-[9px] leading-tight text-gray-400 dark:text-gray-500">
                        {step.hint}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-0 sm:hidden">
        {steps.map((step, index) => {
          const isSelected = editable && selectedId === step.id;
          return (
            <div key={step.id} className="relative flex gap-3 pb-4 last:pb-0">
              {index < steps.length - 1 && (
                <div
                  className={`absolute left-[1.125rem] top-10 bottom-0 w-0.5 ${connectorClasses(step.state)}`}
                  aria-hidden
                />
              )}
              <button
                type="button"
                disabled={!editable || !onSelect}
                onClick={() => onSelect?.(step.id)}
                className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${circleClasses(step.state)} ${
                  isSelected ? "ring-4 ring-brand-400/40" : ""
                }`}
              >
                <StepIcon state={step.state} stepNumber={index + 1} />
              </button>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{step.label}</p>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${stateBadgeClasses(step.state)}`}
                  >
                    {stateBadgeLabel(step.state)}
                  </span>
                </div>
                <div className="mt-2 rounded-lg border border-gray-100 bg-white/80 px-3 py-2 dark:border-white/[0.05] dark:bg-white/[0.03]">
                  {step.actor && (
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{step.actor}</p>
                  )}
                  {step.datetime && (
                    <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                      {formatDateTime(step.datetime)}
                    </p>
                  )}
                  {!step.actor && !step.datetime && step.hint && (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{step.hint}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface PoStatusTimelineProps {
  deliveryStatuses: StatusOption[];
  paymentStatuses: StatusOption[];
  deliveryStatusId?: number | null;
  paymentStatusId?: number | null;
  logs?: PoStatusLog[];
  editable?: boolean;
  selectedDeliveryId?: number | "";
  selectedPaymentId?: number | "";
  onSelectDelivery?: (id: number) => void;
  onSelectPayment?: (id: number) => void;
}

export default function PoStatusTimeline({
  deliveryStatuses,
  paymentStatuses,
  deliveryStatusId,
  paymentStatusId,
  logs = [],
  editable = false,
  selectedDeliveryId,
  selectedPaymentId,
  onSelectDelivery,
  onSelectPayment,
}: PoStatusTimelineProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const orderedDelivery = orderStatuses(deliveryStatuses, DELIVERY_FLOW);
  const orderedPayment = orderStatuses(paymentStatuses, PAYMENT_FLOW);

  const deliverySteps = buildTrackSteps(orderedDelivery, deliveryStatusId, logs, "delivery");
  const paymentSteps = buildTrackSteps(orderedPayment, paymentStatusId, logs, "payment");

  const deliveryCurrent = deliveryStatuses.find((s) => s.id === deliveryStatusId)?.name || "-";
  const paymentCurrent = paymentStatuses.find((s) => s.id === paymentStatusId)?.name || "-";

  return (
    <div className="overflow-visible rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.06] dark:bg-white/[0.02] sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Alur Realisasi PO</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Pengiriman:{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">{deliveryCurrent}</span>
            {" · "}
            Pembayaran:{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">{paymentCurrent}</span>
          </p>
        </div>
        {editable && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 max-w-xs">
            Gunakan panel update di bawah untuk memperbarui status beserta bukti foto.
          </p>
        )}
      </div>

      <div className="space-y-4">
        <StatusTrack
          title="Pengiriman Barang"
          subtitle="Pelacakan penerimaan barang dari vendor"
          steps={deliverySteps}
          editable={editable}
          selectedId={selectedDeliveryId}
          onSelect={onSelectDelivery}
        />
        <StatusTrack
          title="Pembayaran"
          subtitle="Status pelunasan invoice ke vendor"
          steps={paymentSteps}
          editable={editable}
          selectedId={selectedPaymentId}
          onSelect={onSelectPayment}
        />
      </div>

      {logs.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-5 dark:border-white/[0.05]">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Riwayat Perubahan
          </h4>
          <div className="max-h-48 space-y-2 overflow-y-auto custom-scrollbar pr-1">
            {[...logs].reverse().map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-0.5 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 dark:border-white/[0.05] dark:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 dark:text-white/90">
                    {log.status_type === "delivery" ? "Pengiriman" : "Pembayaran"}: {log.status_name}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {log.actor_name || "Sistem"} · {formatDateTime(log.created_at)}
                  </p>
                  {log.notes && (
                    <p className="mt-1 text-[11px] italic text-gray-500 dark:text-gray-400">
                      &ldquo;{log.notes}&rdquo;
                    </p>
                  )}
                  {(log.proof_media ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(log.proof_media ?? []).map((media) => {
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
                              className="h-12 w-12 rounded-md border border-gray-200 object-cover dark:border-white/[0.08]"
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
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

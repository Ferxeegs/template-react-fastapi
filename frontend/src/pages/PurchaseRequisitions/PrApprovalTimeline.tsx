import type { PrApprovalLog } from "../../utils/api";
import Badge from "../../components/ui/badge/Badge";
import { PR_STATUS_LABELS, formatDateTime } from "./prUtils";

type StepState = "completed" | "current" | "pending" | "rejected";

type StepId = "draft" | "submit" | "brand_manager" | "finance" | "done";

interface TimelineStep {
  id: StepId;
  label: string;
  roleLabel: string;
  state: StepState;
  actor?: string | null;
  datetime?: string | null;
  hint?: string;
  notes?: string | null;
}

interface PrApprovalTimelineProps {
  logs: PrApprovalLog[];
  approvalStatus: string;
  creatorName?: string | null;
  createdAt?: string | null;
}

const WORKFLOW: Array<{ id: StepId; label: string; roleLabel: string }> = [
  { id: "draft", label: "Draft", roleLabel: "Purchasing" },
  { id: "submit", label: "Pengajuan", roleLabel: "Purchasing" },
  { id: "brand_manager", label: "Review", roleLabel: "Brand Manager" },
  { id: "finance", label: "Review", roleLabel: "Finance" },
  { id: "done", label: "Selesai", roleLabel: "PO Terbit" },
];

function getRejectedStepId(logs: PrApprovalLog[]): StepId {
  const rejectLog = logs.find((l) => l.action === "reject");
  if (!rejectLog) return "submit";
  if (rejectLog.role_name === "finance") return "finance";
  if (rejectLog.role_name === "brand_manager") return "brand_manager";
  return "brand_manager";
}

function getActiveIndex(approvalStatus: string, logs: PrApprovalLog[]): number {
  switch (approvalStatus) {
    case "draft":
      return 0;
    case "pending_brand_manager":
      return 2;
    case "pending_finance":
      return 3;
    case "approved":
      return 4;
    case "rejected":
      return WORKFLOW.findIndex((s) => s.id === getRejectedStepId(logs));
    default:
      return 0;
  }
}

function buildWorkflowSteps(
  logs: PrApprovalLog[],
  approvalStatus: string,
  creatorName?: string | null,
  createdAt?: string | null
): TimelineStep[] {
  const submitLog = logs.find((l) => l.action === "submit");
  const brandLog = logs.find(
    (l) => l.action === "approve" && l.role_name === "brand_manager"
  );
  const financeLog = logs.find(
    (l) => l.action === "approve" && l.role_name === "finance"
  );
  const rejectLog = logs.find((l) => l.action === "reject");

  const activeIndex = getActiveIndex(approvalStatus, logs);
  const isRejected = approvalStatus === "rejected";
  const isApproved = approvalStatus === "approved";

  return WORKFLOW.map((def, index) => {
    let state: StepState = "pending";

    if (isRejected) {
      if (index < activeIndex) state = "completed";
      else if (index === activeIndex) state = "rejected";
      else state = "pending";
    } else if (isApproved) {
      state = "completed";
    } else if (index < activeIndex) {
      state = "completed";
    } else if (index === activeIndex) {
      state = "current";
    }

    let actor: string | null | undefined;
    let datetime: string | null | undefined;
    let hint: string | undefined;
    let notes: string | null | undefined;

    switch (def.id) {
      case "draft":
        actor = creatorName;
        datetime = createdAt;
        if (state === "current") hint = "PR masih dalam tahap penyusunan";
        else if (state === "completed") hint = "Draft selesai";
        break;
      case "submit":
        if (submitLog) {
          actor = submitLog.actor_name;
          datetime = submitLog.created_at;
          notes = submitLog.notes;
        } else if (state === "pending") {
          hint = "Menunggu submit";
        }
        break;
      case "brand_manager":
        if (brandLog) {
          actor = brandLog.actor_name;
          datetime = brandLog.created_at;
          notes = brandLog.notes;
        } else if (state === "current") {
          hint = "Menunggu persetujuan";
        } else if (state === "pending") {
          hint = "Belum di review";
        }
        if (state === "rejected" && rejectLog) {
          actor = rejectLog.actor_name;
          datetime = rejectLog.created_at;
          notes = rejectLog.notes;
          hint = "Pengajuan ditolak";
        }
        break;
      case "finance":
        if (financeLog) {
          actor = financeLog.actor_name;
          datetime = financeLog.created_at;
          notes = financeLog.notes;
        } else if (state === "current") {
          hint = "Menunggu persetujuan";
        } else if (state === "pending") {
          hint = "Belum di review";
        }
        if (state === "rejected" && rejectLog) {
          actor = rejectLog.actor_name;
          datetime = rejectLog.created_at;
          notes = rejectLog.notes;
          hint = "Pengajuan ditolak";
        }
        break;
      case "done":
        if (isApproved) {
          actor = financeLog?.actor_name;
          datetime = financeLog?.created_at;
          hint = "PO otomatis diterbitkan";
        } else if (state === "pending") {
          hint = "Menunggu approval penuh";
        }
        break;
    }

    return {
      id: def.id,
      label: def.label,
      roleLabel: def.roleLabel,
      state,
      actor,
      datetime,
      hint,
      notes,
    };
  });
}

function circleClasses(state: StepState): string {
  switch (state) {
    case "completed":
      return "border-success-500 bg-success-500 text-white";
    case "current":
      return "border-brand-500 bg-brand-500 text-white ring-4 ring-brand-500/20";
    case "rejected":
      return "border-error-500 bg-error-500 text-white";
    default:
      return "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-500";
  }
}

function connectorClasses(from: StepState): string {
  if (from === "completed") return "bg-success-400 dark:bg-success-700/60";
  if (from === "rejected") return "bg-error-300 dark:bg-error-800/50";
  if (from === "current") return "bg-brand-300 dark:bg-brand-800/50";
  return "bg-gray-200 dark:bg-gray-800";
}

function StepIcon({ state, stepNumber }: { state: StepState; stepNumber: number }) {
  if (state === "completed") {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (state === "rejected") {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }
  return <span className="text-[11px] font-bold">{stepNumber}</span>;
}

function stateBadgeLabel(state: StepState): string {
  switch (state) {
    case "completed":
      return "Selesai";
    case "current":
      return "Berjalan";
    case "rejected":
      return "Ditolak";
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
    case "rejected":
      return "bg-error-50 text-error-700 dark:bg-error-950/40 dark:text-error-400";
    default:
      return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
  }
}

export default function PrApprovalTimeline({
  logs,
  approvalStatus,
  creatorName,
  createdAt,
}: PrApprovalTimelineProps) {
  const steps = buildWorkflowSteps(logs, approvalStatus, creatorName, createdAt);
  const completedCount = steps.filter((s) => s.state === "completed").length;

  return (
    <div className="overflow-visible rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.06] dark:bg-white/[0.02] sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Alur Persetujuan</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Status terkini:{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {PR_STATUS_LABELS[approvalStatus] || approvalStatus}
            </span>
          </p>
        </div>
        <Badge
          color={
            approvalStatus === "approved"
              ? "success"
              : approvalStatus === "rejected"
              ? "error"
              : "info"
          }
          size="sm"
        >
          {completedCount} dari {steps.length} tahap selesai
        </Badge>
      </div>

      {/* Desktop / tablet: horizontal stepper — equal columns, nothing clipped */}
      <div className="hidden sm:block">
        <div className="relative flex w-full items-start">
          {steps.map((step, index) => (
            <div key={step.id} className="relative flex min-w-0 flex-1 flex-col items-center px-1">
              {index < steps.length - 1 && (
                <div
                  className="absolute left-[calc(50%+1.25rem)] right-[calc(-50%+1.25rem)] top-5 z-0 h-0.5"
                  aria-hidden
                >
                  <div className={`h-full w-full ${connectorClasses(step.state)}`} />
                </div>
              )}

              <div
                className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${circleClasses(step.state)}`}
              >
                <StepIcon state={step.state} stepNumber={index + 1} />
              </div>

              <div className="mt-3 flex w-full max-w-[11rem] flex-col items-center text-center">
                <span
                  className={`mb-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${stateBadgeClasses(step.state)}`}
                >
                  {stateBadgeLabel(step.state)}
                </span>
                <p className="text-xs font-bold leading-snug text-gray-900 dark:text-white">
                  {step.label}
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {step.roleLabel}
                </p>

                <div className="mt-2 flex min-h-[3.25rem] w-full flex-col justify-center rounded-lg border border-gray-100 bg-gray-50/80 px-2 py-1.5 dark:border-white/[0.05] dark:bg-white/[0.03]">
                  {step.actor ? (
                    <p className="line-clamp-2 text-[11px] font-bold leading-tight text-gray-700 dark:text-gray-300">
                      {step.actor}
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">—</p>
                  )}
                  {step.datetime ? (
                    <p className="mt-1 text-[10px] leading-tight text-gray-400 dark:text-gray-500">
                      {formatDateTime(step.datetime)}
                    </p>
                  ) : step.hint ? (
                    <p className="mt-1 text-[10px] leading-tight text-gray-400 dark:text-gray-500">
                      {step.hint}
                    </p>
                  ) : null}
                  {step.notes && (
                    <p className="mt-1 text-[10px] italic leading-tight text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-white/[0.05] pt-1">
                      "{step.notes}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: vertical list — all steps visible, no horizontal clip */}
      <div className="space-y-0 sm:hidden">
        {steps.map((step, index) => (
          <div key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
            {index < steps.length - 1 && (
              <div
                className={`absolute left-[1.125rem] top-10 bottom-0 w-0.5 ${connectorClasses(step.state)}`}
                aria-hidden
              />
            )}

            <div
              className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${circleClasses(step.state)}`}
            >
              <StepIcon state={step.state} stepNumber={index + 1} />
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{step.label}</p>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${stateBadgeClasses(step.state)}`}
                >
                  {stateBadgeLabel(step.state)}
                </span>
              </div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {step.roleLabel}
              </p>
              <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 dark:border-white/[0.05] dark:bg-white/[0.03]">
                {step.actor && (
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{step.actor}</p>
                )}
                {step.datetime && (
                  <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                    {formatDateTime(step.datetime)}
                  </p>
                )}
                {step.notes && (
                  <p className="mt-1.5 text-[11px] italic text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-white/[0.05] pt-1.5">
                    "{step.notes}"
                  </p>
                )}
                {!step.actor && !step.datetime && step.hint && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">{step.hint}</p>
                )}
                {!step.actor && !step.datetime && !step.hint && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">—</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

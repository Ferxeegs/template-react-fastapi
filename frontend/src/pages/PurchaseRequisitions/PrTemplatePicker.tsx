import { useCallback, useEffect, useMemo, useState } from "react";
import {
  purchaseRequisitionAPI,
  type PurchaseRequisition,
} from "../../utils/api";
import { CopyIcon } from "../../icons";
import { ConfirmModal, Modal } from "../../components/ui/modal";
import Badge from "../../components/ui/badge/Badge";
import {
  PR_STATUS_COLORS,
  PR_STATUS_LABELS,
  calculatePrTotal,
  formatIdr,
  formatQty,
  formatShortDate,
  getPrItemName,
  getPrItemUom,
  getPrItemVendorName,
} from "./prUtils";

interface PrTemplatePickerProps {
  onLoad: (pr: PurchaseRequisition) => void;
  onError: (message: string) => void;
  formHasData: boolean;
  unitId?: string;
}

export default function PrTemplatePicker({
  onLoad,
  onError,
  formHasData,
  unitId,
}: PrTemplatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
  const [isListLoading, setIsListLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<PurchaseRequisition | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isLoadingPr, setIsLoadingPr] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [pendingPrId, setPendingPrId] = useState<string | null>(null);

  const resetAndClose = useCallback(() => {
    setIsOpen(false);
    setSelectedId("");
    setSelectedDetail(null);
    setSearch("");
    setListError(null);
    setPendingPrId(null);
  }, []);

  const closeModal = useCallback(() => {
    if (isLoadingPr) return;
    resetAndClose();
  }, [isLoadingPr, resetAndClose]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchPrs = async () => {
      setIsListLoading(true);
      setListError(null);
      setSelectedId("");
      setSelectedDetail(null);
      try {
        const res = await purchaseRequisitionAPI.getAll({
          page: 1,
          limit: 50,
        });
        if (res.success && res.data) {
          const sorted = [...(res.data.purchase_requisitions || [])].sort((a, b) => {
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return timeB - timeA;
          });
          setPrs(sorted);
        } else {
          setListError(res.message || "Gagal memuat daftar PR");
        }
      } catch {
        setListError("Gagal memuat daftar PR");
      } finally {
        setIsListLoading(false);
      }
    };

    fetchPrs();
  }, [isOpen]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }

    let cancelled = false;
    const fetchDetail = async () => {
      setIsDetailLoading(true);
      try {
        const res = await purchaseRequisitionAPI.getById(selectedId);
        if (!cancelled) {
          if (res.success && res.data) {
            setSelectedDetail(res.data);
          } else {
            setSelectedDetail(null);
          }
        }
      } catch {
        if (!cancelled) setSelectedDetail(null);
      } finally {
        if (!cancelled) setIsDetailLoading(false);
      }
    };

    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const filteredOptions = useMemo(() => {
    const scoped = unitId ? prs.filter((pr) => pr.unit_id === unitId) : prs;
    if (!search.trim()) return scoped;
    const query = search.toLowerCase();
    return scoped.filter((pr) => {
      const matchPrNum = pr.pr_number.toLowerCase().includes(query);
      const matchUnit = pr.unit?.name?.toLowerCase().includes(query) ?? false;
      return matchPrNum || matchUnit;
    });
  }, [prs, unitId, search]);

  useEffect(() => {
    if (selectedId && !filteredOptions.some((pr) => pr.id === selectedId)) {
      setSelectedId("");
    }
  }, [filteredOptions, selectedId]);

  const loadPrById = useCallback(
    async (prId: string) => {
      setIsLoadingPr(true);
      try {
        const res = await purchaseRequisitionAPI.getById(prId);
        if (res.success && res.data) {
          onLoad(res.data);
          resetAndClose();
        } else {
          onError(res.message || "Gagal memuat PR");
        }
      } catch {
        onError("Gagal memuat PR");
      } finally {
        setIsLoadingPr(false);
        setShowConfirm(false);
        setPendingPrId(null);
      }
    },
    [onLoad, onError, resetAndClose]
  );

  const requestLoad = (prId: string) => {
    if (formHasData) {
      setPendingPrId(prId);
      setShowConfirm(true);
      return;
    }
    loadPrById(prId);
  };

  const handleSalin = () => {
    if (!selectedId) return;
    requestLoad(selectedId);
  };

  const previewItems = selectedDetail?.items || [];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 sm:text-sm"
      >
        <CopyIcon className="h-4 w-4" />
        Import dari Pengajuan sebelumnya
      </button>

      <Modal isOpen={isOpen} onClose={closeModal} className="w-full max-w-lg mx-auto">
        <div className="p-5 sm:p-6">
          <div className="border-b border-gray-100 pb-4 dark:border-white/[0.05]">
            <h2 className="pr-8 text-base font-bold text-gray-800 dark:text-white">
              Import dari Pengajuan Sebelumnya
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Pilih PR untuk menyalin unit, tipe pengadaan, dan item ke form ini.
            </p>
          </div>

          <div className="relative mt-4">
            <input
              type="text"
              placeholder="Cari nomor PR atau unit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 text-sm focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white"
            />
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div className="custom-scrollbar mt-4 max-h-[350px] space-y-2.5 overflow-y-auto pr-1">
            {isListLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600 dark:border-brand-900/30 dark:border-t-brand-400" />
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Memuat daftar PR...
                </p>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {unitId ? "Tidak ada PR untuk unit ini." : "Tidak ada PR ditemukan."}
                </p>
              </div>
            ) : (
              filteredOptions.map((pr) => {
                const isSelected = selectedId === pr.id;
                const total = calculatePrTotal(pr);
                const itemsCount = pr.items?.length ?? 0;

                return (
                  <div
                    key={pr.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(pr.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(pr.id);
                      }
                    }}
                    onDoubleClick={() => requestLoad(pr.id)}
                    className={`group relative cursor-pointer rounded-xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-brand-500 bg-brand-50/30 shadow-xs dark:border-brand-500 dark:bg-brand-950/20"
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-white/[0.05] dark:bg-white/[0.02] dark:hover:border-white/[0.12]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-800 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                            {pr.pr_number}
                          </p>
                          <Badge
                            color={PR_STATUS_COLORS[pr.approval_status] || "light"}
                            size="sm"
                          >
                            {PR_STATUS_LABELS[pr.approval_status] || pr.approval_status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>Dibuat: {formatShortDate(pr.created_at)}</span>
                          {pr.unit?.name && (
                            <>
                              <span>·</span>
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {pr.unit.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 space-y-1 text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatIdr(total)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {itemsCount} item
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-3 space-y-2 border-t border-brand-100 pt-3 dark:border-brand-900/30">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                          Daftar item
                        </p>
                        {isDetailLoading ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Memuat detail item...
                          </p>
                        ) : previewItems.length === 0 ? (
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Tidak ada item dalam PR ini
                          </p>
                        ) : (
                          <div className="custom-scrollbar max-h-24 space-y-1.5 overflow-y-auto pr-1 text-[11px] text-gray-600 dark:text-gray-400">
                            {previewItems.map((item, idx) => (
                              <div
                                key={item.id || idx}
                                className="flex items-start justify-between gap-3"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium text-gray-800 dark:text-white/90">
                                    {getPrItemName(item)}
                                  </p>
                                  <p className="truncate text-[10px] text-gray-400 dark:text-gray-500">
                                    Vendor: {getPrItemVendorName(item)}
                                  </p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="font-semibold text-gray-800 dark:text-white/90">
                                    {formatQty(item.request_qty)} {getPrItemUom(item)}
                                  </p>
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                    @ {formatIdr(item.request_price)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {listError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{listError}</p>
          )}

          {unitId && filteredOptions.length < prs.length && prs.length > 0 && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Menampilkan PR untuk unit yang dipilih saat ini.
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end dark:border-white/[0.05]">
            <button
              type="button"
              onClick={closeModal}
              disabled={isLoadingPr}
              className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.05] dark:text-gray-300 dark:hover:bg-white/[0.05]"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSalin}
              disabled={!selectedId || isLoadingPr}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-700"
            >
              <CopyIcon className="h-3.5 w-3.5" />
              {isLoadingPr ? "Menyalin..." : "Salin ke Form"}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false);
          setPendingPrId(null);
        }}
        onConfirm={() => pendingPrId && loadPrById(pendingPrId)}
        title="Ganti isi form?"
        message="Form sudah berisi data. Menyalin PR ini akan menggantinya."
        confirmText="Ya, salin"
        cancelText="Batal"
        confirmButtonColor="warning"
        isLoading={isLoadingPr}
      />
    </>
  );
}

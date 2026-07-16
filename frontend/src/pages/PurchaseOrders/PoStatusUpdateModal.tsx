import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "../../components/ui/modal/Modal";

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

const MAX_PROOFS = 10;

function getNextStatusNames(currentName: string | undefined, map: Record<string, string[]>): string[] {
  if (!currentName) return [];
  return map[currentName] ?? [];
}

function fileKey(file: File, index: number) {
  return `${file.name}-${file.size}-${file.lastModified}-${index}`;
}

export interface PoStatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusType: "delivery" | "payment";
  subtitle: string;
  roleHint: string;
  allStatuses: StatusOption[];
  currentStatusId?: number | null;
  onSubmit: (payload: { statusId: number; notes: string; proofs: File[] }) => Promise<void>;
  isSubmitting?: boolean;
}

export default function PoStatusUpdateModal({
  isOpen,
  onClose,
  statusType,
  subtitle,
  roleHint,
  allStatuses,
  currentStatusId,
  onSubmit,
  isSubmitting = false,
}: PoStatusUpdateModalProps) {
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [proofs, setProofs] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [proofLimitMessage, setProofLimitMessage] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const currentName = allStatuses.find((s) => s.id === currentStatusId)?.name;
  const nextNames = getNextStatusNames(
    currentName,
    statusType === "delivery" ? DELIVERY_NEXT : PAYMENT_NEXT
  );
  const selectableStatuses = allStatuses.filter((s) => nextNames.includes(s.name));
  const selectedStatus = selectedId !== "" ? allStatuses.find((s) => s.id === selectedId) : null;
  const hasChange = selectedId !== "" && selectedId !== (currentStatusId ?? "");
  const atProofLimit = proofs.length >= MAX_PROOFS;

  const resetFileInputs = () => {
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  useEffect(() => {
    if (!isOpen) {
      setSelectedId("");
      setNotes("");
      setProofLimitMessage(null);
      setProofs([]);
      setPreviewUrls((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url));
        return [];
      });
      resetFileInputs();
    }
  }, [isOpen]);

  const addProofFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const incoming = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (incoming.length === 0) return;

    const remaining = MAX_PROOFS - proofs.length;
    if (remaining <= 0) {
      setProofLimitMessage(`Maksimal ${MAX_PROOFS} gambar bukti`);
      resetFileInputs();
      return;
    }

    const toAdd = incoming.slice(0, remaining);
    if (toAdd.length < incoming.length) {
      setProofLimitMessage(`Hanya ${toAdd.length} gambar ditambahkan (maks. ${MAX_PROOFS})`);
    } else {
      setProofLimitMessage(null);
    }

    const newUrls = toAdd.map((f) => URL.createObjectURL(f));
    setProofs((prev) => [...prev, ...toAdd]);
    setPreviewUrls((prev) => [...prev, ...newUrls]);
    resetFileInputs();
  };

  const removeProofAt = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setProofs((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    setProofLimitMessage(null);
    resetFileInputs();
  };

  const handleSubmit = async () => {
    if (selectedId === "" || !hasChange) return;
    await onSubmit({
      statusId: Number(selectedId),
      notes: notes.trim(),
      proofs,
    });
    onClose();
  };

  const modalTitle = useMemo(() => {
    if (statusType === "delivery") return "Perbarui Status Pengiriman";
    return "Perbarui Status Pembayaran";
  }, [statusType]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-5 sm:p-6">
      <div className="pr-8">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{modalTitle}</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        <p className="mt-1 text-[10px] text-brand-600 dark:text-brand-400">{roleHint}</p>
      </div>

      <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs dark:bg-white/[0.04]">
        <span className="text-gray-500 dark:text-gray-400">Status saat ini: </span>
        <span className="font-semibold text-gray-800 dark:text-white/90">{currentName || "-"}</span>
      </div>

      {selectableStatuses.length === 0 ? (
        <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-white/[0.04] dark:text-gray-400">
          Status <strong>{currentName}</strong> bersifat final — tidak dapat diubah lagi.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Pilih status berikutnya
            </label>
            <div className="flex flex-wrap gap-2">
              {selectableStatuses.map((status) => {
                const isSelected = selectedId === status.id;
                const isCancelled = status.name === "Dibatalkan";
                return (
                  <button
                    key={status.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setSelectedId(status.id)}
                    className={`inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold transition-colors ${
                      isSelected
                        ? "border-brand-500 bg-brand-500 text-white"
                        : isCancelled
                          ? "border-error-200 bg-error-50 text-error-700 hover:bg-error-100 dark:border-error-900/40 dark:bg-error-950/20 dark:text-error-400"
                          : "border-gray-200 bg-white text-gray-700 hover:border-brand-300 hover:bg-brand-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300"
                    }`}
                  >
                    {status.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
              Status hanya dapat maju ke tahap berikutnya dan tidak dapat dikembalikan.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Catatan <span className="font-normal normal-case">(opsional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={
                statusType === "delivery"
                  ? "Contoh: Barang diterima gudang tanggal 21/06/2026"
                  : "Contoh: Pembayaran via transfer BCA"
              }
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Upload bukti foto{" "}
              <span className="font-normal normal-case">
                (opsional, {proofs.length}/{MAX_PROOFS})
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              <label
                className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-gray-300 ${
                  atProofLimit ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Pilih dari galeri
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={atProofLimit || isSubmitting}
                  onChange={(e) => addProofFiles(e.target.files)}
                />
              </label>
              <label
                className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-brand-300 bg-brand-50 px-4 text-xs font-semibold text-brand-700 hover:bg-brand-100 dark:border-brand-900/40 dark:bg-brand-950/20 dark:text-brand-300 ${
                  atProofLimit ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Ambil dari kamera
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={atProofLimit || isSubmitting}
                  onChange={(e) => addProofFiles(e.target.files)}
                />
              </label>
            </div>
            <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
              Gambar ditambahkan satu per satu — pilih atau ambil foto berulang kali tanpa menghapus yang sudah ada.
            </p>
            {proofLimitMessage && (
              <p className="mt-1 text-[10px] text-warning-600 dark:text-warning-400">{proofLimitMessage}</p>
            )}
            {proofs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {proofs.map((file, index) => (
                  <div key={fileKey(file, index)} className="relative group">
                    <img
                      src={previewUrls[index]}
                      alt={file.name}
                      className="h-20 w-20 rounded-lg border border-gray-200 object-cover dark:border-white/[0.08]"
                    />
                    <button
                      type="button"
                      onClick={() => removeProofAt(index)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-white text-xs opacity-90 hover:bg-error-500"
                      title="Hapus"
                    >
                      ×
                    </button>
                    <p className="mt-1 max-w-[80px] truncate text-[10px] text-gray-500">{file.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.05]">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSubmitting || !hasChange}
              onClick={handleSubmit}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {isSubmitting
                ? "Menyimpan..."
                : hasChange
                  ? `Simpan → ${selectedStatus?.name}`
                  : "Pilih status"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

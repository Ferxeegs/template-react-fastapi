import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/modal/Modal";
import { formatQty } from "../PurchaseRequisitions/prUtils";

export interface PoItemQtyModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  currentQty: number;
  prQty?: number | null;
  uomLabel?: string;
  onSubmit: (payload: { qty: number; notes: string }) => Promise<void>;
  isSubmitting?: boolean;
}

export default function PoItemQtyModal({
  isOpen,
  onClose,
  productName,
  currentQty,
  prQty,
  uomLabel,
  onSubmit,
  isSubmitting = false,
}: PoItemQtyModalProps) {
  const [qtyInput, setQtyInput] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQtyInput(String(currentQty));
    setNotes("");
    setError(null);
  }, [isOpen, currentQty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(qtyInput);
    if (qtyInput.trim() === "" || Number.isNaN(qty) || qty <= 0) {
      setError("Qty harus diisi dan lebih dari 0");
      return;
    }
    if (qty === Number(currentQty)) {
      setError("Qty baru harus berbeda dari qty saat ini");
      return;
    }
    setError(null);
    await onSubmit({ qty, notes: notes.trim() });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <form onSubmit={handleSubmit} className="p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Ubah Qty Item PO</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{productName}</p>
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
          Sesuaikan qty sesuai barang yang diterima. Hanya dapat diubah sebelum status
          pengiriman menjadi Diterima/Dibatalkan (stok dicatat saat diterima).
        </p>

        <div className="mt-4 space-y-4">
          {prQty != null && (
            <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-white/[0.05] dark:bg-white/[0.02]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Qty di PR
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                {formatQty(prQty)}
                {uomLabel ? ` ${uomLabel}` : ""}
              </p>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Qty PO saat ini
            </label>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formatQty(currentQty)}
              {uomLabel ? ` ${uomLabel}` : ""}
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Qty PO baru <span className="text-red-500">*</span>
              {uomLabel ? (
                <span className="ml-1 font-normal text-gray-400">({uomLabel})</span>
              ) : null}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min={0.0001}
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white"
              placeholder="0"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Catatan (opsional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Alasan perubahan qty (mis. kurang/lebih kirim)..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 dark:border-white/[0.08] dark:text-gray-300"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {isSubmitting ? "Menyimpan..." : "Simpan Qty"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

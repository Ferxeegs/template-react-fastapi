import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/modal/Modal";
import {
  formatIdr,
  formatNumberToIdrInput,
  parseIdrInputToNumberString,
} from "../PurchaseRequisitions/prUtils";

export interface PoItemPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  currentPrice: number;
  prPrice?: number | null;
  onSubmit: (payload: { price: number; notes: string }) => Promise<void>;
  isSubmitting?: boolean;
}

export default function PoItemPriceModal({
  isOpen,
  onClose,
  productName,
  currentPrice,
  prPrice,
  onSubmit,
  isSubmitting = false,
}: PoItemPriceModalProps) {
  const [priceInput, setPriceInput] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPriceInput(formatNumberToIdrInput(currentPrice));
    setNotes("");
    setError(null);
  }, [isOpen, currentPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseIdrInputToNumberString(priceInput);
    const price = Number(parsed);
    if (!parsed || Number.isNaN(price) || price < 0) {
      setError("Harga harus diisi dan tidak boleh negatif");
      return;
    }
    if (price === currentPrice) {
      setError("Harga baru harus berbeda dari harga saat ini");
      return;
    }
    setError(null);
    await onSubmit({ price, notes: notes.trim() });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <form onSubmit={handleSubmit} className="p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Ubah Harga Item PO</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{productName}</p>
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
          Hanya dapat diubah oleh Finance sebelum item ditandai Lunas.
        </p>

        <div className="mt-4 space-y-4">
          {prPrice != null && (
            <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-white/[0.05] dark:bg-white/[0.02]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Harga di PR</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{formatIdr(prPrice)}</p>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Harga PO saat ini
            </label>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatIdr(currentPrice)}</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Harga PO baru <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={priceInput}
              onChange={(e) => setPriceInput(formatNumberToIdrInput(parseIdrInputToNumberString(e.target.value)))}
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
              placeholder="Alasan perubahan harga..."
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
            {isSubmitting ? "Menyimpan..." : "Simpan Harga"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

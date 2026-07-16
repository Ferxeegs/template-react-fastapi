import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import { unitAPI } from "../../utils/api";
import { PencilIcon, TrashBinIcon, PlusIcon } from "../../icons";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Modal, ConfirmModal, LoadingModal } from "../../components/ui/modal";
import { Select } from "../../components/ui/Select";
import { formatDateTime } from "../../utils/dateTime";

interface Unit {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  parent?: {
    id: string;
    name: string;
  } | null;
  children?: Array<{
    id: string;
    name: string;
  }>;
}

export default function UnitsList() {
  const { hasPermission } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  const [units, setUnits] = useState<Unit[]>([]);
  const [allUnitsForParent, setAllUnitsForParent] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Permissions check
  const canCreateUnit = hasPermission("create_unit");
  const canUpdateUnit = hasPermission("update_unit");
  const canDeleteUnit = hasPermission("delete_unit");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // Form State
  const [unitName, setUnitName] = useState("");
  const [parentUnitId, setParentUnitId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUnits = async (forceLoading = false) => {
    if (forceLoading || units.length === 0) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const response = await unitAPI.getAllUnits({
        page,
        limit: 10,
        search: debouncedSearch.trim() || undefined,
      });

      if (response.success && response.data) {
        setUnits(response.data.units);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      } else {
        setError(response.message || "Gagal mengambil data units");
      }
    } catch (err: any) {
      setError("Terjadi kesalahan saat mengambil data.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllUnitsForParent = async () => {
    try {
      const response = await unitAPI.getAllUnits({ all: true });
      if (response.success && response.data) {
        setAllUnitsForParent(response.data.units);
      }
    } catch (err) {
      console.error("Gagal mengambil daftar parent:", err);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchUnits(false);
  }, [page, debouncedSearch]);

  // Handle open create modal
  const handleOpenCreate = () => {
    setUnitName("");
    setParentUnitId(null);
    setFormError(null);
    fetchAllUnitsForParent();
    setIsCreateOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (unit: Unit) => {
    setSelectedUnit(unit);
    setUnitName(unit.name);
    setParentUnitId(unit.parent_id);
    setFormError(null);
    fetchAllUnitsForParent();
    setIsEditOpen(true);
  };

  // Handle open delete confirmation
  const handleOpenDelete = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsDeleteOpen(true);
  };

  // Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!unitName.trim()) {
      setFormError("Nama unit tidak boleh kosong");
      return;
    }
    setIsSubmitLoading(true);
    try {
      const response = await unitAPI.createUnit({
        name: unitName.trim(),
        parent_id: parentUnitId || null,
      });

      if (response.success) {
        showSuccess("Unit berhasil ditambahkan!");
        setIsCreateOpen(false);
        fetchUnits(true);
      } else {
        setFormError(response.message || "Gagal menambahkan unit");
      }
    } catch (err: any) {
      setFormError("Terjadi kesalahan koneksi.");
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!selectedUnit) return;
    if (!unitName.trim()) {
      setFormError("Nama unit tidak boleh kosong");
      return;
    }
    setIsSubmitLoading(true);
    try {
      const response = await unitAPI.updateUnit(selectedUnit.id, {
        name: unitName.trim(),
        parent_id: parentUnitId || null,
      });

      if (response.success) {
        showSuccess("Unit berhasil diperbarui!");
        setIsEditOpen(false);
        fetchUnits(true);
      } else {
        setFormError(response.message || "Gagal memperbarui unit");
      }
    } catch (err: any) {
      setFormError("Terjadi kesalahan koneksi.");
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!selectedUnit) return;
    setIsSubmitLoading(true);
    try {
      const response = await unitAPI.deleteUnit(selectedUnit.id);
      if (response.success) {
        showSuccess("Unit berhasil dihapus!");
        setIsDeleteOpen(false);
        fetchUnits(true);
      } else {
        showError(response.message || "Gagal menghapus unit");
      }
    } catch (err: any) {
      showError("Terjadi kesalahan koneksi.");
    } finally {
      setIsSubmitLoading(false);
      setSelectedUnit(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Cari unit/departemen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 rounded-lg border border-gray-200 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
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
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
            Total: {pagination.total} unit kerja
          </div>
          {canCreateUnit && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Tambah Unit Kerja
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {units.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500 dark:text-gray-400 text-sm text-center">
              {search ? "Tidak ada unit kerja yang ditemukan" : "Belum ada unit kerja"}
            </div>
          </div>
        ) : (
          units.map((unit) => (
            <div
              key={unit.id}
              className="p-4 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-white/90 text-base">
                    {unit.name}
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Dibuat: {formatDateTime(unit.created_at)}
                  </p>
                </div>
                {unit.parent ? (
                  <Badge size="sm" color="info">
                    Induk: {unit.parent.name}
                  </Badge>
                ) : (
                  <Badge size="sm" color="light">
                    Unit Utama (Root)
                  </Badge>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                {canUpdateUnit && (
                  <button
                    onClick={() => handleOpenEdit(unit)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
                {canDeleteUnit && (
                  <button
                    onClick={() => handleOpenDelete(unit)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg"
                  >
                    <TrashBinIcon className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          {units.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                {search ? "Tidak ada unit kerja yang ditemukan" : "Belum ada unit kerja"}
              </div>
            </div>
          ) : (
            <Table className="w-full table-fixed border-collapse">
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Nama Unit/Departemen
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[200px]">
                    Unit Induk (Parent)
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[200px]">
                    Tanggal Dibuat
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[200px]">
                    Terakhir Diupdate
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[150px]">
                    Aksi
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {units.map((unit) => (
                  <TableRow key={unit.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <TableCell className="px-5 py-4 font-medium text-gray-800 dark:text-white/90">
                      {unit.name}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      {unit.parent ? (
                        <Badge size="sm" color="info">
                          {unit.parent.name}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(unit.created_at)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(unit.updated_at)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {canUpdateUnit && (
                          <button
                            onClick={() => handleOpenEdit(unit)}
                            className="p-1.5 text-gray-500 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            title="Edit Unit Kerja"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canDeleteUnit && (
                          <button
                            onClick={() => handleOpenDelete(unit)}
                            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            title="Hapus Unit Kerja"
                          >
                            <TrashBinIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
            Menampilkan {((page - 1) * pagination.limit) + 1} - {Math.min(page * pagination.limit, pagination.total)} dari {pagination.total}
          </div>
          <div className="flex gap-2 justify-center sm:justify-end">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} className="w-full max-w-lg mx-auto">
        <form onSubmit={handleCreateSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
              Tambah Unit Kerja Baru
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Tambahkan unit kerja, departemen, atau divisi baru ke dalam sistem.
            </p>
          </div>

          {formError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Nama Unit/Departemen <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                className="w-full h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                placeholder="Misal: Bakso - Cabang A"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Unit Induk (Parent Unit - Opsional)
              </label>
              <Select
                value={parentUnitId || ""}
                onChange={(v) => setParentUnitId(v === "" ? null : String(v))}
                placeholder="-- Tanpa Unit Induk (Root) --"
                allowEmpty
                emptyLabel="-- Tanpa Unit Induk (Root) --"
                options={allUnitsForParent.map((u) => ({ value: u.id, label: u.name }))}
              />
              <p className="text-xs text-gray-400 mt-1">
                Gunakan jika unit ini merupakan sub-bagian dari divisi/departemen yang lebih besar (Misal: "IT Infrastructure" di bawah divisi "Information Technology").
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitLoading}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitLoading}
              className="px-4 py-2.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50"
            >
              {isSubmitLoading ? "Menyimpan..." : "Tambah Unit Kerja"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} className="w-full max-w-lg mx-auto">
        <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
              Edit Unit Kerja / Departemen
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Perbarui rincian unit kerja yang sudah ada.
            </p>
          </div>

          {formError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Nama Unit/Departemen <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                className="w-full h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                placeholder="Misal: Bakso - Cabang A"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Unit Induk (Parent Unit - Opsional)
              </label>
              <Select
                value={parentUnitId || ""}
                onChange={(v) => setParentUnitId(v === "" ? null : String(v))}
                placeholder="-- Tanpa Unit Induk (Root) --"
                allowEmpty
                emptyLabel="-- Tanpa Unit Induk (Root) --"
                options={allUnitsForParent
                  .filter((u) => u.id !== selectedUnit?.id)
                  .map((u) => ({ value: u.id, label: u.name }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              disabled={isSubmitLoading}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitLoading}
              className="px-4 py-2.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50"
            >
              {isSubmitLoading ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Unit Kerja"
        message={`Apakah Anda yakin ingin menghapus unit/departemen "${selectedUnit?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        cancelText="Batal"
        confirmButtonColor="danger"
        isLoading={isSubmitLoading}
      />
      <LoadingModal isOpen={isLoading} />
    </div>
  );
}

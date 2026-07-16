import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import { uomAPI, type Uom } from "../../utils/api";
import { PencilIcon, TrashBinIcon, PlusIcon } from "../../icons";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Modal, ConfirmModal, LoadingModal } from "../../components/ui/modal";
import { Select } from "../../components/ui/Select";
import { formatDateTime } from "../../utils/dateTime";

export default function UomsList() {
  const { hasPermission } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  const [uoms, setUoms] = useState<Uom[]>([]);
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

  const canCreate = hasPermission("create_uom");
  const canUpdate = hasPermission("update_uom");
  const canDelete = hasPermission("delete_uom");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUom, setSelectedUom] = useState<Uom | null>(null);

  const [name, setName] = useState("");
  const [shortname, setShortname] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUoms = async (forceLoading = false) => {
    if (forceLoading || uoms.length === 0) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const response = await uomAPI.getAllUoms({
        page,
        limit: 10,
        search: debouncedSearch.trim() || undefined,
      });

      if (response.success && response.data) {
        setUoms(response.data.uoms);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      } else {
        setError(response.message || "Gagal mengambil data satuan");
      }
    } catch (err) {
      setError("Terjadi kesalahan saat mengambil data.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchUoms(false);
  }, [page, debouncedSearch]);

  const resetForm = () => {
    setName("");
    setShortname("");
    setIsActive(true);
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (uom: Uom) => {
    setSelectedUom(uom);
    setName(uom.name);
    setShortname(uom.shortname);
    setIsActive(uom.is_active);
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleOpenDelete = (uom: Uom) => {
    setSelectedUom(uom);
    setIsDeleteOpen(true);
  };

  const validateForm = () => {
    if (!name.trim()) {
      setFormError("Nama satuan tidak boleh kosong");
      return false;
    }
    if (!shortname.trim()) {
      setFormError("Singkatan tidak boleh kosong");
      return false;
    }
    return true;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validateForm()) return;

    setIsSubmitLoading(true);
    try {
      const response = await uomAPI.createUom({
        name: name.trim(),
        shortname: shortname.trim(),
        is_active: isActive,
      });

      if (response.success) {
        showSuccess("Satuan berhasil ditambahkan!");
        setIsCreateOpen(false);
        fetchUoms(true);
      } else {
        setFormError(response.message || "Gagal menambahkan satuan");
      }
    } catch {
      setFormError("Terjadi kesalahan koneksi.");
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!selectedUom) return;
    if (!validateForm()) return;

    setIsSubmitLoading(true);
    try {
      const response = await uomAPI.updateUom(selectedUom.id, {
        name: name.trim(),
        shortname: shortname.trim(),
        is_active: isActive,
      });

      if (response.success) {
        showSuccess("Satuan berhasil diperbarui!");
        setIsEditOpen(false);
        fetchUoms(true);
      } else {
        setFormError(response.message || "Gagal memperbarui satuan");
      }
    } catch {
      setFormError("Terjadi kesalahan koneksi.");
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUom) return;
    setIsSubmitLoading(true);
    try {
      const response = await uomAPI.deleteUom(selectedUom.id);
      if (response.success) {
        showSuccess("Satuan berhasil dihapus!");
        setIsDeleteOpen(false);
        fetchUoms(true);
      } else {
        showError(response.message || "Gagal menghapus satuan");
      }
    } catch {
      showError("Terjadi kesalahan koneksi.");
    } finally {
      setIsSubmitLoading(false);
      setSelectedUom(null);
    }
  };

  const formFields = (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Nama Satuan <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
          placeholder="Misal: Pieces, Kilogram, Liter"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Singkatan <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={shortname}
          onChange={(e) => setShortname(e.target.value)}
          className="w-full h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
          placeholder="Misal: pcs, kg, ltr"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Status
        </label>
        <Select
          value={isActive ? "true" : "false"}
          onChange={(v) => setIsActive(v === "true")}
          options={[
            { value: "true", label: "Aktif" },
            { value: "false", label: "Non-Aktif" },
          ]}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Cari satuan..."
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
            Total: {pagination.total} satuan
          </div>
          {canCreate && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Tambah Satuan
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
          {error}
        </div>
      )}

      <div className="block md:hidden space-y-3">
        {uoms.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-500 dark:text-gray-400 text-center">
            {search ? "Tidak ada satuan yang ditemukan" : "Belum ada satuan"}
          </div>
        ) : (
          uoms.map((uom) => (
            <div
              key={uom.id}
              className="p-4 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-white/90">{uom.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Singkatan: <span className="font-mono">{uom.shortname}</span>
                  </p>
                </div>
                <Badge size="sm" color={uom.is_active ? "success" : "light"}>
                  {uom.is_active ? "Aktif" : "Non-Aktif"}
                </Badge>
              </div>
              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                {canUpdate && (
                  <button
                    onClick={() => handleOpenEdit(uom)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleOpenDelete(uom)}
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

      <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          {uoms.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              {search ? "Tidak ada satuan yang ditemukan" : "Belum ada satuan"}
            </div>
          ) : (
            <Table className="min-w-[900px] w-full table-fixed border-collapse">
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[240px]">
                    Nama Satuan
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[120px]">
                    Singkatan
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[110px]">
                    Status
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[200px]">
                    Dibuat
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[150px]">
                    Aksi
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {uoms.map((uom) => (
                  <TableRow key={uom.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <TableCell className="px-5 py-4 font-medium text-gray-800 dark:text-white/90">
                      {uom.name}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center text-sm font-mono text-gray-600 dark:text-gray-300">
                      {uom.shortname}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <Badge size="sm" color={uom.is_active ? "success" : "light"}>
                        {uom.is_active ? "Aktif" : "Non-Aktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(uom.created_at)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {canUpdate && (
                          <button
                            onClick={() => handleOpenEdit(uom)}
                            className="p-1.5 text-gray-500 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            title="Edit Satuan"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleOpenDelete(uom)}
                            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            title="Hapus Satuan"
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

      {pagination.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
            Menampilkan {(page - 1) * pagination.limit + 1} -{" "}
            {Math.min(page * pagination.limit, pagination.total)} dari {pagination.total}
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

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} className="w-full max-w-lg mx-auto">
        <form onSubmit={handleCreateSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Tambah Satuan Baru</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Tambahkan satuan ukur untuk produk seperti pcs, kg, atau liter.
            </p>
          </div>
          {formError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
              {formError}
            </div>
          )}
          {formFields}
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
              {isSubmitLoading ? "Menyimpan..." : "Tambah Satuan"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} className="w-full max-w-lg mx-auto">
        <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Edit Satuan</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Perbarui nama, singkatan, atau status satuan.
            </p>
          </div>
          {formError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
              {formError}
            </div>
          )}
          {formFields}
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

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Satuan"
        message={`Apakah Anda yakin ingin menghapus satuan "${selectedUom?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        cancelText="Batal"
        confirmButtonColor="danger"
        isLoading={isSubmitLoading}
      />
      <LoadingModal isOpen={isLoading} />
    </div>
  );
}

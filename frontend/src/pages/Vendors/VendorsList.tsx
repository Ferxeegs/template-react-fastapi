import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import { vendorAPI, unitAPI, type Vendor } from "../../utils/api";
import { PencilIcon, TrashBinIcon, PlusIcon } from "../../icons";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Modal, ConfirmModal, LoadingModal } from "../../components/ui/modal";
import { Select } from "../../components/ui/Select";

interface UnitOption {
  id: string;
  name: string;
}

interface StatusOption {
  id: number;
  status_name: string;
}

function findActiveStatusId(statusList: StatusOption[]): number | null {
  return statusList.find((s) => s.status_name.toLowerCase() === "active")?.id ?? null;
}

export default function VendorsList() {
  const { hasPermission } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [statuses, setStatuses] = useState<StatusOption[]>([]);
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
  const canCreate = hasPermission("create_vendor");
  const canUpdate = hasPermission("update_vendor");
  const canDelete = hasPermission("delete_vendor");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Form State
  const [companyName, setCompanyName] = useState("");
  const [unitId, setUnitId] = useState<string | null>(null);
  const [vendorStatusId, setVendorStatusId] = useState<number | null>(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const fetchVendors = async (forceLoading = false) => {
    if (forceLoading || vendors.length === 0) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const response = await vendorAPI.getAllVendors({
        page,
        limit: 10,
        search: debouncedSearch.trim() || undefined,
      });

      if (response.success && response.data) {
        setVendors(response.data.vendors);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      } else {
        setError(response.message || "Gagal mengambil data vendor");
      }
    } catch (err: any) {
      setError("Terjadi kesalahan saat mengambil data.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFormOptions = async (): Promise<{
    units: UnitOption[];
    statuses: StatusOption[];
  }> => {
    try {
      const [unitsRes, statusesRes] = await Promise.all([
        unitAPI.getAllUnits({ all: true }),
        vendorAPI.getStatuses()
      ]);
      const units = unitsRes.success && unitsRes.data ? unitsRes.data.units : [];
      const statuses = statusesRes.success && statusesRes.data ? statusesRes.data.statuses : [];
      setUnits(units);
      setStatuses(statuses);
      return { units, statuses };
    } catch (err) {
      console.error("Gagal mengambil opsi form:", err);
      return { units: [], statuses: [] };
    }
  };

  const isCreateUnitLocked = isCreateOpen && units.length === 1;
  const isCreateStatusLocked = isCreateOpen && findActiveStatusId(statuses) !== null;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchVendors(false);
  }, [page, debouncedSearch]);

  // Handle open create modal
  const handleOpenCreate = async () => {
    setCompanyName("");
    setUnitId(null);
    setVendorStatusId(null);
    setPhone("");
    setAddress("");
    setFormError(null);
    const { units: loadedUnits, statuses: loadedStatuses } = await fetchFormOptions();
    setUnitId(loadedUnits.length === 1 ? loadedUnits[0].id : null);
    setVendorStatusId(findActiveStatusId(loadedStatuses));
    setIsCreateOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setCompanyName(vendor.company_name);
    setUnitId(vendor.unit_id);
    setVendorStatusId(vendor.vendor_status_id);
    setPhone(vendor.phone || "");
    setAddress(vendor.address || "");
    setFormError(null);
    fetchFormOptions();
    setIsEditOpen(true);
  };

  // Handle open delete confirmation
  const handleOpenDelete = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsDeleteOpen(true);
  };

  // Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!companyName.trim()) {
      setFormError("Nama perusahaan tidak boleh kosong");
      return;
    }
    if (!unitId) {
      setFormError("Unit wajib dipilih");
      return;
    }
    setIsSubmitLoading(true);
    try {
      const response = await vendorAPI.createVendor({
        company_name: companyName.trim(),
        unit_id: unitId || null,
        vendor_status_id: vendorStatusId || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
      });

      if (response.success) {
        showSuccess("Vendor berhasil ditambahkan!");
        setIsCreateOpen(false);
        fetchVendors(true);
      } else {
        setFormError(response.message || "Gagal menambahkan vendor");
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
    if (!selectedVendor) return;
    if (!companyName.trim()) {
      setFormError("Nama perusahaan tidak boleh kosong");
      return;
    }
    setIsSubmitLoading(true);
    try {
      const response = await vendorAPI.updateVendor(selectedVendor.id, {
        company_name: companyName.trim(),
        unit_id: unitId || null,
        vendor_status_id: vendorStatusId || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
      });

      if (response.success) {
        showSuccess("Vendor berhasil diperbarui!");
        setIsEditOpen(false);
        fetchVendors(true);
      } else {
        setFormError(response.message || "Gagal memperbarui vendor");
      }
    } catch (err: any) {
      setFormError("Terjadi kesalahan koneksi.");
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!selectedVendor) return;
    setIsSubmitLoading(true);
    try {
      const response = await vendorAPI.deleteVendor(selectedVendor.id);
      if (response.success) {
        showSuccess("Vendor berhasil dihapus!");
        setIsDeleteOpen(false);
        fetchVendors(true);
      } else {
        showError(response.message || "Gagal menghapus vendor");
      }
    } catch (err: any) {
      showError("Terjadi kesalahan koneksi.");
    } finally {
      setIsSubmitLoading(false);
      setSelectedVendor(null);
    }
  };

  const getBadgeColor = (statusName: string | undefined | null) => {
    if (!statusName) return "light";
    const name = statusName.toLowerCase();
    if (name === "active") return "success";
    if (name === "pending") return "warning";
    if (name === "blacklisted") return "error";
    return "light";
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Cari vendor..."
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
            Total: {pagination.total} vendor
          </div>
          {canCreate && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Tambah Vendor
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
        {vendors.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500 dark:text-gray-400 text-sm text-center">
              {search ? "Tidak ada vendor yang ditemukan" : "Belum ada vendor"}
            </div>
          </div>
        ) : (
          vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="p-4 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-white/90 text-base">
                    {vendor.company_name}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Tlp: {vendor.phone || "-"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Unit: {vendor.unit?.name || "-"}
                  </p>
                </div>
                <Badge size="sm" color={getBadgeColor(vendor.status?.status_name)}>
                  {vendor.status?.status_name || "Unknown"}
                </Badge>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                {canUpdate && (
                  <button
                    onClick={() => handleOpenEdit(vendor)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleOpenDelete(vendor)}
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
          {vendors.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                {search ? "Tidak ada vendor yang ditemukan" : "Belum ada vendor"}
              </div>
            </div>
          ) : (
            <Table className="min-w-[1020px] w-full table-fixed border-collapse">
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[220px]">
                    Nama Perusahaan / Vendor
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[150px]">
                    Status
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[180px]">
                    Departemen / Unit
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[150px]">
                    Telepon
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[200px]">
                    Alamat
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[120px]">
                    Aksi
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {vendors.map((vendor) => (
                  <TableRow key={vendor.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <TableCell className="px-5 py-4 font-semibold text-gray-800 dark:text-white/90">
                      {vendor.company_name}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <Badge size="sm" color={getBadgeColor(vendor.status?.status_name)}>
                        {vendor.status?.status_name || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                      {vendor.unit?.name || "-"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {vendor.phone || "-"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-left text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title={vendor.address || ""}>
                      {vendor.address || "-"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {canUpdate && (
                          <button
                            onClick={() => handleOpenEdit(vendor)}
                            className="p-1.5 text-gray-500 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            title="Edit Vendor"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleOpenDelete(vendor)}
                            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            title="Hapus Vendor"
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
              Tambah Vendor Baru
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Tambahkan partner atau pemasok baru ke dalam sistem.
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
                Nama Perusahaan / Vendor <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                placeholder="Misal: PT. Maju Jaya Sentosa"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Status Vendor
                </label>
                <Select
                  value={vendorStatusId || ""}
                  onChange={(v) => setVendorStatusId(v === "" ? null : Number(v))}
                  disabled={isCreateStatusLocked}
                  placeholder="-- Pilih Status --"
                  allowEmpty={!isCreateStatusLocked}
                  emptyLabel="-- Pilih Status --"
                  options={statuses.map((s) => ({ value: s.id, label: s.status_name }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Departemen / Unit Kerja <span className="text-red-500">*</span>
                </label>
                <Select
                  value={unitId || ""}
                  onChange={(v) => setUnitId(v === "" ? null : String(v))}
                  disabled={isCreateUnitLocked}
                  required
                  placeholder="-- Pilih Unit Kerja --"
                  allowEmpty={!isCreateUnitLocked}
                  emptyLabel="-- Pilih Unit Kerja --"
                  options={units.map((u) => ({ value: u.id, label: u.name }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Nomor Telepon
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                placeholder="Misal: 0821689387..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Alamat Vendor
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                placeholder="Tulis alamat vendor..."
              />
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
              {isSubmitLoading ? "Menyimpan..." : "Tambah Vendor"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} className="w-full max-w-lg mx-auto">
        <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
              Edit Rincian Vendor
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Perbarui profil dan rincian kontak vendor.
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
                Nama Perusahaan / Vendor <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                placeholder="PT. Maju Jaya"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Status Vendor
                </label>
                <Select
                  value={vendorStatusId || ""}
                  onChange={(v) => setVendorStatusId(v === "" ? null : Number(v))}
                  placeholder="-- Pilih Status --"
                  allowEmpty
                  emptyLabel="-- Pilih Status --"
                  options={statuses.map((s) => ({ value: s.id, label: s.status_name }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Departemen / Unit Kerja
                </label>
                <Select
                  value={unitId || ""}
                  onChange={(v) => setUnitId(v === "" ? null : String(v))}
                  placeholder="-- Pilih Unit Kerja --"
                  allowEmpty
                  emptyLabel="-- Pilih Unit Kerja --"
                  options={units.map((u) => ({ value: u.id, label: u.name }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Nomor Telepon
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                placeholder="021-..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Alamat Kantor
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                placeholder="Alamat lengkap..."
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
        title="Hapus Vendor"
        message={`Apakah Anda yakin ingin menghapus vendor "${selectedVendor?.company_name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        cancelText="Batal"
        confirmButtonColor="danger"
        isLoading={isSubmitLoading}
      />
      <LoadingModal isOpen={isLoading} />
    </div>
  );
}

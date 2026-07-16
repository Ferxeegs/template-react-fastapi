import { useState, useEffect } from "react";
import { roleScopeAPI, unitAPI } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useModal } from "../../hooks/useModal";
import { Modal, ConfirmModal, LoadingModal } from "../../components/ui/modal";
import { Select } from "../../components/ui/Select";
import Badge from "../../components/ui/badge/Badge";
import { CheckLineIcon, PencilIcon, InfoIcon, TrashBinIcon, PlusIcon } from "../../icons";
import { formatDateTime } from "../../utils/dateTime";

interface Scope {
  id: string;
  name: string;
}

interface UserRoleScope {
  user_role_id: number;
  user_id: string;
  username: string;
  fullname: string | null;
  created_at: string | null;
  role_id: number;
  role_name: string;
  scopes: Scope[];
}

interface Unit {
  id: string;
  name: string;
}

export default function RoleScopesList() {
  const { hasPermission } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  const [roleScopes, setRoleScopes] = useState<UserRoleScope[]>([]);
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  
  // Search & Pagination state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Edit Scope Modal state
  const { isOpen: isEditOpen, openModal: openEdit, closeModal: closeEdit } = useModal();
  const [editingAssignment, setEditingAssignment] = useState<UserRoleScope | null>(null);
  const [selectedScopeIds, setSelectedScopeIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Reset/Delete Scope Modal state
  const { isOpen: isConfirmOpen, openModal: openConfirm, closeModal: closeConfirm } = useModal();
  const [resetAssignment, setResetAssignment] = useState<UserRoleScope | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Create/Add Scope Modal state
  const { isOpen: isCreateOpen, openModal: openCreate, closeModal: closeCreate } = useModal();
  const [unscopedAssignments, setUnscopedAssignments] = useState<UserRoleScope[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | "">("");
  const [selectedCreateScopeIds, setSelectedCreateScopeIds] = useState<string[]>([]);
  const [isFetchingUnscoped, setIsFetchingUnscoped] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const canUpdateScope = hasPermission("update_role_scope");

  // Debounced search effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    fetchRoleScopes();
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchRoleScopes = async () => {
    setIsFetching(true);
    try {
      const response = await roleScopeAPI.getRoleScopes({
        page,
        limit,
        search: debouncedSearch,
        has_scope: true,
      });

      if (response.success && response.data) {
        setRoleScopes(response.data.role_scopes);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages);
          setTotalItems(response.data.pagination.total);
        }
      } else {
        showError(response.message || "Gagal mengambil data scope.");
      }
    } catch (err) {
      console.error("Fetch role scopes list error:", err);
      showError("Terjadi kesalahan koneksi saat memuat data.");
    } finally {
      setIsFetching(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await unitAPI.getAllUnits({ all: true });
      if (response.success && response.data) {
        setAllUnits(response.data.units);
      }
    } catch (err) {
      console.error("Fetch units error:", err);
    }
  };

  const handleEditClick = (assignment: UserRoleScope) => {
    setEditingAssignment(assignment);
    setSelectedScopeIds(assignment.scopes.map((s) => s.id));
    openEdit();
  };

  const handleToggleScope = (scopeId: string) => {
    setSelectedScopeIds((prev) =>
      prev.includes(scopeId)
        ? prev.filter((id) => id !== scopeId)
        : [...prev, scopeId]
    );
  };

  const handleSaveScopes = async () => {
    if (!editingAssignment || !canUpdateScope) return;

    setIsSaving(true);
    try {
      const response = await roleScopeAPI.updateRoleScopes(
        editingAssignment.user_role_id,
        selectedScopeIds
      );

      if (response.success) {
        showSuccess("Hak akses unit kerja berhasil diperbarui!");
        closeEdit();
        fetchRoleScopes();
      } else {
        showError(response.message || "Gagal menyimpan hak akses.");
      }
    } catch (err) {
      showError("Terjadi kesalahan koneksi.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetClick = (assignment: UserRoleScope) => {
    setResetAssignment(assignment);
    openConfirm();
  };

  const handleConfirmReset = async () => {
    if (!resetAssignment || !canUpdateScope) return;

    setIsResetting(true);
    try {
      const response = await roleScopeAPI.updateRoleScopes(
        resetAssignment.user_role_id,
        []
      );

      if (response.success) {
        showSuccess(
          `Batasan unit kerja untuk ${
            resetAssignment.fullname || resetAssignment.username
          } berhasil dihapus. Hak akses dikembalikan menjadi Global.`
        );
        closeConfirm();
        fetchRoleScopes();
      } else {
        showError(response.message || "Gagal menghapus batasan unit kerja.");
      }
    } catch (err) {
      showError("Terjadi kesalahan koneksi.");
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleCreateClick = () => {
    setSelectedAssignmentId("");
    setSelectedCreateScopeIds([]);
    openCreate();
    loadUnscopedAssignments();
  };

  const loadUnscopedAssignments = async () => {
    setIsFetchingUnscoped(true);
    try {
      const response = await roleScopeAPI.getRoleScopes({
        limit: 100,
        has_scope: false,
      });
      if (response.success && response.data) {
        setUnscopedAssignments(response.data.role_scopes);
      } else {
        showError(response.message || "Gagal memuat daftar user.");
      }
    } catch (err) {
      console.error("Fetch unscoped assignments error:", err);
      showError("Gagal memuat daftar user.");
    } finally {
      setIsFetchingUnscoped(false);
    }
  };

  const handleToggleCreateScope = (scopeId: string) => {
    setSelectedCreateScopeIds((prev) =>
      prev.includes(scopeId)
        ? prev.filter((id) => id !== scopeId)
        : [...prev, scopeId]
    );
  };

  const handleSaveCreateScope = async () => {
    if (!selectedAssignmentId || selectedCreateScopeIds.length === 0 || !canUpdateScope) {
      showError("Silakan pilih user dan minimal satu unit kerja.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await roleScopeAPI.updateRoleScopes(
        Number(selectedAssignmentId),
        selectedCreateScopeIds
      );

      if (response.success) {
        showSuccess("Hak akses unit kerja berhasil ditambahkan!");
        closeCreate();
        fetchRoleScopes();
      } else {
        showError(response.message || "Gagal menambahkan hak akses.");
      }
    } catch (err) {
      showError("Terjadi kesalahan koneksi.");
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls / Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <svg
              className="w-5 h-5"
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
          </span>
          <input
            type="text"
            placeholder="Cari user atau role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        {canUpdateScope && (
          <button
            onClick={handleCreateClick}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors shrink-0"
          >
            <PlusIcon className="w-4 h-4" />
            Tambah Scope Akses
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="border border-gray-200 rounded-xl bg-white dark:border-gray-700 dark:bg-gray-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">User</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Role</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Scope</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Created At</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {roleScopes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    Tidak ada data role scope ditemukan.
                  </td>
                </tr>
              ) : (
                roleScopes.map((rs) => (
                  <tr key={rs.user_role_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800 dark:text-white">
                        {rs.fullname || rs.username}
                      </div>
                      {/* <div className="text-xs text-gray-400">@{rs.username}</div> */}
                    </td>
                    <td className="px-6 py-4">
                      <Badge color="info">{rs.role_name}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {rs.scopes.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">Global (Semua Unit)</span>
                        ) : (
                          rs.scopes.map((s) => (
                             <Badge key={s.id} color="success">
                              {s.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDateTime(rs.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canUpdateScope && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(rs)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg dark:text-brand-400 dark:bg-brand-950/20 dark:hover:bg-brand-900/30 transition-colors"
                          >
                            <PencilIcon className="w-3.5 h-3.5" />
                            Edit Scope
                          </button>
                          {rs.scopes.length > 0 && (
                            <button
                              onClick={() => handleResetClick(rs)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg dark:text-red-400 dark:bg-red-950/20 dark:hover:bg-red-900/30 transition-colors"
                            >
                              <TrashBinIcon className="w-3.5 h-3.5" />
                              Hapus Batasan
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500">
            <div>
              Menampilkan {(page - 1) * limit + 1} - {Math.min(page * limit, totalItems)} dari {totalItems} data
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              >
                Sebelumnya
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Scope Modal */}
      <Modal isOpen={isEditOpen} onClose={closeEdit} className="max-w-xl">
        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Edit Scope Unit Kerja
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Batasi akses unit/departemen untuk user{" "}
              <strong>{editingAssignment?.fullname || editingAssignment?.username}</strong> sebagai{" "}
              <strong>{editingAssignment?.role_name}</strong>.
            </p>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-400">
            <InfoIcon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs">
              Kosongkan semua pilihan unit kerja di bawah jika ingin memberikan akses <strong>Global (Tanpa Batasan Unit)</strong>.
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Pilih Unit Kerja / Departemen:
            </label>

            {allUnits.length === 0 ? (
              <div className="text-xs text-gray-400">Belum ada unit kerja terdaftar.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                {allUnits.map((unit) => {
                  const isChecked = selectedScopeIds.includes(unit.id);
                  return (
                    <div
                      key={unit.id}
                      onClick={() => handleToggleScope(unit.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer select-none transition-colors ${
                        isChecked
                          ? "bg-brand-50/50 border-brand-200 text-brand-700 dark:bg-brand-950/20 dark:border-brand-900/50 dark:text-brand-400"
                          : "border-gray-100 hover:bg-gray-50 text-gray-700 dark:border-gray-800 dark:hover:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center w-5 h-5 border rounded ${
                          isChecked
                            ? "bg-brand-500 border-brand-500 text-white"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {isChecked && <CheckLineIcon className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-xs sm:text-sm font-medium">{unit.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={closeEdit}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              Batal
            </button>
            <button
              onClick={handleSaveScopes}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50"
            >
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={closeConfirm}
        onConfirm={handleConfirmReset}
        title="Hapus Batasan Unit Kerja"
        message={
          <span>
            Apakah Anda yakin ingin menghapus semua batasan unit kerja untuk user{" "}
            <strong>{resetAssignment?.fullname || resetAssignment?.username}</strong> sebagai{" "}
            <strong>{resetAssignment?.role_name}</strong>? Menghapus batasan ini akan mengembalikan status hak akses menjadi{" "}
            <strong>Global (dapat mengakses seluruh unit kerja)</strong>.
          </span>
        }
        confirmText="Hapus Batasan"
        cancelText="Batal"
        confirmButtonColor="danger"
        isLoading={isResetting}
        icon={
          <svg
            className="w-6 h-6 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        }
      />

      {/* Create/Add Scope Modal */}
      <Modal isOpen={isCreateOpen} onClose={closeCreate} className="max-w-xl">
        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Tambah Scope Akses Unit Kerja
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Batasi akses unit/departemen untuk user yang saat ini memiliki status Global.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Pilih User & Role:
              </label>
              {isFetchingUnscoped ? (
                <div className="text-xs text-gray-400">Memuat daftar user...</div>
              ) : unscopedAssignments.length === 0 ? (
                <div className="text-xs text-red-500 font-medium">
                  Semua user role assignment saat ini sudah memiliki batasan scope.
                </div>
              ) : (
                <Select
                  value={selectedAssignmentId}
                  onChange={(v) => setSelectedAssignmentId(v === "" ? "" : Number(v))}
                  placeholder="-- Pilih User & Role --"
                  allowEmpty
                  emptyLabel="-- Pilih User & Role --"
                  options={unscopedAssignments.map((ua) => ({
                    value: ua.user_role_id,
                    label: `${ua.fullname || ua.username} (@${ua.username}) - ${ua.role_name}`,
                  }))}
                />
              )}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Pilih Unit Kerja / Departemen:
              </label>

              {allUnits.length === 0 ? (
                <div className="text-xs text-gray-400">Belum ada unit kerja terdaftar.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                  {allUnits.map((unit) => {
                    const isChecked = selectedCreateScopeIds.includes(unit.id);
                    return (
                      <div
                        key={unit.id}
                        onClick={() => handleToggleCreateScope(unit.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer select-none transition-colors ${
                          isChecked
                            ? "bg-brand-50/50 border-brand-200 text-brand-700 dark:bg-brand-950/20 dark:border-brand-900/50 dark:text-brand-400"
                            : "border-gray-100 hover:bg-gray-50 text-gray-700 dark:border-gray-800 dark:hover:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        <div
                          className={`flex items-center justify-center w-5 h-5 border rounded ${
                            isChecked
                              ? "bg-brand-500 border-brand-500 text-white"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {isChecked && <CheckLineIcon className="w-3.5 h-3.5" />}
                        </div>
                        <span className="text-xs sm:text-sm font-medium">{unit.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={closeCreate}
              disabled={isCreating}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              Batal
            </button>
            <button
              onClick={handleSaveCreateScope}
              disabled={isCreating || !selectedAssignmentId || selectedCreateScopeIds.length === 0}
              className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50"
            >
              {isCreating ? "Menyimpan..." : "Tambah Scope"}
            </button>
          </div>
        </div>
      </Modal>
      <LoadingModal isOpen={isFetching} />
    </div>
  );
}

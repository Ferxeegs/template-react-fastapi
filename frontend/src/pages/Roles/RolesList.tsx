import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import { roleAPI } from "../../utils/api";
import { PencilIcon } from "../../icons";
import { useAuth } from "../../context/AuthContext";
import { LoadingModal } from "../../components/ui/modal";

interface Role {
  id: number;
  name: string;
  guard_name: string;
  permissions_count: number;
  users_count: number;
  permissions: Array<{
    id: number;
    name: string;
    guard_name: string;
  }>;
  created_at: string | null;
  updated_at: string | null;
}

export default function RolesList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const canUpdateRole = hasPermission("update_role");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchRoles = async (forceLoading = false) => {
    // Hanya set loading jika force loading atau benar-benar tidak ada data
    if (forceLoading || roles.length === 0) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await roleAPI.getAllRoles({
        page,
        limit: 10,
        search: debouncedSearch.trim() || undefined,
      });

      // Backend mengembalikan { status: "success", data: { roles: [...], pagination: {...} } }
      // apiRequest sudah mengkonversi ke { success: true, data: { roles: [...], pagination: {...} } }
      if (response.success && response.data) {
        setRoles(response.data.roles);
        setPagination(response.data.pagination);
      } else {
        setError(response.message || "Gagal mengambil data roles");
        console.error("Roles response:", response);
      }
    } catch (err: any) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      console.error("Fetch roles error:", err);
    } finally {
      setIsLoading(false);
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
    fetchRoles(false);
  }, [page, debouncedSearch]);

  // const formatDate = (dateString: string | null) => {
  //   if (!dateString) return "-";
  //   const date = new Date(dateString);
  //   return date.toLocaleDateString("id-ID", {
  //     year: "numeric",
  //     month: "short",
  //     day: "numeric",
  //   });
  // };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Cari role (nama, guard name)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 sm:h-11 rounded-lg border border-gray-200 bg-transparent py-2.5 pl-11 sm:pl-12 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
          <svg
            className="absolute -translate-y-1/2 left-3.5 sm:left-4 top-1/2 fill-gray-500 dark:fill-gray-400"
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
              fill=""
            />
          </svg>
        </div>
        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
          Total: {pagination.total} roles
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
        {roles.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500 dark:text-gray-400 text-sm text-center">
              {search ? "Tidak ada role yang ditemukan" : "Belum ada role"}
            </div>
          </div>
        ) : (
          roles.map((role) => {
            const isClickable = hasPermission(['view_role', 'view_any_role']);
            return (
              <div
                key={role.id}
                className={`p-4 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 transition-colors ${
                  isClickable ? "cursor-pointer active:bg-gray-50 dark:active:bg-gray-700/50" : ""
                }`}
                onClick={() => {
                  if (isClickable) {
                    navigate(`/roles/${String(role.id)}/edit`);
                  }
                }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {role.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm dark:text-white/90">
                      {role.name}
                    </p>
                    <div className="mt-1">
                      <Badge size="sm" color="info">
                        {role.guard_name}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Badge size="sm" color="primary">
                      {role.permissions_count} Permissions
                    </Badge>
                    <Badge size="sm" color="success">
                      {role.users_count} Users
                    </Badge>
                  </div>
                </div>
                {isClickable && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/roles/${String(role.id)}/edit`)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 touch-manipulation"
                    >
                      <PencilIcon className="w-3.5 h-3.5" />
                      Edit Role
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          {roles.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                {search ? "Tidak ada role yang ditemukan" : "Belum ada role"}
              </div>
            </div>
          ) : (
            <div style={{ animation: 'fadeIn 0.3s ease-in-out forwards' }}>
              <Table className="w-full table-fixed border-collapse">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[250px]">
                      Role Name
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[150px]">
                      Guard Name
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[180px]">
                      Permissions
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[150px]">
                      Users
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {roles.map((role) => {
                    const isClickable = hasPermission(['view_role', 'view_any_role']);
                    return (
                      <TableRow
                        key={role.id}
                        className={`transition-colors group ${
                          isClickable 
                            ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]" 
                            : "hover:bg-gray-50/50"
                        }`}
                        onClick={() => {
                          if (isClickable) {
                            navigate(`/roles/${String(role.id)}/edit`);
                          }
                        }}
                      >
                        {/* Kolom Role Name */}
                        <TableCell className="px-5 py-4 align-middle">
                          <div className="flex items-center gap-3 text-left w-full">
                            <div className="shrink-0 h-10 w-10 overflow-hidden rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold text-xs border border-gray-100 dark:border-gray-700">
                              {role.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <p className="font-medium text-theme-sm text-gray-800 dark:text-white/90 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                {role.name}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Kolom Guard Name */}
                        <TableCell className="px-5 py-4 text-center align-middle">
                          <div className="flex justify-center">
                            <Badge size="sm" color="info">
                              {role.guard_name}
                            </Badge>
                          </div>
                        </TableCell>

                        {/* Kolom Permissions Count */}
                        <TableCell className="px-5 py-4 text-center align-middle">
                          <div className="flex justify-center">
                            <Badge size="sm" color="primary">
                              {role.permissions_count} Permissions
                            </Badge>
                          </div>
                        </TableCell>

                        {/* Kolom Users Count */}
                        <TableCell className="px-5 py-4 text-center align-middle">
                          <div className="flex justify-center">
                            <Badge size="sm" color="success">
                              {role.users_count} Users
                            </Badge>
                          </div>
                        </TableCell>

                        {/* Kolom Aksi */}
                        <TableCell className="px-5 py-4 text-center align-middle">
                          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                            {isClickable && (
                              canUpdateRole && (
                              <button
                                type="button"
                                onClick={() => navigate(`/roles/${String(role.id)}/edit`)}
                                className="p-1.5 text-gray-500 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                title="Edit Role"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              )
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
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
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700 touch-manipulation"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700 touch-manipulation"
            >
              Next
            </button>
          </div>
        </div>
      )}
      <LoadingModal isOpen={isLoading} />
    </div>
  );
}


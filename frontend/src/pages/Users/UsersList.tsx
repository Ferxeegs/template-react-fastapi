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
import { userAPI, getBaseUrl, mediaAPI } from "../../utils/api";
import { EyeIcon, PencilIcon, TrashBinIcon, UserCircleIcon } from "../../icons";
import { useAuth } from "../../context/AuthContext";
import { ConfirmModal, LoadingModal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import { formatDateTime } from "../../utils/dateTime";
import { useToast } from "../../context/ToastContext";

interface User {
  id: string;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  fullname: string | null;
  phone_number: string | null;
  created_at: string | null;
  deleted_at?: string | null;
  profile_picture?: {
    id: number;
    url: string;
    collection: string;
    file_name: string;
    mime_type: string;
  } | null;
  roles?: Array<{
    id: number;
    name: string;
    guard_name: string;
    permissions?: Array<{
      id: number;
      name: string;
      guard_name: string;
    }>;
  }>;
}

export default function UsersList() {
  const navigate = useNavigate();
  const { impersonate, hasSuperAdminRole, hasPermission } = useAuth();
  const { success, error: showError } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null);
  const [userProfilePictures, setUserProfilePictures] = useState<Record<string, string>>({});

  // Modal states
  const { isOpen: isImpersonateModalOpen, openModal: openImpersonateModal, closeModal: closeImpersonateModal } = useModal();
  const { isOpen: isDeleteModalOpen, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal();
  const [selectedUserForImpersonate, setSelectedUserForImpersonate] = useState<{ id: string; name: string } | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<{ id: string; name: string } | null>(null);

  const fetchUserProfilePictures = async (usersList: User[]) => {
    // Fetch profile pictures for all users in parallel
    const picturePromises = usersList.map(async (user) => {
      try {
        const mediaResponse = await mediaAPI.getMediaByModel('User', user.id, 'profile-pictures');

        // Handle both array format and object with media property
        let mediaArray: any[] = [];
        if (mediaResponse.success && mediaResponse.data) {
          if (Array.isArray(mediaResponse.data)) {
            mediaArray = mediaResponse.data;
          } else if (mediaResponse.data.media && Array.isArray(mediaResponse.data.media)) {
            mediaArray = mediaResponse.data.media;
          }
        }

        if (mediaArray && mediaArray.length > 0) {
          const media = mediaArray[0];
          let mediaUrl = media.url;
          // Remove /api/v1 or /api prefix if accidentally included
          mediaUrl = mediaUrl.replace(/^\/api\/v1/, '').replace(/^\/api/, '');
          // Ensure it starts with /
          if (!mediaUrl.startsWith('/')) {
            mediaUrl = `/${mediaUrl}`;
          }
          return { userId: user.id, url: `${getBaseUrl()}${mediaUrl}` };
        }
      } catch (err) {
        // Silently fail for individual profile pictures
        console.error(`Error fetching profile picture for user ${user.id}:`, err);
      }
      return null;
    });

    const results = await Promise.all(picturePromises);
    const picturesMap: Record<string, string> = {};
    results.forEach((result) => {
      if (result) {
        picturesMap[result.userId] = result.url;
      }
    });
    setUserProfilePictures(picturesMap);
  };

  const fetchUsers = async (forceLoading = false) => {
    // Hanya set loading jika force loading atau benar-benar tidak ada data
    if (forceLoading || users.length === 0) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = showDeleted
        ? await userAPI.getDeletedUsers({
          page,
          limit: 10,
          search: debouncedSearch.trim() || undefined,
        })
        : await userAPI.getAllUsers({
          page,
          limit: 10,
          search: debouncedSearch.trim() || undefined,
        });

      // Backend mengembalikan { status: "success", data: { users: [...], pagination: {...} } }
      // apiRequest sudah mengkonversi ke { success: true, data: { users: [...], pagination: {...} } }
      if (response.success && response.data) {
        // Filter out superadmin users dari daftar
        const filteredUsers = (response.data.users as User[]).filter((user) => {
          // Cek apakah user memiliki role "superadmin"
          return !user.roles?.some((role) => role.name === "superadmin");
        });

        setUsers(filteredUsers);
        // Update pagination total untuk menghitung superadmin yang difilter
        setPagination({
          ...response.data.pagination,
          total: response.data.pagination.total - ((response.data.users as User[]).length - filteredUsers.length),
        });

        // Fetch profile pictures for all users
        fetchUserProfilePictures(filteredUsers);
      } else {
        setError(response.message || "Gagal mengambil data users");
        console.error("Users response:", response);
      }
    } catch (err: any) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      console.error("Fetch users error:", err);
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
    fetchUsers(false);
  }, [page, showDeleted, debouncedSearch]);

  const handleImpersonateClick = (userId: string, userName: string) => {
    setSelectedUserForImpersonate({ id: userId, name: userName });
    openImpersonateModal();
  };

  const handleImpersonate = async () => {
    if (!selectedUserForImpersonate) return;

    const userId = selectedUserForImpersonate.id;
    setImpersonatingUserId(userId);
    setError(null);
    closeImpersonateModal();

    try {
      await impersonate(userId);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat melakukan impersonate");
      console.error("Impersonate user error:", err);
    } finally {
      setImpersonatingUserId(null);
      setSelectedUserForImpersonate(null);
    }
  };

  const handleForceDeleteClick = (userId: string, userName: string) => {
    setSelectedUserForDelete({ id: userId, name: userName });
    openDeleteModal();
  };

  const handleForceDelete = async () => {
    if (!selectedUserForDelete) return;

    const userId = selectedUserForDelete.id;
    setDeletingUserId(userId);
    setError(null);
    closeDeleteModal();

    try {
      const response = await userAPI.forceDeleteUser(userId);

      if (response.success) {
        // Refresh list
        success("User berhasil dihapus permanen!");
        fetchUsers();
      } else {
        const errorMessage = response.message || "Gagal menghapus user permanen";
        setError(errorMessage);
        showError(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = "Terjadi kesalahan saat menghapus user permanen";
      setError(errorMessage);
      showError(errorMessage);
      console.error("Force delete user error:", err);
    } finally {
      setDeletingUserId(null);
      setSelectedUserForDelete(null);
    }
  };

  const getInitials = (user: User) => {
    if (user.fullname) {
      const names = user.fullname.split(" ");
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.fullname.substring(0, 2).toUpperCase();
    }
    if (user.firstname && user.lastname) {
      return `${user.firstname[0]}${user.lastname[0]}`.toUpperCase();
    }
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Search and Filters - Compact for Mobile */}
      <div className="flex flex-col gap-2 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Cari pengguna..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 sm:h-11 rounded-lg border border-gray-200 bg-transparent py-2 pl-10 sm:pl-12 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
          <svg
            className="absolute -translate-y-1/2 left-3 sm:left-4 top-1/2 fill-gray-500 dark:fill-gray-400"
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
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setShowDeleted(!showDeleted);
              setPage(1);
            }}
            className={`px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors touch-manipulation ${showDeleted
              ? "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700"
              }`}
          >
            <span className="hidden sm:inline">{showDeleted ? "Show Active Users" : "Show Deleted Users"}</span>
            <span className="sm:hidden">{showDeleted ? "Active" : "Deleted"}</span>
          </button>
          {hasPermission('create_user') && (
            <button
              onClick={() => navigate("/users/create")}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 touch-manipulation"
            >
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="hidden sm:inline">Create User</span>
              <span className="sm:hidden">Create</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 sm:p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Mobile Card View - Compact Design */}
      <div className="block md:hidden space-y-2">
        {users.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500 dark:text-gray-400 text-sm text-center">
              {search
                ? `Tidak ada ${showDeleted ? "pengguna yang dihapus " : ""}yang ditemukan`
                : `Belum ada ${showDeleted ? "pengguna yang dihapus " : ""}pengguna`}
            </div>
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="p-3 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 active:bg-gray-50 dark:active:bg-gray-700/50 transition-colors"
              onClick={() => navigate(`/users/${user.id}`)}
            >
              {/* Main Info Row */}
              <div className="flex items-start gap-2.5 mb-2.5">
                <div
                  className="h-10 w-10 overflow-hidden rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 mt-0.5"
                >
                  {userProfilePictures[user.id] ? (
                    <img
                      src={userProfilePictures[user.id]}
                      alt={user.fullname || `${user.firstname} ${user.lastname}`.trim() || user.username}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.textContent = getInitials(user);
                        }
                      }}
                    />
                  ) : (
                    getInitials(user)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-gray-800 text-sm dark:text-white/90 truncate flex-1">
                      {user.fullname || `${user.firstname} ${user.lastname}`.trim() || user.username}
                    </p>
                    {user.roles && user.roles.length > 0 && (
                      <div className="flex-shrink-0">
                        <Badge size="sm" color="primary">
                          {user.roles.length === 1 ? user.roles[0].name : `${user.roles.length} roles`}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-gray-500 text-xs dark:text-gray-400 break-all">
                      {user.email}
                    </span>
                    {user.phone_number && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">•</span>
                        <span className="text-gray-500 text-xs dark:text-gray-400 break-all">
                          {user.phone_number}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Secondary Info - Compact with Fixed Label Width */}
              <div className="space-y-1.5 mb-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 dark:text-gray-400 min-w-[70px]">Username:</span>
                  <span className="text-gray-800 dark:text-white font-medium flex-1 break-all">{user.username}</span>
                </div>
                {user.created_at && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 dark:text-gray-400 min-w-[70px]">Daftar:</span>
                    <span className="text-gray-800 dark:text-white font-medium flex-1">{formatDateTime(user.created_at)}</span>
                  </div>
                )}
              </div>

              {/* Actions - Compact */}
              <div className="flex items-center gap-2 pt-2.5 border-t border-gray-100 dark:border-gray-700">
                {!showDeleted && (
                  <>
                    {hasPermission(['view_user', 'view_any_user']) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/users/${user.id}`);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 touch-manipulation"
                      >
                        <EyeIcon className="w-3.5 h-3.5" />
                        View
                      </button>
                    )}
                    {hasPermission(['update_user']) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/users/${user.id}/edit`);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 touch-manipulation"
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    )}
                    {hasSuperAdminRole && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImpersonateClick(user.id, user.fullname || `${user.firstname} ${user.lastname}`.trim() || user.username);
                        }}
                        disabled={impersonatingUserId === user.id}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 touch-manipulation"
                      >
                        <UserCircleIcon className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">Impersonate</span>
                        <span className="xs:hidden">Login</span>
                      </button>
                    )}
                  </>
                )}
                {showDeleted && hasPermission(['force_delete_user', 'force_delete_any_user']) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleForceDeleteClick(user.id, user.fullname || `${user.firstname} ${user.lastname}`.trim() || user.username);
                    }}
                    disabled={deletingUserId === user.id}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  >
                    <TrashBinIcon className="w-3.5 h-3.5" />
                    {deletingUserId === user.id ? "Deleting..." : "Force Delete"}
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
          {users.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                {search
                  ? `Tidak ada ${showDeleted ? "deleted " : ""}user yang ditemukan`
                  : `Belum ada ${showDeleted ? "deleted " : ""}user`}
              </div>
            </div>
          ) : (
            <div style={{ animation: 'fadeIn 0.3s ease-in-out forwards' }}>
              <Table className="min-w-[1100px] w-full table-fixed border-collapse">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-sm font-semibold text-gray-500 dark:text-gray-400 w-[260px]">
                      User
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-sm font-semibold text-gray-500 dark:text-gray-400 w-[200px]">
                      Email
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-sm font-semibold text-gray-500 dark:text-gray-400 w-[150px]">
                      Username
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-sm font-semibold text-gray-500 dark:text-gray-400 w-[180px]">
                      Role
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-sm font-semibold text-gray-500 dark:text-gray-400 w-[160px]">
                      Tanggal Daftar
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-center text-theme-sm font-semibold text-gray-500 dark:text-gray-400 w-[150px]">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {users.map((user) => {
                    const isClickable = !showDeleted && hasPermission(['view_user', 'view_any_user']);
                    return (
                      <TableRow
                        key={user.id}
                        className={`transition-colors group ${isClickable
                            ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                            : "hover:bg-gray-50/50"
                          }`}
                        onClick={() => {
                          if (isClickable) navigate(`/users/${user.id}`);
                        }}
                      >
                        {/* Kolom User */}
                        <TableCell className="px-5 py-4 align-middle">
                          <div className="flex items-center gap-3 text-left w-full">
                            <div className="shrink-0 h-10 w-10 overflow-hidden rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold text-xs border border-gray-100 dark:border-gray-700 relative">
                              {userProfilePictures[user.id] ? (
                                <img
                                  src={userProfilePictures[user.id]}
                                  alt={user.username}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.textContent = getInitials(user);
                                    }
                                  }}
                                />
                              ) : (
                                getInitials(user)
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <p className="font-medium text-theme-sm text-gray-800 dark:text-white/90 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                {user.fullname || `${user.firstname} ${user.lastname}`.trim() || user.username}
                              </p>
                              {user.phone_number && (
                                <span className="text-gray-500 text-[11px] dark:text-gray-400 truncate">
                                  {user.phone_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Kolom Email */}
                        <TableCell className="px-5 py-4 text-center align-middle">
                          <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {user.email}
                          </div>
                        </TableCell>

                        {/* Kolom Username */}
                        <TableCell className="px-5 py-4 text-center align-middle">
                          <div className="text-sm font-mono text-gray-600 dark:text-gray-400">
                            {user.username}
                          </div>
                        </TableCell>

                        {/* Kolom Role */}
                        <TableCell className="px-5 py-4 text-center align-middle">
                          <div className="flex flex-wrap justify-center gap-1.5">
                            {user.roles && user.roles.length > 0 ? (
                              user.roles.map((role) => (
                                <Badge key={role.id} size="sm" color="primary">
                                  {role.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Kolom Tanggal */}
                        <TableCell className="px-5 py-4 text-center align-middle text-sm text-gray-500 dark:text-gray-400">
                          {formatDateTime(user.created_at)}
                        </TableCell>

                        {/* Kolom Aksi */}
                        <TableCell className="px-5 py-4 text-center align-middle">
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {!showDeleted ? (
                              <>
                                {hasPermission(['view_user', 'view_any_user']) && (
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/users/${user.id}`)}
                                    className="p-1.5 text-gray-500 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                    title="Lihat Detail"
                                  >
                                    <EyeIcon className="w-4 h-4" />
                                  </button>
                                )}
                                {hasPermission(['update_user']) && (
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/users/${user.id}/edit`)}
                                    className="p-1.5 text-gray-500 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                    title="Edit User"
                                  >
                                    <PencilIcon className="w-4 h-4" />
                                  </button>
                                )}
                                {hasSuperAdminRole && (
                                  <button
                                    type="button"
                                    onClick={() => handleImpersonateClick(user.id, user.fullname || `${user.firstname} ${user.lastname}`.trim() || user.username)}
                                    disabled={impersonatingUserId === user.id}
                                    className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors disabled:opacity-50"
                                    title="Impersonate User"
                                  >
                                    <UserCircleIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            ) : (
                              hasPermission(['force_delete_user', 'force_delete_any_user']) && (
                                <button
                                  type="button"
                                  onClick={() => handleForceDeleteClick(user.id, user.fullname || `${user.firstname} ${user.lastname}`.trim() || user.username)}
                                  disabled={deletingUserId === user.id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                  title="Hapus Permanen"
                                >
                                  <TrashBinIcon className="w-3.5 h-3.5" />
                                  {deletingUserId === user.id ? "Deleting..." : "Force Delete"}
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

      {/* Impersonate Confirmation Modal */}
      <ConfirmModal
        isOpen={isImpersonateModalOpen}
        onClose={closeImpersonateModal}
        onConfirm={handleImpersonate}
        title="Impersonate User"
        message={
          <>
            Apakah Anda yakin ingin masuk sebagai user <strong className="text-gray-800 dark:text-white">{selectedUserForImpersonate?.name}</strong>? Anda akan melihat aplikasi dari perspektif user tersebut.
          </>
        }
        confirmText="Impersonate"
        cancelText="Cancel"
        confirmButtonColor="primary"
        icon={<UserCircleIcon className="w-6 h-6" />}
        isLoading={impersonatingUserId === selectedUserForImpersonate?.id}
      />

      {/* Force Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleForceDelete}
        title="Hapus Permanen User"
        message={
          <>
            Apakah Anda yakin ingin menghapus permanen user <strong className="text-gray-800 dark:text-white">{selectedUserForDelete?.name}</strong>?
          </>
        }
        confirmText="Delete Permanently"
        cancelText="Cancel"
        confirmButtonColor="danger"
        icon={<TrashBinIcon className="w-6 h-6" />}
        isLoading={deletingUserId === selectedUserForDelete?.id}
        showWarning={true}
        warningMessage="Tindakan ini TIDAK DAPAT DIBATALKAN dan akan menghapus semua data terkait user ini secara permanen."
      />
      <LoadingModal isOpen={isLoading} />
    </div>
  );
}


import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import { userAPI, getBaseUrl, mediaAPI } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { AngleLeftIcon, PencilIcon } from "../../icons";
import Badge from "../../components/ui/badge/Badge";
import TableSkeleton from "../../components/common/TableSkeleton";
import { formatDateTime } from "../../utils/dateTime";

interface User {
  id: string;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  fullname: string | null;
  phone_number: string | null;
  email_verified_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  roles: Array<{
    id: number;
    name: string;
    guard_name: string;
  }>;
  profile_picture: {
    id: number;
    url: string;
  } | null;
}

export default function ViewUser() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchUserData();
    }
  }, [id]);

  const fetchUserData = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await userAPI.getUserById(id);
      if (response.success && response.data) {
        // Ensure profile_picture is included
        const userData = {
          ...response.data,
          profile_picture: (response.data as any).profile_picture || null,
        };
        setUser(userData as User);
        
        // Fetch profile picture from media API (same approach as ViewStudent)
        try {
          const mediaResponse = await mediaAPI.getMediaByModel('User', id, 'profile-pictures');
          
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
            
            // Use relative URL (same origin) for static files via nginx
            setProfilePictureUrl(`${getBaseUrl()}${mediaUrl}`);
          } else {
            setProfilePictureUrl(null);
          }
        } catch (mediaErr) {
          console.error('Error fetching profile picture:', mediaErr);
          setProfilePictureUrl(null);
        }
      } else {
        setError(response.message || "Gagal mengambil data user");
      }
    } catch (err: any) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      console.error("Fetch user error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getFullName = (user: User) => {
    if (user.fullname) {
      return user.fullname;
    }
    return `${user.firstname} ${user.lastname}`.trim() || user.username;
  };

  const getInitials = (user: User) => {
    const fullName = getFullName(user);
    if (fullName !== user.username) {
      const names = fullName.split(" ");
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return fullName.substring(0, 2).toUpperCase();
    }
    return user.username.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageBreadcrumb pageTitle="View User" />
        <PageMeta title="View User" description="View user details and profile information" />
        <div className="p-5 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <TableSkeleton rows={10} columns={2} />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-5">
        <PageBreadcrumb pageTitle="View User" />
        <PageMeta title="View User" description="View user details and profile information" />
        <ComponentCard title="Error">
          <div className="p-5 text-center">
            <p className="text-red-600 dark:text-red-400">{error || "User tidak ditemukan"}</p>
            <button
              onClick={() => navigate("/users")}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600"
            >
              Kembali ke Daftar User
            </button>
          </div>
        </ComponentCard>
      </div>
    );
  }

  // profilePictureUrl is now fetched separately from media API

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageBreadcrumb pageTitle="View User" />
      <PageMeta title="View User" description="View user details and profile information" />

      {/* Header - Mobile Optimized */}
      <div className="flex items-center gap-2 sm:gap-3 pb-2 sm:pb-0">
        <Link
          to="/users"
          className="inline-flex items-center justify-center w-10 h-10 text-gray-500 transition-colors rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white touch-manipulation flex-shrink-0"
        >
          <AngleLeftIcon className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-white truncate">
            {getFullName(user)}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">
            View user details and profile information
          </p>
        </div>
        {hasPermission(['update_user']) && (
          <Link
            to={`/users/${user.id}/edit`}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 touch-manipulation flex-shrink-0 sm:px-4 sm:py-2.5"
          >
            <PencilIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        {/* Left Sidebar - Profile Picture & Quick Info */}
        <div className="lg:col-span-1">
          <ComponentCard title="Profile">
            <div className="space-y-6">
              {/* Profile Picture */}
              <div className="flex flex-col items-center">
                {profilePictureUrl ? (
                  <img
                    src={profilePictureUrl}
                    alt="Profile"
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
                    onError={(e) => {
                      console.error('Failed to load profile picture in ViewUser:', profilePictureUrl);
                      console.error('Image element:', e.currentTarget);
                    }}
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold text-3xl sm:text-4xl border-4 border-gray-200 dark:border-gray-700">
                    {getInitials(user)}
                  </div>
                )}
                <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-semibold text-gray-800 dark:text-white text-center">
                  {getFullName(user)}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center break-all">{user.email}</p>
              </div>

              {/* Quick Info */}
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Username</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{user.username}</p>
                </div>
                {user.phone_number && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Phone Number</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{user.phone_number}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email Verified</p>
                  {user.email_verified_at ? (
                    <Badge size="sm" color="success">
                      Verified
                    </Badge>
                  ) : (
                    <Badge size="sm" color="error">
                      Unverified
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Roles</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {user.roles && user.roles.length > 0 ? (
                      user.roles.map((role) => (
                        <Badge key={role.id} size="sm" color="primary">
                          {role.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">No roles assigned</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </ComponentCard>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* User Information & Profile */}
          <ComponentCard title="User Information">
            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Full Name</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  {getFullName(user)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white">{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Username</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white">{user.username}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Phone Number</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  {user.phone_number || "-"}
                </p>
              </div>
            </div>
          </ComponentCard>

          {/* Metadata / Timestamps */}
          <ComponentCard title="Metadata">
            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created At</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  {formatDateTime(user.created_at)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Updated At</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  {formatDateTime(user.updated_at)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email Verified At</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  {user.email_verified_at ? formatDateTime(user.email_verified_at) : "-"}
                </p>
              </div>
            </div>
          </ComponentCard>

          {/* Roles */}
          <ComponentCard title="Roles">
            {user.roles && user.roles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <Badge key={role.id} size="md" color="primary">
                    {role.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No roles assigned</p>
            )}
          </ComponentCard>
        </div>
      </div>
    </div>
  );
}


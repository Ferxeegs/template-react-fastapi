import { useEffect } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import UserMetaCard from "../components/UserProfile/UserMetaCard";
import UserInfoCard from "../components/UserProfile/UserInfoCard";
// import UserAddressCard from "../components/UserProfile/UserAddressCard";
import ChangePasswordCard from "../components/UserProfile/ChangePasswordCard";
import PageMeta from "../components/common/PageMeta";
import { useAuth } from "../context/AuthContext";
import TableSkeleton from "../components/common/TableSkeleton";

export default function UserProfiles() {
  const { user, isLoading, fetchUser } = useAuth();

  // Fetch user data saat komponen mount untuk memastikan data terbaru
  useEffect(() => {
    if (!isLoading && !user) {
      fetchUser(true);
    }
  }, []);

  if (isLoading) {
    return (
      <>
        <PageMeta
          title="Profile"
          description="User profile page"
        />
        <PageBreadcrumb pageTitle="Profile" />
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <div className="space-y-6">
            <TableSkeleton rows={3} columns={2} />
          </div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <PageMeta
          title="Profile"
          description="User profile page"
        />
        <PageBreadcrumb pageTitle="Profile" />
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">User tidak ditemukan</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="Profile | Admin Panel"
        description="User profile page"
      />
      <PageBreadcrumb pageTitle="Profile" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Profile
        </h3>
        <div className="space-y-6">
          {/* User Meta Card - Menampilkan avatar, nama, roles */}
          <UserMetaCard user={user} onUpdate={() => fetchUser(true)} />
          
          {/* User Info Card - Menampilkan semua informasi user dari tabel users */}
          <UserInfoCard user={user} onUpdate={() => fetchUser(true)} />
          
          {/* Change Password Card - Untuk mengganti password */}
          <ChangePasswordCard onUpdate={() => fetchUser(true)} />
          
          {/* User Address Card - Menampilkan alamat jika ada user_profile */}
          {/* Note: Uncomment jika user_profile sudah tersedia di User type */}
          {/* {user.user_profile && <UserAddressCard user={user} />} */}
        </div>
      </div>
    </>
  );
}

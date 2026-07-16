import { useState, useEffect, FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { userAPI, getBaseUrl } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../../components/ui/modal";
import { ConfirmModal } from "../../components/ui/modal/ConfirmModal";
import { SuccessModal } from "../../components/ui/modal/SuccessModal";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { InfoIcon, LockIcon, CheckLineIcon, AngleLeftIcon, TrashBinIcon, UserCircleIcon, EyeIcon, EyeCloseIcon } from "../../icons";
import UserSidebar from "./UserSidebar";
import DetailsTab from "./DetailsTab";
import RolesTab from "./RolesTab";
import { useToast } from "../../context/ToastContext";

export default function EditUser() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { impersonate, hasSuperAdminRole, hasPermission } = useAuth();
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<"details" | "roles">("details");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    username: "",
    phone_number: "",
    email: "",
  });
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [countryCode, setCountryCode] = useState<string>("+62");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [profileImageBlobUrl, setProfileImageBlobUrl] = useState<string | null>(null);
  const { isOpen: isResetPasswordModalOpen, openModal: openResetPasswordModal, closeModal: closeResetPasswordModal } = useModal();
  const { isOpen: isImpersonateModalOpen, openModal: openImpersonateModal, closeModal: closeImpersonateModal } = useModal();
  const { isOpen: isDeleteModalOpen, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal();
  const { isOpen: isSuccessModalOpen, openModal: openSuccessModal, closeModal: closeSuccessModal } = useModal();
  const [resetPasswordData, setResetPasswordData] = useState({
    password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (id) {
      fetchUserData();
    }
  }, [id]);

  // Cleanup blob URL when component unmounts or profileImage changes
  useEffect(() => {
    return () => {
      if (profileImageBlobUrl) {
        URL.revokeObjectURL(profileImageBlobUrl);
      }
    };
  }, [profileImageBlobUrl]);

  const fetchUserData = async () => {
    if (!id) return;

    setIsFetching(true);
    setError(null);

    try {
      const response = await userAPI.getUserById(id);
      if (response.success && response.data) {
        const user = response.data;
        setUserData(user);
        // Parse phone_number to extract country code and number
        let phoneNumber = user.phone_number || "";
        let detectedCountryCode = "+62";
        
        if (phoneNumber) {
          // If phone starts with +62, extract it
          if (phoneNumber.startsWith("+62")) {
            detectedCountryCode = "+62";
            phoneNumber = phoneNumber.substring(3); // Remove +62
            // If starts with 0, keep it, otherwise add 0
            if (!phoneNumber.startsWith("0")) {
              phoneNumber = "0" + phoneNumber;
            }
          } else if (phoneNumber.startsWith("+1")) {
            detectedCountryCode = "+1";
            phoneNumber = phoneNumber.substring(2);
          } else if (phoneNumber.startsWith("0")) {
            // Indonesian number starting with 0
            detectedCountryCode = "+62";
            // Keep the 0
          } else {
            // Default to +62
            detectedCountryCode = "+62";
            // Add 0 if not present
            if (!phoneNumber.startsWith("0")) {
              phoneNumber = "0" + phoneNumber;
            }
          }
        }
        
        setCountryCode(detectedCountryCode);
        setFormData({
          firstname: user.firstname || "",
          lastname: user.lastname || "",
          username: user.username || "",
          phone_number: phoneNumber,
          email: user.email || "",
        });
        const roleIds = user.roles?.map((r: any) => Number(r.id)) || [];
        setSelectedRoleIds(roleIds);
        
        // Set profile picture URL if exists (same approach as ViewStudent)
        // Note: UserSidebar will fetch profile picture separately via mediaAPI
        // So we don't need to set it here, but we can if it's in the response
        if ((user as any).profile_pictures && (user as any).profile_pictures.length > 0) {
          const profilePic = (user as any).profile_pictures[0];
          let profileUrl = profilePic.url;
          // Remove /api/v1 or /api prefix if accidentally included
          profileUrl = profileUrl.replace(/^\/api\/v1/, '').replace(/^\/api/, '');
          // Ensure it starts with /
          if (!profileUrl.startsWith('/')) {
            profileUrl = `/${profileUrl}`;
          }
          // Use relative URL (same origin) for static files
          setProfileImageUrl(`${getBaseUrl()}${profileUrl}`);
        } else {
          setProfileImageUrl(null);
        }
      } else {
        setError(response.message || "Gagal mengambil data user");
      }
    } catch (err: any) {
      setError("Terjadi kesalahan saat mengambil data user");
      console.error("Fetch user error:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleFormChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError(null);
  };


  const handleEmailVerified = () => {
    fetchUserData();
  };

  const handleProfilePictureUpdated = async () => {
    // Refresh user data to get updated profile picture from server
    await fetchUserData();
    
    // Also refresh profile picture URL directly from media API (same approach as ViewStudent)
    if (id) {
      try {
        const { mediaAPI } = await import('../../utils/api');
        const response = await mediaAPI.getMediaByModel('User', id, 'profile-pictures');
        
        // Handle both array format and object with media property
        let mediaArray: any[] = [];
        
        if (response.success && response.data) {
          if (Array.isArray(response.data)) {
            mediaArray = response.data;
          } else if (response.data.media && Array.isArray(response.data.media)) {
            mediaArray = response.data.media;
          }
        }
        
        if (mediaArray.length > 0) {
          const media = mediaArray[0];
          let mediaUrl = media.url;
          mediaUrl = mediaUrl.replace(/^\/api\/v1/, '').replace(/^\/api/, '');
          if (!mediaUrl.startsWith('/')) {
            mediaUrl = `/${mediaUrl}`;
          }
          setProfileImageUrl(`${getBaseUrl()}${mediaUrl}`);
        } else {
          setProfileImageUrl(null);
        }
      } catch (err) {
        console.error('Error refreshing profile picture URL:', err);
      }
    }
  };

  const handleImpersonateClick = () => {
    openImpersonateModal();
  };

  const handleImpersonate = async () => {
    if (!id) return;

    setIsImpersonating(true);
    setError(null);
    closeImpersonateModal();

    try {
      await impersonate(id);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat melakukan impersonate");
      console.error("Impersonate user error:", err);
    } finally {
      setIsImpersonating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!id) return;

    // Validasi
    if (!resetPasswordData.password || resetPasswordData.password.length < 8) {
      setResetPasswordError("Password minimal 8 karakter");
      return;
    }

    if (resetPasswordData.password !== resetPasswordData.confirm_password) {
      setResetPasswordError("Password dan konfirmasi password tidak cocok");
      return;
    }

    setIsResettingPassword(true);
    setResetPasswordError(null);

    try {
      const response = await userAPI.resetPassword(id, {
        password: resetPasswordData.password,
        confirm_password: resetPasswordData.confirm_password,
      });

      if (response.success) {
        // Reset form dan tutup modal
        setResetPasswordData({
          password: "",
          confirm_password: "",
        });
        setResetPasswordError(null);
        closeResetPasswordModal();
        setSuccessMessage("Password berhasil direset");
        openSuccessModal();
      } else {
        setResetPasswordError(response.message || "Gagal reset password");
      }
    } catch (err: any) {
      setResetPasswordError(err.message || "Terjadi kesalahan saat reset password");
      console.error("Reset password error:", err);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleDeleteUserClick = () => {
    openDeleteModal();
  };

  const handleDeleteUser = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);
    closeDeleteModal();

    try {
      const response = await userAPI.deleteUser(id);

      if (response.success) {
        // Redirect ke users list setelah berhasil delete
        navigate("/users");
      } else {
        setError(response.message || "Gagal menghapus user");
        setIsLoading(false);
      }
    } catch (err: any) {
      setError("Terjadi kesalahan saat menghapus user");
      console.error("Delete user error:", err);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!id) return;

    // Client-side validation
    if (formData.firstname.trim().length < 2) {
      setError("Nama depan minimal 2 karakter");
      return;
    }

    if (formData.lastname.trim().length < 2) {
      setError("Nama belakang minimal 2 karakter");
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError("Format email tidak valid");
      return;
    }

    setIsLoading(true);

    try {
      // Format phone number: combine country code with phone number
      let formattedPhoneNumber = null;
      if (formData.phone_number.trim()) {
        let phoneNum = formData.phone_number.trim();
        
        // Remove any existing country code prefix
        if (phoneNum.startsWith("+62")) {
          phoneNum = phoneNum.substring(3);
        } else if (phoneNum.startsWith("+1")) {
          phoneNum = phoneNum.substring(2);
        }
        
        // For Indonesian numbers (+62), format should be +62XXXXXXXXX (without leading 0)
        if (countryCode === "+62") {
          // Remove leading 0 if present
          if (phoneNum.startsWith("0")) {
            phoneNum = phoneNum.substring(1);
          }
          formattedPhoneNumber = "+62" + phoneNum;
        } else if (countryCode === "+1") {
          // For US numbers, just add the country code
          formattedPhoneNumber = "+1" + phoneNum;
        } else {
          // Default: use country code + number
          formattedPhoneNumber = countryCode + phoneNum;
        }
      }

      // Update user details
      const updateResponse = await userAPI.updateUser(id, {
        firstname: formData.firstname.trim(),
        lastname: formData.lastname.trim(),
        username: formData.username.trim(),
        phone_number: formattedPhoneNumber,
        email: formData.email.trim() || undefined,
      });

      if (!updateResponse.success) {
        const errorMessage = updateResponse.message || "Gagal mengupdate user";
        setError(errorMessage);
        showError(errorMessage);
        setIsLoading(false);
        return;
      }

      // Update user roles
      const rolesResponse = await userAPI.updateUserRoles(id, selectedRoleIds.map(String));

      if (!rolesResponse.success) {
        const errorMessage = rolesResponse.message || "Gagal mengupdate roles";
        setError(errorMessage);
        showError(errorMessage);
        setIsLoading(false);
        return;
      }

      // Success - redirect back to users list
      success("User berhasil diupdate!");
      navigate("/users");
    } catch (err: any) {
      const errorMessage = "Terjadi kesalahan. Silakan coba lagi.";
      setError(errorMessage);
      showError(errorMessage);
      console.error("Update user error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <>
        <PageMeta
          title="Edit User"
          description="Edit user information"
        />
        <PageBreadcrumb
          pageTitle="Edit User"
        />
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Memuat data user...</div>
        </div>
      </>
    );
  }

  if (!userData) {
    return (
      <>
        <PageMeta
          title="Edit User"
          description="Edit user information"
        />
        <PageBreadcrumb
          pageTitle="Edit User"
        />
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500 dark:text-red-400">
            {error || "User tidak ditemukan"}
          </div>
        </div>
      </>
    );
  }

  const userFullName = userData.fullname || `${userData.firstname} ${userData.lastname}`.trim() || userData.username;

  return (
    <>
      <PageMeta
        title={`Edit ${userFullName} | TailAdmin`}
        description="Edit user information"
      />
      <PageBreadcrumb
        pageTitle={
          <div className="flex items-center gap-2 font-normal text-base">
            <Link
              to="/users"
              className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Users
            </Link>
            <span className="text-gray-600">&gt;</span>
            <span>{userFullName}</span>
            <span className="text-gray-600">&gt;</span>
            <span>Edit</span>
          </div>
        }
        hideBreadcrumb={true}
      />

      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              to="/users"
              className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white touch-manipulation"
            >
              <AngleLeftIcon className="h-5 w-5" />
            </Link>
            <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-gray-800 dark:text-white sm:text-2xl">
              Edit {userFullName}
            </h1>
          </div>
          <div className="flex w-full flex-wrap items-stretch justify-end gap-2 sm:w-auto sm:flex-nowrap sm:items-center">
            {hasSuperAdminRole && (
              <button
                type="button"
                onClick={handleImpersonateClick}
                disabled={isImpersonating}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-500 px-3 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-initial sm:py-2 touch-manipulation"
              >
                <UserCircleIcon className="h-4 w-4 shrink-0" />
                <span className="truncate sm:inline">
                  {isImpersonating ? "Impersonating…" : "Impersonate"}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={openResetPasswordModal}
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-orange-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-orange-700 sm:flex-initial sm:px-4 sm:py-2 touch-manipulation"
            >
              <span className="hidden sm:inline">Reset Password</span>
              <span className="sm:hidden">Reset</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Left Sidebar */}
          <div className="min-w-0 lg:col-span-1">
            <UserSidebar
              userId={id!}
              emailVerifiedAt={userData.email_verified_at}
              createdAt={userData.created_at}
              updatedAt={userData.updated_at}
              onEmailVerified={handleEmailVerified}
              profileImage={profileImageBlobUrl || profileImageUrl}
              onProfileImageChange={(file) => {
                // Cleanup previous blob URL to prevent memory leak
                if (profileImageBlobUrl) {
                  URL.revokeObjectURL(profileImageBlobUrl);
                }
                if (file) {
                  setProfileImageBlobUrl(URL.createObjectURL(file));
                } else {
                  setProfileImageBlobUrl(null);
                }
              }}
              onProfilePictureUpdated={handleProfilePictureUpdated}
            />
          </div>

          {/* Main Content Area */}
          <div className="min-w-0 lg:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
              {/* Tabs — scroll horizontal on narrow screens */}
              <div className="-mx-4 mb-6 border-b border-gray-200 px-4 dark:border-gray-700 sm:mx-0 sm:px-0">
                <div className="flex min-w-0 flex-nowrap gap-1 overflow-x-auto pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button
                    type="button"
                    onClick={() => setActiveTab("details")}
                    className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:px-4 ${
                      activeTab === "details"
                        ? "border-brand-500 text-brand-500"
                        : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                  >
                    <InfoIcon className="h-4 w-4 shrink-0" />
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("roles")}
                    className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:px-4 ${
                      activeTab === "roles"
                        ? "border-brand-500 text-brand-500"
                        : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                  >
                    <LockIcon className="h-4 w-4 shrink-0" />
                    Roles
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <form onSubmit={handleSubmit}>
                <div className="space-y-5">
                  {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                      {error}
                    </div>
                  )}

           {activeTab === "details" ? (
             <DetailsTab
               formData={formData}
               onChange={handleFormChange}
               isLoading={isLoading}
               countryCode={countryCode}
               onCountryCodeChange={setCountryCode}
             />
                  ) : activeTab === "roles" ? (
                    <RolesTab
                      selectedRoleIds={selectedRoleIds}
                      onRoleChange={setSelectedRoleIds}
                      isLoading={isLoading}
                    />
                  ) :
                  null}
                </div>

                {/* Bottom Action Buttons */}
                <div className="mt-6 flex flex-col gap-2 border-t border-gray-200 pt-6 dark:border-gray-700 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/users")}
                    disabled={isLoading}
                    className="order-2 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 sm:order-none sm:w-auto sm:py-2 touch-manipulation"
                  >
                    <AngleLeftIcon className="h-4 w-4" />
                    Back
                  </button>
                  {hasPermission(['delete_user', 'delete_any_user']) && (
                    <button
                      type="button"
                      onClick={handleDeleteUserClick}
                      disabled={isLoading}
                      className="order-4 flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 sm:order-none sm:w-auto sm:py-2 touch-manipulation"
                    >
                      <TrashBinIcon className="h-4 w-4" />
                      Delete
                    </button>
                  )}
                  {hasPermission('create_user') && (
                    <button
                      type="button"
                      onClick={() => navigate("/users/create")}
                      disabled={isLoading}
                      className="order-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 sm:order-none sm:w-auto sm:py-2 touch-manipulation"
                    >
                      <svg
                        className="h-4 w-4"
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
                      <span className="hidden sm:inline">Create Another</span>
                      <span className="sm:hidden">New User</span>
                    </button>
                  )}
                  {hasPermission('update_user') && (
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="order-1 flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50 sm:order-none sm:w-auto sm:py-2 touch-manipulation"
                    >
                      <CheckLineIcon className="h-4 w-4" />
                      {isLoading ? "Saving..." : "Save Changes"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Password Modal */}
      <Modal isOpen={isResetPasswordModalOpen} onClose={closeResetPasswordModal} className="max-w-md">
        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Reset Password
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter a new password for this user
            </p>
          </div>
          
          {/* Error Message */}
          {resetPasswordError && (
            <div className="mb-4 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
              {resetPasswordError}
            </div>
          )}

          {/* Form */}
          <div className="space-y-3.5">
            <div>
              <Label className="text-sm">
                New Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative mt-1.5">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={resetPasswordData.password}
                  onChange={(e) =>
                    setResetPasswordData({
                      ...resetPasswordData,
                      password: e.target.value,
                    })
                  }
                  placeholder="Min. 8 characters"
                  disabled={isResettingPassword}
                  className="pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeCloseIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <Label className="text-sm">
                Confirm Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative mt-1.5">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={resetPasswordData.confirm_password}
                  onChange={(e) =>
                    setResetPasswordData({
                      ...resetPasswordData,
                      confirm_password: e.target.value,
                    })
                  }
                  placeholder="Re-enter password"
                  disabled={isResettingPassword}
                  className="pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeCloseIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setResetPasswordError(null);
                setResetPasswordData({ password: "", confirm_password: "" });
                closeResetPasswordModal();
              }}
              disabled={isResettingPassword}
              className="px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={isResettingPassword}
              className="px-3.5 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isResettingPassword ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Impersonate Confirmation Modal */}
      <ConfirmModal
        isOpen={isImpersonateModalOpen}
        onClose={closeImpersonateModal}
        onConfirm={handleImpersonate}
        title="Impersonate User"
        message={
          <>
            Apakah Anda yakin ingin masuk sebagai user <strong className="text-gray-800 dark:text-white">{userFullName}</strong>? Anda akan melihat aplikasi dari perspektif user tersebut.
          </>
        }
        confirmText="Impersonate"
        cancelText="Cancel"
        confirmButtonColor="warning"
        icon={<UserCircleIcon className="w-6 h-6" />}
        isLoading={isImpersonating}
      />

      {/* Delete User Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteUser}
        title="Hapus User"
        message={
          <>
            Apakah Anda yakin ingin menghapus user <strong className="text-gray-800 dark:text-white">{userFullName}</strong>?
          </>
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="danger"
        icon={<TrashBinIcon className="w-6 h-6" />}
        isLoading={isLoading}
        showWarning={true}
        warningMessage="Tindakan ini tidak dapat dibatalkan dan akan menghapus user secara permanen."
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={closeSuccessModal}
        message={successMessage}
      />
    </>
  );
}

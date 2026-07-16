import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { userAPI, mediaAPI } from "../../utils/api";
import { InfoIcon, LockIcon, AngleLeftIcon } from "../../icons";
import CreateUserSidebar from "./CreateUserSidebar";
import DetailsTab from "./DetailsTab";
import RolesTab from "./RolesTab";
import { useToast } from "../../context/ToastContext";

export default function CreateUser() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<"details" | "roles">("details");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    username: "",
    phone_number: "",
    email: "",
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [countryCode, setCountryCode] = useState<string>("+62");

  const handleFormChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (formData.firstname.trim().length < 2) {
      setError("Nama depan minimal 2 karakter");
      return;
    }

    if (formData.lastname.trim().length < 2) {
      setError("Nama belakang minimal 2 karakter");
      return;
    }

    if (formData.username.trim().length < 3) {
      setError("Username minimal 3 karakter");
      return;
    }

    if (!/^[a-zA-Z0-9_-]{3,}$/.test(formData.username.trim())) {
      setError("Username harus minimal 3 karakter dan hanya boleh mengandung huruf, angka, underscore, atau dash");
      return;
    }

    if (password.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password dan Confirm Password tidak sama");
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

      // Create user
      const createResponse = await userAPI.createUser({
        firstname: formData.firstname.trim(),
        lastname: formData.lastname.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: password,
        phone_number: formattedPhoneNumber,
        roleIds: selectedRoleIds.length > 0 ? selectedRoleIds : undefined,
      });

      if (!createResponse.success) {
        const errorMessage = createResponse.message || "Gagal membuat user";
        setError(errorMessage);
        showError(errorMessage);
        setIsLoading(false);
        return;
      }

      const userId = createResponse.data?.id;
      if (!userId) {
        const errorMessage = "User berhasil dibuat tapi ID tidak ditemukan";
        setError(errorMessage);
        showError(errorMessage);
        setIsLoading(false);
        return;
      }

      // Upload profile picture if provided
      if (profileImage) {
        try {
          const uploadResponse = await mediaAPI.uploadMedia(
            profileImage,
            'User',
            userId,
            'profile-pictures'
          );

          if (!uploadResponse.success) {
            // User sudah dibuat, tapi upload foto gagal
            // Tetap redirect ke edit page, user bisa upload foto lagi di sana
            console.warn('User created but profile picture upload failed:', uploadResponse.message);
          }
        } catch (uploadErr: any) {
          // User sudah dibuat, tapi upload foto gagal
          // Tetap redirect ke edit page, user bisa upload foto lagi di sana
          console.error('Error uploading profile picture:', uploadErr);
        }
      }

      // Success - redirect to edit user page
      success("User berhasil dibuat!");
      navigate(`/users/${userId}/edit`);
    } catch (err: any) {
      const errorMessage = "Terjadi kesalahan saat membuat user";
      setError(errorMessage);
      showError(errorMessage);
      console.error("Create user error:", err);
      setIsLoading(false);
    }
  };


  return (
    <>
      <PageMeta
        title="Tambah Pengguna"
        description="Tambahkan pengguna baru"
      />
      <PageBreadcrumb
        pageTitle={
          <div className="flex items-center gap-2 font-normal text-base">
            <Link
              to="/users"
              className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Pengguna
            </Link>
            <span className="text-gray-600">&gt;</span>
            <span>Tambah Pengguna</span>
          </div>
        }
        hideBreadcrumb={true}
      />

      <div className="space-y-4 sm:space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="flex items-center gap-2 sm:gap-3 pb-2 sm:pb-0">
          <Link
            to="/users"
            className="inline-flex items-center justify-center w-10 h-10 text-gray-500 transition-colors rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white touch-manipulation flex-shrink-0"
          >
            <AngleLeftIcon className="w-5 h-5" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white flex-1">
            Tambah Pengguna
          </h1>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <CreateUserSidebar
              password={password}
              confirmPassword={confirmPassword}
              onPasswordChange={setPassword}
              onConfirmPasswordChange={setConfirmPassword}
              profileImage={profileImage ? URL.createObjectURL(profileImage) : null}
              onProfileImageChange={setProfileImage}
            />
          </div>

          {/* Right Content Area */}
          <div className="lg:col-span-3">
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "details"
                    ? "border-brand-500 text-brand-500"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                <InfoIcon className="w-4 h-4" />
                Detail
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("roles")}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "roles"
                    ? "border-brand-500 text-brand-500"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                <LockIcon className="w-4 h-4" />
                Role Pengguna
              </button>
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
                  <div>
                    <DetailsTab
                      formData={formData}
                      onChange={handleFormChange}
                      isLoading={isLoading}
                      countryCode={countryCode}
                      onCountryCodeChange={setCountryCode}
                    />
                  </div>
                ) : activeTab === "roles" ? (
                  <RolesTab
                    selectedRoleIds={selectedRoleIds}
                    onRoleChange={setSelectedRoleIds}
                    isLoading={isLoading}
                  />
                ) : null}
              </div>

              {/* Bottom Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => navigate("/users")}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700"
                >
                  <AngleLeftIcon className="w-4 h-4" />
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-4 h-4"
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
                  {isLoading ? "Membuat..." : "Tambah Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}


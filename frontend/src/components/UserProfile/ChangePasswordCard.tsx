import { useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { EyeIcon, EyeCloseIcon } from "../../icons";
import { userAPI } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

interface ChangePasswordCardProps {
  onUpdate?: () => void;
}

export default function ChangePasswordCard({ onUpdate }: ChangePasswordCardProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const { hasPermission } = useAuth();
  const canChangePassword = hasPermission("update_myprofile");

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  const handleOpenModal = () => {
    setFormData({
      current_password: "",
      new_password: "",
      confirm_password: "",
    });
    setError(null);
    setSuccess(false);
    openModal();
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    // Validasi
    if (!formData.current_password) {
      setError("Password lama wajib diisi");
      return;
    }

    if (!formData.new_password) {
      setError("Password baru wajib diisi");
      return;
    }

    if (formData.new_password.length < 8) {
      setError("Password baru minimal 8 karakter");
      return;
    }

    if (!formData.confirm_password) {
      setError("Konfirmasi password wajib diisi");
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      setError("Password baru dan konfirmasi password tidak sama");
      return;
    }

    if (formData.current_password === formData.new_password) {
      setError("Password baru harus berbeda dengan password lama");
      return;
    }

    setIsLoading(true);

    try {
      const response = await userAPI.changePassword({
        current_password: formData.current_password,
        new_password: formData.new_password,
        confirm_password: formData.confirm_password,
      });

      if (response.success) {
        setSuccess(true);
        setFormData({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
        // Call onUpdate callback if provided
        if (onUpdate) {
          onUpdate();
        }
        // Close modal after 2 seconds
        setTimeout(() => {
          closeModal();
          setSuccess(false);
        }, 2000);
      } else {
        setError(response.message || "Gagal mengubah password");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mengubah password");
      console.error("Change password error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-2">
              Password
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ubah password Anda untuk menjaga keamanan akun
            </p>
          </div>

          {canChangePassword && (
            <button
              onClick={handleOpenModal}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
            >
              <svg
              className="fill-current"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                fill=""
              />
            </svg>
            Ubah Password
          </button>
          )}
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[500px] m-4">
        <div className="custom-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Ubah Password
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Masukkan password lama dan password baru Anda.
            </p>
          </div>
          <form
            className="flex flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div className="custom-scrollbar max-h-[450px] overflow-y-auto px-2 pb-3">
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <p className="text-sm font-medium text-red-800 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}

              {success && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <p className="text-sm font-medium text-green-800 dark:text-green-400">
                    Password berhasil diubah!
                  </p>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <Label htmlFor="current_password">Password Lama</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      id="current_password"
                      name="current_password"
                      value={formData.current_password}
                      onChange={(e) => handleChange("current_password", e.target.value)}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      aria-label={showCurrentPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showCurrentPassword ? (
                        <EyeCloseIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="new_password">Password Baru</Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      id="new_password"
                      name="new_password"
                      value={formData.new_password}
                      onChange={(e) => handleChange("new_password", e.target.value)}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      aria-label={showNewPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showNewPassword ? (
                        <EyeCloseIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Minimal 8 karakter
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirm_password">Konfirmasi Password Baru</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirm_password"
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={(e) => handleChange("confirm_password", e.target.value)}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      aria-label={showConfirmPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showConfirmPassword ? (
                        <EyeCloseIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal} disabled={isLoading}>
                Close
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isLoading || success}>
                {isLoading ? "Mengubah..." : "Ubah Password"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}


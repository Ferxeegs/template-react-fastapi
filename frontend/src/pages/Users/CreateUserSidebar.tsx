import { useState, useEffect } from "react";
import { EyeIcon, EyeCloseIcon } from "../../icons";

interface CreateUserSidebarProps {
  password: string;
  confirmPassword: string;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (confirmPassword: string) => void;
  profileImage?: string | null;
  onProfileImageChange?: (file: File | null) => void;
}

export default function CreateUserSidebar({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  profileImage,
  onProfileImageChange,
}: CreateUserSidebarProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(profileImage || null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Update image preview when profileImage prop changes
  useEffect(() => {
    if (profileImage) {
      setImagePreview(profileImage);
    }
  }, [profileImage]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Hanya file gambar yang diizinkan');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 5MB');
      return;
    }

    setUploadError(null);

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    onProfileImageChange?.(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setUploadError(null);
    onProfileImageChange?.(null);
  };

  return (
    <div className="w-full space-y-6">
      {/* Profile Picture Upload */}
      <div className="p-6 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
          Profile Picture
        </h3>
        <div className="flex flex-col items-center justify-center">
          {uploadError && (
            <div className="mb-4 w-full p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
              {uploadError}
            </div>
          )}
          <div className="relative mb-4">
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Profile preview"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
                  onError={() => {
                    // If image fails to load, clear preview
                    console.error('Failed to load profile picture:', imagePreview);
                    setImagePreview(null);
                    onProfileImageChange?.(null);
                  }}
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 p-1 text-white bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                  title="Hapus foto"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full border-4 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <span className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors">
                {imagePreview ? "Change Photo" : "Upload Photo"}
              </span>
            </label>
            {imagePreview && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                title="Hapus foto"
              >
                Hapus
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
            Format: JPG, PNG, GIF (Maks. 5MB)
          </p>
        </div>
      </div>

      {/* Password Fields */}
      <div className="p-6 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
          Password
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeCloseIcon className="w-4 h-4 fill-current" />
                ) : (
                  <EyeIcon className="w-4 h-4 fill-current" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeCloseIcon className="w-4 h-4 fill-current" />
                ) : (
                  <EyeIcon className="w-4 h-4 fill-current" />
                )}
              </button>
            </div>
            {password && confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


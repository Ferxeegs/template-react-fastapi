import { useState, useEffect } from "react";
import Badge from "../../components/ui/badge/Badge";
import { userAPI, mediaAPI, getBaseUrl } from "../../utils/api";
import { formatDateTime } from "../../utils/dateTime";

interface UserSidebarProps {
  userId: string;
  // userPhoneNumber: string | null;
  emailVerifiedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  onEmailVerified: () => void;
  profileImage?: string | null;
  onProfileImageChange?: (file: File | null) => void;
  onProfilePictureUpdated?: () => void;
}

export default function UserSidebar({
  userId,
  // userPhoneNumber,
  emailVerifiedAt,
  // createdAt,
  // updatedAt,
  onEmailVerified,
  profileImage,
  onProfileImageChange,
  onProfilePictureUpdated,
}: UserSidebarProps) {
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(profileImage || null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentProfilePictureId, setCurrentProfilePictureId] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Helper function to normalize image URL (same as StudentSidebar)
  const normalizeImageUrl = (url: string): string => {
    if (url.startsWith('http') || url.startsWith('/') || url.startsWith('blob:')) {
      return url;
    }
    return `${getBaseUrl()}${url.startsWith('/') ? url : `/${url}`}`;
  };

  // Helper function to extract media array from API response (same as StudentSidebar)
  const extractMediaArray = (responseData: any): any[] | null => {
    if (!responseData) return null;
    
    if (Array.isArray(responseData)) {
      return responseData;
    }
    
    if (responseData.media && Array.isArray(responseData.media)) {
      return responseData.media;
    }
    
    if (responseData.data && Array.isArray(responseData.data)) {
      return responseData.data;
    }
    
    return null;
  };

  // Fetch existing profile picture on mount and when userId changes
  const fetchProfilePicture = async () => {
    if (!userId) {
      setImagePreview(profileImage ? normalizeImageUrl(profileImage) : null);
      setCurrentProfilePictureId(null);
      return;
    }
    
    try {
      const response = await mediaAPI.getMediaByModel('User', userId, 'profile-pictures');
      const mediaArray = extractMediaArray(response.data);
      
      if (response.success && mediaArray && mediaArray.length > 0) {
        const media = mediaArray[0];
        let mediaUrl = media.url;
        
        // Remove /api/v1 or /api prefix if accidentally included
        mediaUrl = mediaUrl.replace(/^\/api\/v1/, '').replace(/^\/api/, '');
        
        // Ensure it starts with /
        if (!mediaUrl.startsWith('/')) {
          mediaUrl = `/${mediaUrl}`;
        }
        
        setImagePreview(`${getBaseUrl()}${mediaUrl}`);
        setCurrentProfilePictureId(media.id);
      } else {
        // No profile picture found, use prop if available
        setImagePreview(profileImage ? normalizeImageUrl(profileImage) : null);
        setCurrentProfilePictureId(null);
      }
    } catch (err) {
      // Fallback to prop if available
      setImagePreview(profileImage ? normalizeImageUrl(profileImage) : null);
      setCurrentProfilePictureId(null);
    }
  };

  useEffect(() => {
    fetchProfilePicture();
  }, [userId, profileImage]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploading(true);
    setUploadError(null);

    try {
      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Delete old profile picture if exists
      if (currentProfilePictureId) {
        try {
          await mediaAPI.deleteMedia(currentProfilePictureId);
        } catch (err) {
          console.error('Error deleting old profile picture:', err);
          // Continue with upload even if delete fails
        }
      }

      // Upload new profile picture
      const uploadResponse = await mediaAPI.uploadMedia(
        file,
        'User',
        userId,
        'profile-pictures'
      );

      if (uploadResponse.success && uploadResponse.data) {
        setCurrentProfilePictureId(uploadResponse.data.id);
        // Build URL same way as StudentSidebar (using static file mount via nginx)
        let mediaUrl = uploadResponse.data.url;
        mediaUrl = mediaUrl.replace(/^\/api\/v1/, '').replace(/^\/api/, '');
        if (!mediaUrl.startsWith('/')) {
          mediaUrl = `/${mediaUrl}`;
        }
        setImagePreview(`${getBaseUrl()}${mediaUrl}`);
        onProfileImageChange?.(file);
        
        // Call callback to notify parent component first
        onProfilePictureUpdated?.();
        
        // Then refresh profile picture data to ensure consistency
        // Use a small delay to ensure backend has processed the upload
        setTimeout(() => {
          fetchProfilePicture();
        }, 300);
      } else {
        setUploadError(uploadResponse.message || 'Gagal mengupload foto profil');
        // Revert to previous image or clear if no previous
        if (currentProfilePictureId) {
          // Try to fetch previous image
          try {
            const prevResponse = await mediaAPI.getMediaByModel('User', userId, 'profile-pictures');
            const mediaArray = extractMediaArray(prevResponse.data);
            if (prevResponse.success && mediaArray && mediaArray.length > 0) {
              const media = mediaArray[0];
              let mediaUrl = media.url;
              mediaUrl = mediaUrl.replace(/^\/api\/v1/, '').replace(/^\/api/, '');
              if (!mediaUrl.startsWith('/')) {
                mediaUrl = `/${mediaUrl}`;
              }
              setImagePreview(`${getBaseUrl()}${mediaUrl}`);
            } else {
              setImagePreview(null);
            }
          } catch (err) {
            setImagePreview(null);
          }
        } else {
          setImagePreview(null);
        }
      }
    } catch (err: any) {
      setUploadError('Terjadi kesalahan saat mengupload foto profil');
      console.error('Upload error:', err);
      setImagePreview(profileImage || null); // Revert to previous image
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!currentProfilePictureId) {
      setImagePreview(null);
      onProfileImageChange?.(null);
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const deleteResponse = await mediaAPI.deleteMedia(currentProfilePictureId);
      if (deleteResponse.success) {
        setImagePreview(null);
        setCurrentProfilePictureId(null);
        onProfileImageChange?.(null);
        onProfilePictureUpdated?.();
      } else {
        setUploadError(deleteResponse.message || 'Gagal menghapus foto profil');
      }
    } catch (err: any) {
      setUploadError('Terjadi kesalahan saat menghapus foto profil');
      console.error('Delete error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // const formatDate = (date: string | null) => {
  //   if (!date) return "-";
  //   const d = new Date(date);
  //   const now = new Date();
  //   const diffMs = now.getTime() - d.getTime();
  //   const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
  //   if (diffDays === 0) return "Today";
  //   if (diffDays === 1) return "Yesterday";
  //   if (diffDays < 7) return `${diffDays} days ago`;
  //   if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  //   if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  //   return `${Math.floor(diffDays / 365)} years ago`;
  // };

  const handleSendVerification = async () => {
    setIsSendingVerification(true);
    try {
      const response = await userAPI.sendVerificationEmail(userId);
      if (response.success) {
        alert("Kode verifikasi berhasil dikirim ke email");
      } else {
        alert(response.message || "Gagal mengirim kode verifikasi");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat mengirim kode verifikasi");
      console.error(err);
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleMarkAsVerified = async () => {
    setIsVerifying(true);
    try {
      const response = await userAPI.verifyUserEmail(userId);
      if (response.success) {
        onEmailVerified();
      } else {
        alert(response.message || "Gagal memverifikasi email");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat memverifikasi email");
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
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
            <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
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
                  onError={(e) => {
                    // If image fails to load, clear preview
                    console.error('Failed to load profile picture:', imagePreview);
                    console.error('Image element:', e.currentTarget);
                    setImagePreview(null);
                    setCurrentProfilePictureId(null);
                  }}
                />
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full border-4 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                {isUploading ? (
                  <div className="w-8 h-8 border-4 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
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
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={isUploading}
                className="hidden"
              />
              <span className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isUploading ? "Uploading..." : imagePreview ? "Change Photo" : "Upload Photo"}
              </span>
            </label>
            {imagePreview && !isUploading && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                title="Hapus foto"
              >
                Hapus
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Email Verification */}
      <div className="p-6 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
          Email Verification
        </h3>
        <div className="space-y-3">
          {!emailVerifiedAt && (
            <>
              <button
                onClick={handleSendVerification}
                disabled={isSendingVerification}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingVerification ? "Sending..." : "Send verification code"}
              </button>
              <button
                onClick={handleMarkAsVerified}
                disabled={isVerifying}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? "Verifying..." : "Mark as verified"}
              </button>
            </>
          )}
          <div className="pt-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Email verified at
            </div>
            {emailVerifiedAt ? (
              <div className="text-sm font-medium text-green-500 dark:text-gray-300">
                {formatDateTime(emailVerifiedAt)}
              </div>
            ) : (
              <Badge size="sm" color="error">
                Unverified
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Timestamps */}
      {/* <div className="p-6 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="space-y-4">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Created at
            </div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formatDate(createdAt)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Last modified at
            </div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formatDate(updatedAt)}
            </div>
          </div>
        </div>
      </div> */}
    </div>
  );
}


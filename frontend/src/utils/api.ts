
const API_BASE_URL =
  import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.length > 0
    ? import.meta.env.VITE_API_URL
    : '/api';

import {
  setAccessTokenExpiryFromNow,
  clearSessionTiming,
  type SessionConfig,
} from './sessionManager';

/**
 * Get base URL without /api suffix (for static files)
 * Returns empty string for relative URLs (same origin)
 */
export const getBaseUrl = (): string => {
  const baseUrl = API_BASE_URL || '';
  // Remove /api and /api/v1 suffix if present
  let result = baseUrl.replace(/\/api\/v1\/?$/, '');
  result = result.replace(/\/api\/?$/, '');
  
  // If result is empty or just '/', return empty string for relative URLs
  if (!result || result === '/') {
    return '';
  }
  
  return result;
};

/**
 * Base URL for FastAPI routes under /api/v1.
 * VITE_API_URL may already be `/api/v1` or `http://host:8000/api/v1` — avoid doubling the path.
 */
export function getApiV1BaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw || String(raw).trim().length === 0) {
    return "/api/v1";
  }
  const base = String(raw).replace(/\/+$/, "");
  if (base.endsWith("/api/v1")) {
    return base;
  }
  if (base.endsWith("/api")) {
    return `${base}/v1`;
  }
  return `${base}/api/v1`;
}

/**
 * Build correct URL for media files
 * @param mediaUrl - URL from media record (format: /uploads/{model_type}/{collection}/{filename})
 * @param useApiServe - If true, uses /api/v1/media/serve/... endpoint. If false, uses direct static mount.
 * @returns Full URL for displaying the image
 */
export const getMediaUrl = (mediaUrl: string | null | undefined, useApiServe = false): string | null => {
  if (!mediaUrl) return null;
  
  const urlMatch = mediaUrl.match(/\/?uploads\/([^\/]+)\/([^\/]+)\/(.+)$/);
  
  if (urlMatch && useApiServe) {
    const [, modelType, collection, filename] = urlMatch;
    const cleanFilename = filename;
    
    let apiUrl: string;
    const base = API_BASE_URL.replace(/\/+$/, "");
    
    if (base.endsWith('/api/v1')) {
      apiUrl = `${base}/media/serve/${modelType}/${collection}/${cleanFilename}`;
    } else if (base.endsWith('/api')) {
      apiUrl = `${base}/v1/media/serve/${modelType}/${collection}/${cleanFilename}`;
    } else {
      const prefix = base === "/" || !base ? "" : base;
      apiUrl = `${prefix}/api/v1/media/serve/${modelType}/${collection}/${cleanFilename}`;
    }
    return apiUrl;
  }
  
  // Direct static fallback (usually more reliable in local dev)
  let imageUrl = mediaUrl.startsWith('/') ? mediaUrl : '/' + mediaUrl;
  
  // Ensure we use the base URL (e.g. http://localhost:8000 or same origin)
  const baseUrl = getBaseUrl();
  if (baseUrl) {
    // If baseUrl is absolute, prepend it. If relative, ensure no double slash.
    if (baseUrl.startsWith('http')) {
      imageUrl = `${baseUrl.replace(/\/+$/, '')}${imageUrl}`;
    } else {
      imageUrl = `${baseUrl}${imageUrl}`;
    }
  }
  
  return imageUrl;
};

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

async function parseResponseBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Mint access_token baru via cookie HttpOnly refresh_token (POST /auth/refresh).
 * Dipakai saat access JWT habis masa berlaku tetapi pengguna masih punya sesi refresh.
 */
export async function tryRefreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await parseResponseBody(res);
          const expiresIn =
            (data?.data as { expires_in?: number } | undefined)?.expires_in ??
            (data as { expires_in?: number }).expires_in;
          if (typeof expiresIn === 'number' && expiresIn > 0) {
            setAccessTokenExpiryFromNow(expiresIn);
          }
          return true;
        }
        return false;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function shouldAttemptRefreshOn401(requestUrl: string): boolean {
  return (
    !requestUrl.includes('/auth/login') &&
    !requestUrl.includes('/auth/register') &&
    !requestUrl.includes('/auth/refresh')
  );
}

/**
 * Helper function untuk membuat request ke API
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  allowRefreshRetry = true
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Token sekarang disimpan di HttpOnly cookie oleh backend
  // Browser akan otomatis mengirim cookie, jadi tidak perlu Authorization header
  // Tapi kita tetap support Authorization header untuk backward compatibility

  const config: RequestInit = {
    ...options,
    credentials: 'include', // Penting: kirim cookies dengan setiap request
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await parseResponseBody(response);

    if (
      response.status === 401 &&
      allowRefreshRetry &&
      shouldAttemptRefreshOn401(url)
    ) {
      const refreshed = await tryRefreshSession();
      if (refreshed) {
        return apiRequest<T>(endpoint, options, false);
      }
      return {
        success: false,
        message: 'Session telah berakhir. Silakan login kembali.',
        error: 'Session expired',
      };
    }

    if (!response.ok) {
      // Jika error dari backend, gunakan message atau error field
      const errorMessage =
        (typeof data.message === 'string' && data.message) ||
        (typeof data.error === 'string' && data.error) ||
        (typeof data.detail === 'string' && data.detail) ||
        'Terjadi kesalahan';
      return {
        success: false,
        message: errorMessage,
        error:
          (typeof data.error === 'string' && data.error) ||
          (typeof data.message === 'string' && data.message) ||
          errorMessage,
      };
    }

    // Backend WebResponse: { status: "success", data: {...} } atau { success: true, data: ... }
    const hasWebWrapper =
      data.status === 'success' ||
      data.status === 'error' ||
      data.success === true ||
      data.success === false;

    if (hasWebWrapper) {
      const isSuccess = data.status === 'success' || data.success === true;
      return {
        success: isSuccess,
        message:
          (typeof data.message === 'string' && data.message) ||
          (isSuccess ? 'Success' : 'Error'),
        data: data.data as T | undefined,
        error:
          (typeof data.error === 'string' && data.error) ||
          (!isSuccess && typeof data.message === 'string' ? data.message : undefined),
      };
    }

    // JSON langsung dari FastAPI (tanpa envelope), mis. { data: [], pagination: {} }
    return {
      success: true,
      message: (typeof data.message === 'string' && data.message) || 'Success',
      data: data as unknown as T,
      error: undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Gagal terhubung ke server',
      error: error.message || 'Network error',
    };
  }
}

/**
 * Download binary file (PDF, ZIP, etc.) from API with session cookies.
 */
export async function downloadApiFile(
  endpoint: string,
  filename: string,
  allowRefreshRetry = true,
): Promise<{ success: boolean; message?: string }> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (
      response.status === 401 &&
      allowRefreshRetry &&
      shouldAttemptRefreshOn401(url)
    ) {
      const refreshed = await tryRefreshSession();
      if (refreshed) {
        return downloadApiFile(endpoint, filename, false);
      }
      return { success: false, message: 'Session telah berakhir. Silakan login kembali.' };
    }

    if (!response.ok) {
      const data = await parseResponseBody(response);
      const errorMessage =
        (typeof data.message === 'string' && data.message) ||
        (typeof data.detail === 'string' && data.detail) ||
        (typeof data.error === 'string' && data.error) ||
        'Gagal mengunduh file';
      return { success: false, message: errorMessage };
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Network error';
    return { success: false, message: message || 'Gagal terhubung ke server' };
  }
}

/**
 * Auth API functions
 */
export const authAPI = {
  /**
   * Public session timing from backend (idle timeout, warning lead time).
   */
  getSessionConfig: async () => {
    return apiRequest<SessionConfig>('/auth/session-config', { method: 'GET' });
  },

  /**
   * Remaining access token lifetime (requires authenticated session).
   */
  getSessionStatus: async () => {
    return apiRequest<{ expires_in: number; expires_at: number | null }>(
      '/auth/session',
      { method: 'GET' }
    );
  },

  /**
   * Register user baru
   */
  register: async (data: {
    username: string;
    email: string;
    password: string;
    firstname: string;
    lastname: string;
  }) => {
    return apiRequest<{
      id: string;
      username: string;
      email: string;
      firstname: string;
      lastname: string;
      fullname: string;
      created_at: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Login user
   */
  login: async (data: {
    email: string;
    password: string;
    remember_me?: boolean;
    turnstile_token?: string | null;
  }) => {
    return apiRequest<{
      user: {
        id: string;
        username: string;
        email: string;
        firstname: string;
        lastname: string;
        fullname: string;
      };
      token: string;
      refreshToken: string;
      expires_in?: number;
      access_token?: string;
      token_type?: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get current user data
   */
  getMe: async () => {
    return apiRequest<{
      id: string;
      username: string;
      email: string;
      firstname: string;
      lastname: string;
      fullname: string | null;
      phone_number?: string | null;
      created_at?: string;
      updated_at?: string;
      roles?: {
        id: number;
        name: string;
        guard_name: string;
      }[];
      permissions?: {
        id: number;
        name: string;
        guard_name: string;
      }[];
      impersonatedBy?: {
        id: string;
        username: string;
        email: string;
      } | null;
    }>('/users/me', {
      method: 'GET',
    });
  },

};

/** Payload returned in `data` after a successful media upload */
export type MediaUploadRecord = {
  id: number;
  url: string;
  file_name?: string;
  mime_type?: string;
  size?: number;
};

export type MediaUploadResult =
  | { success: true; message: string; data: MediaUploadRecord }
  | { success: false; message: string; error?: string };

/**
 * Media API functions
 */
export const mediaAPI = {
  /**
   * Upload a single media file
   */
  uploadMedia: async (
    file: File,
    model_type: string,
    model_id: string,
    collection: string = 'default'
  ): Promise<MediaUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model_type', model_type);
    formData.append('model_id', model_id);
    formData.append('collection', collection);

    // Token sekarang di HttpOnly cookie, browser akan otomatis mengirim
    // Don't set Content-Type for FormData, browser will set it with boundary
    const headers: HeadersInit = {};

    try {
      const doUpload = () =>
        fetch(`${API_BASE_URL}/media/upload`, {
          method: 'POST',
          headers,
          body: formData,
          credentials: 'include', // Important: include cookies for authentication
        });

      let response = await doUpload();

      if (response.status === 401) {
        const refreshed = await tryRefreshSession();
        if (refreshed) {
          response = await doUpload();
        }
      }

      const data = await parseResponseBody(response);

      if (!response.ok) {
        return {
          success: false,
          message:
            (typeof data.message === 'string' && data.message) ||
            (typeof data.error === 'string' && data.error) ||
            'Gagal mengupload file',
          error:
            (typeof data.error === 'string' && data.error) ||
            (typeof data.message === 'string' && data.message) ||
            'Upload failed',
        };
      }

      return {
        success: true,
        message: (typeof data.message === 'string' && data.message) || 'File berhasil diupload',
        data: data.data as MediaUploadRecord,
      };
    } catch (error: any) {
      console.error('Upload media error:', error);
      return {
        success: false,
        message: error.message || 'Terjadi kesalahan saat mengupload file',
        error: error.message || 'Network error',
      };
    }
  },

  /**
   * Get media by ID
   */
  getMediaById: async (id: number) => {
    return apiRequest<{
      id: number;
      model_type: string;
      model_id: string;
      collection: string;
      url: string;
      file_name: string;
      mime_type: string;
      size: number;
      created_at: string;
    }>(`/media/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Get media by model_type and model_id
   */
  getMediaByModel: async (model_type: string, model_id: string, collection?: string) => {
    const queryParams = new URLSearchParams();
    queryParams.append('model_type', model_type);
    queryParams.append('model_id', model_id);
    if (collection) queryParams.append('collection', collection);

    const endpoint = `/media/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiRequest<{
      media: Array<{
        id: number;
        model_type: string;
        model_id: string;
        collection: string;
        url: string;
        file_name: string;
        mime_type: string;
        size: number;
        created_at: string;
      }>;
    }>(endpoint, {
      method: 'GET',
    });
  },

  /**
   * Delete media by ID
   */
  deleteMedia: async (id: number) => {
    return apiRequest<{ message: string }>(`/media/${id}`, {
      method: 'DELETE',
      credentials: 'include', // Kirim cookies
    });
  },

  /**
   * Delete file by URL (for settings)
   */
  deleteFileByUrl: async (url: string) => {
    return apiRequest<{ deleted: boolean }>('/media/delete-by-url', {
      method: 'POST',
      body: JSON.stringify({ url }),
      credentials: 'include',
    });
  },
};

/**
 * Helper untuk menghapus token (logout)
 * Token sekarang di HttpOnly cookie, jadi perlu request ke backend (/auth/logout)
 */
export const removeAuthToken = async () => {
  clearSessionTiming();
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (err) {
    // Jangan blokir logout frontend jika request gagal,
    // cookie akan expire sendiri sesuai masa berlaku.
    console.warn('Failed to call /auth/logout, session will expire by itself.', err);
  }
};

/**
 * Helper untuk menghapus admin token saja
 * Token sekarang di HttpOnly cookie, jadi kita perlu request ke backend untuk clear
 */
export const removeAdminToken = async () => {
  // Admin token akan di-clear oleh backend saat stopImpersonate
  // Tidak perlu action khusus di frontend
};

/**
 * Helper untuk mendapatkan token
 * Catatan: Token sekarang di HttpOnly cookie, jadi tidak bisa diakses dari JavaScript
 * Fungsi ini tetap ada untuk backward compatibility, tapi akan return null
 */
export const getAuthToken = (): string | null => {
  // Token di HttpOnly cookie, tidak bisa diakses dari JavaScript
  return null;
};

/**
 * Helper untuk mendapatkan admin token asli
 * Catatan: Token sekarang di HttpOnly cookie, jadi tidak bisa diakses dari JavaScript
 */
export const getAdminToken = (): string | null => {
  // Token di HttpOnly cookie, tidak bisa diakses dari JavaScript
  return null;
};

/**
 * Helper untuk mendapatkan refresh token
 * Catatan: Token sekarang di HttpOnly cookie, jadi tidak bisa diakses dari JavaScript
 */
export const getRefreshToken = (): string | null => {
  // Token di HttpOnly cookie, tidak bisa diakses dari JavaScript
  return null;
};

/**
 * Helper untuk menyimpan token (deprecated - token sekarang di-set oleh backend)
 * Tetap ada untuk backward compatibility, tapi tidak melakukan apa-apa
 */
export const setAuthToken = (_token: string) => {
  // Token sekarang di-set oleh backend sebagai HttpOnly cookie
  // Tidak perlu action di frontend
  console.warn('setAuthToken is deprecated - token is now set by backend as HttpOnly cookie');
};

/**
 * Helper untuk menyimpan refresh token (deprecated - token sekarang di-set oleh backend)
 * Tetap ada untuk backward compatibility, tapi tidak melakukan apa-apa
 */
export const setRefreshToken = (_refreshToken: string) => {
  // Token sekarang di-set oleh backend sebagai HttpOnly cookie
  // Tidak perlu action di frontend
  console.warn('setRefreshToken is deprecated - token is now set by backend as HttpOnly cookie');
};

/**
 * Helper untuk menyimpan admin token (deprecated - token sekarang di-set oleh backend)
 * Tetap ada untuk backward compatibility, tapi tidak melakukan apa-apa
 */
export const setAdminToken = (_token: string) => {
  // Token sekarang di-set oleh backend sebagai HttpOnly cookie
  // Tidak perlu action di frontend
  console.warn('setAdminToken is deprecated - token is now set by backend as HttpOnly cookie');
};

/**
 * User API functions
 */
export const userAPI = {
  /**
   * Get all users with pagination and search
   */
  getAllUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    // Backend route didefinisikan di "/" dengan prefix "/users" -> butuh trailing slash
    const endpoint = `/users/${queryString ? `?${queryString}` : ''}`;

    return apiRequest<{
      users: Array<{
        id: string;
        username: string;
        email: string;
        firstname: string;
        lastname: string;
        fullname: string | null;
        phone_number: string | null;
        created_at: string | null;
        updated_at: string | null;
        roles?: Array<{
          id: number;
          name: string;
          guard_name: string;
        }>;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(endpoint, {
      method: 'GET',
    });
  },

  /**
   * Get user by ID
   */
  getUserById: async (id: string) => {
    return apiRequest<{
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
    }>(`/users/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Create new user
   */
  createUser: async (data: {
    username: string;
    email: string;
    password: string;
    firstname: string;
    lastname: string;
    fullname?: string | null;
    phone_number?: string | null;
    roleIds?: (string | number)[];
  }) => {
    // Prepare request body: convert roleIds to role_ids (snake_case) and ensure integers
    const requestBody: any = {
      username: data.username,
      email: data.email,
      password: data.password,
      firstname: data.firstname,
      lastname: data.lastname,
      fullname: data.fullname,
      phone_number: data.phone_number,
    };

    // Convert roleIds to role_ids (snake_case) and ensure it's an array of integers
    if (data.roleIds && data.roleIds.length > 0) {
      requestBody.role_ids = data.roleIds.map(id => Number(id));
    }

    return apiRequest<{
      id: string;
      username: string;
      email: string;
      firstname: string;
      lastname: string;
      fullname: string | null;
      phone_number: string | null;
      created_at: string;
      updated_at: string;
      roles: Array<{
        id: number;
        name: string;
        guard_name: string;
      }>;
    }>('/users/', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  },

  /**
   * Update user by ID
   */
  updateUser: async (id: string, data: {
    firstname: string;
    lastname: string;
    username?: string;
    fullname?: string | null;
    phone_number?: string | null;
    email?: string;
  }) => {
    return apiRequest<{
      id: string;
      username: string;
      email: string;
      firstname: string;
      lastname: string;
      fullname: string | null;
      phone_number: string | null;
      created_at: string;
      updated_at: string;
    }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update user roles
   */
  updateUserRoles: async (id: string, roleIds: (string | number)[]) => {
    return apiRequest<{
      roles: Array<{
        id: number;
        name: string;
        guard_name: string;
      }>;
    }>(`/users/${id}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ role_ids: roleIds }),
    });
  },

  /**
   * Impersonate a user (superadmin only)
   */
  impersonateUser: async (userId: string) => {
    return apiRequest<{
      user: {
        id: string;
        username: string;
        email: string;
        firstname: string;
        lastname: string;
        fullname: string | null;
        roles: Array<{
          id: number;
          name: string;
          guard_name: string;
        }>;
      };
      impersonated_by: {
        id: string;
        username: string;
        email: string;
      };
    }>(`/users/${userId}/impersonate`, {
      method: 'POST',
    });
  },

  /**
   * Stop impersonation and return to original admin
   */
  stopImpersonate: async () => {
    return apiRequest<{
      user: {
        id: string;
        username: string;
        email: string;
        firstname: string;
        lastname: string;
        fullname: string | null;
        roles: Array<{
          id: number;
          name: string;
          guard_name: string;
        }>;
      };
      redirect_url: string;
    }>('/users/stop-impersonate', {
      method: 'POST',
    });
  },

  /**
   * Get all deleted users
   */
  getDeletedUsers: async (params?: { page?: number; limit?: number; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    
    const endpoint = `/users/deleted${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiRequest<{
      users: Array<{
        id: string;
        username: string;
        email: string;
        firstname: string;
        lastname: string;
        fullname: string | null;
        phone_number: string | null;
        created_at: string | null;
        updated_at: string | null;
        deleted_at: string | null;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(endpoint, {
      method: 'GET',
    });
  },

  /**
   * Delete user by ID (soft delete)
   */
  deleteUser: async (id: string) => {
    return apiRequest<null>(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Force delete user by ID (hard delete)
   */
  forceDeleteUser: async (id: string) => {
    return apiRequest<null>(`/users/${id}/force`, {
      method: 'DELETE',
    });
  },

  /**
   * Verify user email
   */
  verifyUserEmail: async (id: string) => {
    return apiRequest<{
      email_verified_at: string;
    }>(`/users/${id}/verify-email`, {
      method: 'POST',
    });
  },

  /**
   * Send verification email
   */
  sendVerificationEmail: async (id: string) => {
    return apiRequest<{
      message: string;
    }>(`/users/${id}/send-verification-email`, {
      method: 'POST',
    });
  },

  /**
   * Reset user password (admin only)
   */
  resetPassword: async (id: string, data: { password: string; confirm_password: string }) => {
    return apiRequest<{
      message: string;
    }>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update current user profile
   */
  updateMyProfile: async (data: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone_number?: string | null;
    username?: string;
  }) => {
    return apiRequest<{
      id: string;
      username: string;
      email: string;
      firstname: string;
      lastname: string;
      fullname: string | null;
      phone_number: string | null;
      created_at: string;
      updated_at: string;
      roles?: Array<{
        id: number;
        name: string;
        guard_name: string;
      }>;
    }>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Change current user password
   * Menggunakan endpoint /users/me/change-password dengan validasi password lama
   * Endpoint ini perlu dibuat di backend untuk validasi password lama sebelum update
   */
  changePassword: async (data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) => {
    return apiRequest<{
      message: string;
    }>('/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: data.current_password,
        password: data.new_password,
        confirm_password: data.confirm_password,
      }),
    });
  },
};

/**
 * Role API functions
 */
export const roleAPI = {
  /**
   * Get all roles with pagination and search
   */
  getAllRoles: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    // Backend route didefinisikan di "/" dengan prefix "/roles" -> butuh trailing slash
    const endpoint = `/roles/${queryString ? `?${queryString}` : ''}`;

    return apiRequest<{
      roles: Array<{
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
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(endpoint, {
      method: 'GET',
    });
  },

  /**
   * Get role by ID
   */
  getRoleById: async (id: string | number) => {
    return apiRequest<{
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
      users: Array<{
        id: string;
        username: string;
        email: string;
        fullname: string | null;
      }>;
      created_at: string | null;
      updated_at: string | null;
    }>(`/roles/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Get all permissions
   */
  getAllPermissions: async () => {
    return apiRequest<{
      permissions: Array<{
        id: number;
        name: string;
        guard_name: string;
        created_at: string | null;
        updated_at: string | null;
      }>;
    }>('/roles/permissions', {
      method: 'GET',
    });
  },

  /**
   * Update role details (name, guard_name)
   */
  updateRole: async (id: string | number, data: { name: string; guard_name: string }) => {
    return apiRequest<{
      id: string;
      name: string;
      guard_name: string;
      created_at: string | null;
      updated_at: string | null;
    }>(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update role permissions
   */
  updateRolePermissions: async (id: string | number, permissionIds: (string | number)[]) => {
    // Backend mengharapkan List[int], jadi konversi semua ke number
    const permissionIdsAsNumbers = permissionIds.map(id => Number(id));
    return apiRequest<{
      permissions: Array<{
        id: number;
        name: string;
        guard_name: string;
      }>;
    }>(`/roles/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permission_ids: permissionIdsAsNumbers }),
    });
  },
};

/**
 * Settings API functions
 */
export const settingAPI = {
  /**
   * Get all settings
   */
  getAll: async () => {
    return apiRequest<Array<{
      id: number;
      group: string;
      name: string;
      locked: number;
      payload: any;
      created_at: string;
      updated_at: string;
    }>>('/settings', {
      method: 'GET',
    });
  },

  /**
   * Get settings by group
   */
  getByGroup: async (groupName: string) => {
    return apiRequest<Record<string, any>>(`/settings/group/${groupName}`, {
      method: 'GET',
    });
  },

  /**
   * Get one setting
   */
  getOne: async (groupName: string, settingName: string) => {
    return apiRequest<{ value: any }>(`/settings/${groupName}/${settingName}`, {
      method: 'GET',
    });
  },

  /**
   * Create or update setting (upsert)
   */
  upsert: async (data: {
    group: string;
    name: string;
    payload: any;
    locked?: boolean;
  }) => {
    return apiRequest<{
      id: number;
      group: string;
      name: string;
      locked: number;
      payload: any;
      created_at: string;
      updated_at: string;
    }>('/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update setting
   */
  update: async (
    groupName: string,
    settingName: string,
    data: {
      payload?: any;
      locked?: boolean;
    }
  ) => {
    return apiRequest<{
      id: number;
      group: string;
      name: string;
      locked: number;
      payload: any;
      created_at: string;
      updated_at: string;
    }>(`/settings/${groupName}/${settingName}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update multiple settings
   */
  updateMultiple: async (settings: Array<{
    group: string;
    name: string;
    payload: any;
    locked?: boolean;
  }>) => {
    return apiRequest<Array<{
      id: number;
      group: string;
      name: string;
      locked: number;
      payload: any;
      created_at: string;
      updated_at: string;
    }>>('/settings/multiple', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    });
  },

  /**
   * Delete setting
   */
  delete: async (groupName: string, settingName: string) => {
    return apiRequest(`/settings/${groupName}/${settingName}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Unit API functions
 */
export const unitAPI = {
  /**
   * Get all units with pagination and search
   */
  getAllUnits: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    all?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.all) queryParams.append('all', 'true');

    const queryString = queryParams.toString();
    const endpoint = `/units/${queryString ? `?${queryString}` : ''}`;

    return apiRequest<{
      units: Array<{
        id: string;
        name: string;
        parent_id: string | null;
        created_at: string | null;
        updated_at: string | null;
        parent?: {
          id: string;
          name: string;
        } | null;
        children?: Array<{
          id: string;
          name: string;
        }>;
      }>;
      pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(endpoint, {
      method: 'GET',
    });
  },

  /**
   * Get unit by ID
   */
  getUnitById: async (id: string) => {
    return apiRequest<{
      id: string;
      name: string;
      parent_id: string | null;
      created_at: string | null;
      updated_at: string | null;
      parent?: {
        id: string;
        name: string;
      } | null;
      children?: Array<{
        id: string;
        name: string;
      }>;
    }>(`/units/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Create new unit
   */
  createUnit: async (data: { name: string; parent_id?: string | null }) => {
    return apiRequest<{
      id: string;
      name: string;
      parent_id: string | null;
      created_at: string | null;
      updated_at: string | null;
    }>('/units/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update unit by ID
   */
  updateUnit: async (id: string, data: { name?: string; parent_id?: string | null }) => {
    return apiRequest<{
      id: string;
      name: string;
      parent_id: string | null;
      created_at: string | null;
      updated_at: string | null;
    }>(`/units/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete unit by ID
   */
  deleteUnit: async (id: string) => {
    return apiRequest<null>(`/units/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Role Scope API functions
 */
export const roleScopeAPI = {
  /**
   * Get all role-scopes with pagination and search
   */
  getRoleScopes: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    has_scope?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.has_scope !== undefined) queryParams.append('has_scope', params.has_scope.toString());

    const queryString = queryParams.toString();
    const endpoint = `/role-scopes/${queryString ? `?${queryString}` : ''}`;

    return apiRequest<{
      role_scopes: Array<{
        user_role_id: number;
        user_id: string;
        username: string;
        fullname: string | null;
        created_at: string | null;
        role_id: number;
        role_name: string;
        scopes: Array<{
          id: string;
          name: string;
        }>;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(endpoint, {
      method: 'GET',
    });
  },

  /**
   * Get all role-scopes for a user
   */
  getUserRoleScopes: async (userId: string) => {
    return apiRequest<Array<{
      user_role_id: number;
      role_id: number;
      role_name: string;
      scopes: Array<{
        id: string;
        name: string;
      }>;
    }>>(`/role-scopes/user/${userId}`, {
      method: 'GET',
    });
  },

  /**
   * Update scopes for a specific user role mapping
   */
  updateRoleScopes: async (userRoleId: number, scopeIds: string[]) => {
    return apiRequest<null>(`/role-scopes/${userRoleId}`, {
      method: 'PUT',
      body: JSON.stringify({ scope_ids: scopeIds }),
    });
  },
};

export interface DashboardSummaryData {
  counts: {
    users: number;
    roles: number;
    units: number;
  };
}

export const dashboardAPI = {
  getSummary: async () => {
    return apiRequest<DashboardSummaryData>('/dashboard/summary', { method: 'GET' });
  },
};

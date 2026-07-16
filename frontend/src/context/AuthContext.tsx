import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { authAPI, removeAuthToken, userAPI } from '../utils/api';
import { setAccessTokenExpiryFromNow, clearSessionTiming } from '../utils/sessionManager';
import SessionTransitionOverlay from '../components/common/SessionTransitionOverlay';

const AUTH_TRANSITION_KEY = 'auth_session_transition';

function hasPendingAuthTransition(): boolean {
  try {
    return sessionStorage.getItem(AUTH_TRANSITION_KEY) === '1';
  } catch {
    return false;
  }
}

function clearBootSplash() {
  document.documentElement.classList.remove('auth-transition-active');
  document.getElementById('auth-boot-splash')?.remove();
}

export interface User {
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
    permissions?: {
      id: number;
      name: string;
      guard_name: string;
    }[];
  }[];
  permissions?: {
    id: number;
    name: string;
    guard_name: string;
  }[];
}

interface ImpersonateInfo {
  id: string;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSessionTransitioning: boolean;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  impersonatedBy: ImpersonateInfo | null;
  hasSuperAdminRole: boolean;
  hasPermission: (permission: string | string[]) => boolean;
  fetchUser: (force?: boolean, options?: { preserveTransition?: boolean }) => Promise<void>;
  registerNavigate: (fn: (to: string) => void) => void;
  logout: () => void;
  impersonate: (userId: string) => Promise<void>;
  stopImpersonate: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionTransitioning, setIsSessionTransitioning] = useState(hasPendingAuthTransition);
  const [transitionMessage, setTransitionMessage] = useState('Memuat sesi pengguna...');
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedBy, setImpersonatedBy] = useState<ImpersonateInfo | null>(null);
  const isFetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);
  const sessionExpiredRef = useRef(false);
  const navigateRef = useRef<((to: string) => void) | null>(null);

  const registerNavigate = useCallback((fn: (to: string) => void) => {
    navigateRef.current = fn;
  }, []);

  const endSessionTransition = useCallback(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    await new Promise((resolve) => setTimeout(resolve, 120));
    try {
      sessionStorage.removeItem(AUTH_TRANSITION_KEY);
    } catch {
      // ignore
    }
    clearBootSplash();
    setIsSessionTransitioning(false);
    setIsLoading(false);
  }, []);

  // Helper function to get current pathname
  const getCurrentPathname = () => {
    return window.location.pathname;
  };

  // Helper function to check if user has superadmin role
  const hasSuperAdminRole = (userRoles?: { id: number; name: string; guard_name: string }[]): boolean => {
    if (!userRoles || userRoles.length === 0) return false;
    return userRoles.some(role => role.name === 'superadmin');
  };

  // Helper function to check if user has permission
  const hasPermission = (permission: string | string[]): boolean => {
    if (!user) return false;
    
    // Superadmin memiliki semua permissions
    if (hasSuperAdminRole(user.roles)) {
      return true;
    }
    
    // Collect all permissions from user's roles
    const userPermissionNames = new Set<string>();
    
    // Get permissions from user.permissions (if directly available)
    if (user.permissions && user.permissions.length > 0) {
      user.permissions.forEach(p => userPermissionNames.add(p.name));
    }
    
    // Get permissions from roles (permissions are nested in roles)
    if (user.roles && user.roles.length > 0) {
      user.roles.forEach(role => {
        // RoleRead has permissions array
        if ((role as any).permissions && Array.isArray((role as any).permissions)) {
          (role as any).permissions.forEach((perm: { name: string }) => {
            userPermissionNames.add(perm.name);
          });
        }
      });
    }
    
    // If no permissions found, return false
    if (userPermissionNames.size === 0) return false;
    
    const requiredPermissions = Array.isArray(permission) ? permission : [permission];
    
    // Check if user has at least one of the required permissions (OR logic)
    return requiredPermissions.some(perm => userPermissionNames.has(perm));
  };

  const fetchUser = async (force = false, options?: { preserveTransition?: boolean }) => {
    const currentPath = getCurrentPathname();
    const isAuthPath =
      currentPath.endsWith('/signin') || currentPath.endsWith('/signup');

    // Jangan fetch jika sudah di halaman login/signup (kecuali dipaksa)
    if (!force && isAuthPath) {
      setIsLoading(false);
      setUser(null);
      sessionExpiredRef.current = false; // Reset flag ketika di halaman login
      return;
    }

    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      return;
    }

    // Token sekarang di HttpOnly cookie, tidak bisa diakses dari JavaScript
    // Langsung fetch user data, jika gagal berarti tidak ada token atau token invalid

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      sessionExpiredRef.current = false; // Reset flag sebelum fetch
      const response = await authAPI.getMe();
      
      // Backend mengembalikan { status: "success", data: {...} } atau { success: true, data: {...} }
      const isSuccess = (response as any).status === "success" || response.success === true;
      const userData = response.data;
      
      if (isSuccess && userData) {
        setUser(userData);
        hasFetchedRef.current = true;
        sessionExpiredRef.current = false;

        try {
          const statusRes = await authAPI.getSessionStatus();
          if (statusRes.success && statusRes.data?.expires_in != null) {
            setAccessTokenExpiryFromNow(statusRes.data.expires_in);
          }
        } catch {
          // Non-blocking: proactive refresh still uses session-config fallback
        }
        
        // Check if backend returned impersonatedBy info (from getMe response)
        if (userData.impersonatedBy) {
          setIsImpersonating(true);
          setImpersonatedBy(userData.impersonatedBy);
        } else {
          setIsImpersonating(false);
          setImpersonatedBy(null);
        }
      } else {
        // Token invalid atau tidak ada, clear user state
        // Check jika error adalah session expired
        const errorMsg = response.message || (response as any).message || response.error;
        if (errorMsg && (
          errorMsg.includes('Session') || 
          errorMsg.includes('berakhir') ||
          errorMsg.includes('expired') ||
          errorMsg.includes('credentials')
        )) {
          sessionExpiredRef.current = true;
        }
        setUser(null);
        setIsImpersonating(false);
        setImpersonatedBy(null);
        hasFetchedRef.current = false;
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
      setIsImpersonating(false);
      setImpersonatedBy(null);
      hasFetchedRef.current = false;
      // Set flag jika error terkait session
      sessionExpiredRef.current = true;
    } finally {
      if (!options?.preserveTransition) {
        try {
          sessionStorage.removeItem(AUTH_TRANSITION_KEY);
        } catch {
          // ignore
        }
        clearBootSplash();
        setIsSessionTransitioning(false);
      }
      if (!options?.preserveTransition) {
        setIsLoading(false);
      }
      isFetchingRef.current = false;
    }
  };

  const beginSessionTransition = (message = 'Memuat sesi pengguna...') => {
    setTransitionMessage(message);
    try {
      sessionStorage.setItem(AUTH_TRANSITION_KEY, '1');
    } catch {
      // ignore
    }
    setIsSessionTransitioning(true);
    setIsLoading(true);
  };

  const impersonate = async (userId: string) => {
    // Check if user is superadmin
    if (!hasSuperAdminRole(user?.roles)) {
      throw new Error('Only superadmin can impersonate users');
    }

    // Save current location before impersonating
    const currentPath = getCurrentPathname();
    sessionStorage.setItem('impersonate_return_path', currentPath);

    beginSessionTransition('Memuat sesi pengguna...');

    try {
      const response = await userAPI.impersonateUser(userId);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to impersonate user');
      }
      await fetchUser(true, { preserveTransition: true });
      navigateRef.current?.('/');
    } catch (error: any) {
      console.error('Impersonate error:', error);
      throw error;
    } finally {
      await endSessionTransition();
    }
  };

  const stopImpersonate = async (): Promise<string> => {
    beginSessionTransition('Keluar dari mode impersonate...');

    let returnPath = '/users';
    try {
      const response = await userAPI.stopImpersonate();
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to stop impersonation');
      }
      returnPath =
        sessionStorage.getItem('impersonate_return_path') ||
        response.data.redirect_url ||
        '/users';
      sessionStorage.removeItem('impersonate_return_path');

      await fetchUser(true, { preserveTransition: true });
      navigateRef.current?.(returnPath);
      return returnPath;
    } catch (error: any) {
      console.error('Stop impersonate error:', error);
      throw error;
    } finally {
      await endSessionTransition();
    }
  };

  const logout = () => {
    clearSessionTiming();
    removeAuthToken();
    setUser(null);
    setIsImpersonating(false);
    setImpersonatedBy(null);
    hasFetchedRef.current = false;
    sessionExpiredRef.current = false; // Reset flag saat logout
  };

  useEffect(() => {
    const currentPath = getCurrentPathname();
    const isAuthPath =
      currentPath.endsWith('/signin') || currentPath.endsWith('/signup');

    // Jika di halaman login/signup, jangan lakukan auto-fetch/refresh sama sekali
    // supaya tidak ada request /auth/remember-login atau /auth/refresh yang gagal.
    if (isAuthPath) {
      setUser(null);
      setIsLoading(false);
      hasFetchedRef.current = false;
      sessionExpiredRef.current = false;
      return;
    }

    // Hanya fetch jika belum pernah fetch dan tidak sedang fetching
    // Jangan fetch jika session sudah expired (akan di-handle oleh ProtectedRoute redirect)
    if (!hasFetchedRef.current && !isFetchingRef.current && !sessionExpiredRef.current) {
      fetchUser();
    }
  }, []); // Only run on mount

  const value: AuthContextType = {
    user,
    isLoading,
    isSessionTransitioning,
    isAuthenticated: !!user,
    isImpersonating,
    impersonatedBy,
    hasSuperAdminRole: hasSuperAdminRole(user?.roles),
    hasPermission,
    fetchUser,
    registerNavigate,
    logout,
    impersonate,
    stopImpersonate,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionTransitionOverlay
        isOpen={isSessionTransitioning}
        message={transitionMessage}
      />
    </AuthContext.Provider>
  );
};


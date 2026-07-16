import { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";
import NotFound from "../../pages/OtherPage/NotFound";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string | string[];
  fallback?: ReactNode;
}

/**
 * ProtectedRoute component untuk melindungi route berdasarkan permission
 * Jika user tidak memiliki permission yang diperlukan, akan menampilkan halaman 404
 */
export default function ProtectedRoute({
  children,
  requiredPermission,
  fallback,
}: ProtectedRouteProps) {
  const { hasPermission, isLoading, isSessionTransitioning, isAuthenticated } = useAuth();
  const location = useLocation();

  // Overlay global menangani transisi; jangan render layar putih / 404 sementara
  if (isLoading || isSessionTransitioning) {
    return null;
  }

  // Jika tidak authenticated, redirect ke signin dengan state untuk redirect kembali
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Jika ada requiredPermission dan user tidak memiliki permission, tampilkan 404
  if (requiredPermission && !hasPermission(requiredPermission)) {
    // Render NotFound menggunakan Portal ke body agar benar-benar full screen tanpa header
    return fallback || createPortal(<NotFound />, document.body);
  }

  // Jika semua checks passed, render children
  return <>{children}</>;
}


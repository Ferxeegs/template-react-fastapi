import { useEffect, useState } from "react";

interface SessionTransitionOverlayProps {
  isOpen: boolean;
  message?: string;
}

/**
 * Full-screen overlay for auth session switches (impersonate).
 * Uses app background colors to avoid white flash.
 */
export default function SessionTransitionOverlay({
  isOpen,
  message = "Memuat sesi pengguna...",
}: SessionTransitionOverlayProps) {
  const [visible, setVisible] = useState(isOpen);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setFading(false);
      document.documentElement.classList.add("auth-transition-active");
      document.body.style.overflow = "hidden";
      return;
    }

    if (!visible) return;

    setFading(true);
    document.documentElement.classList.remove("auth-transition-active");

    const timer = window.setTimeout(() => {
      setVisible(false);
      setFading(false);
      document.body.style.overflow = "";
    }, 280);

    return () => window.clearTimeout(timer);
  }, [isOpen, visible]);

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("auth-transition-active");
      document.body.style.overflow = "";
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-opacity duration-300 ease-out ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <div className="h-11 w-11 rounded-full border-4 border-brand-200 border-t-brand-500 animate-spin dark:border-brand-900 dark:border-t-brand-400" />
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 select-none">
          {message}
        </p>
      </div>
    </div>
  );
}

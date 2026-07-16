import { useEffect } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export default function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const typeStyles = {
    success: {
      container: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
      icon: "text-green-600 dark:text-green-400",
      text: "text-green-800 dark:text-green-300",
    },
    error: {
      container: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
      icon: "text-red-600 dark:text-red-400",
      text: "text-red-800 dark:text-red-300",
    },
    warning: {
      container: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800",
      icon: "text-yellow-600 dark:text-yellow-400",
      text: "text-yellow-800 dark:text-yellow-300",
    },
    info: {
      container: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
      icon: "text-blue-600 dark:text-blue-400",
      text: "text-blue-800 dark:text-blue-300",
    },
  };

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const styles = typeStyles[toast.type];

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg min-w-[300px] max-w-md animate-slide-in-right ${styles.container}`}
    >
      <div className={`flex-shrink-0 ${styles.icon}`}>
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${styles.text}`}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className={`flex-shrink-0 ${styles.icon} hover:opacity-70 transition-opacity`}
        aria-label="Close notification"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}


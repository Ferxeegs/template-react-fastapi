import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Toast, ToastType } from "../components/ui/toast/Toast";

let toastIdCounter = 0;

interface ToastContextType {
  toasts: Toast[];
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = `toast-${++toastIdCounter}`;
    const newToast: Toast = {
      id,
      type,
      message,
      duration,
    };

    setToasts((prev) => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    showToast("success", message, duration);
  }, [showToast]);

  const error = useCallback((message: string, duration?: number) => {
    showToast("error", message, duration);
  }, [showToast]);

  const warning = useCallback((message: string, duration?: number) => {
    showToast("warning", message, duration);
  }, [showToast]);

  const info = useCallback((message: string, duration?: number) => {
    showToast("info", message, duration);
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        success,
        error,
        warning,
        info,
        removeToast,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
};


import { ReactNode } from "react";
import { Modal } from "./Modal";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmButtonColor?: "primary" | "danger" | "warning" | "success" | "info";
  icon?: ReactNode;
  isLoading?: boolean;
  showWarning?: boolean;
  warningMessage?: string;
  children?: ReactNode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonColor = "primary",
  icon,
  isLoading = false,
  showWarning = false,
  warningMessage,
  children,
}) => {
  const colorClasses = {
    primary: "bg-blue-500 hover:bg-blue-600",
    danger: "bg-red-500 hover:bg-red-600",
    warning: "bg-orange-500 hover:bg-orange-600",
    success: "bg-green-500 hover:bg-green-600",
    info: "bg-blue-500 hover:bg-blue-600",
  };

  const iconBgClasses = {
    primary: "bg-blue-100 dark:bg-blue-900/30",
    danger: "bg-red-100 dark:bg-red-900/30",
    warning: "bg-orange-100 dark:bg-orange-900/30",
    success: "bg-green-100 dark:bg-green-900/30",
    info: "bg-blue-100 dark:bg-blue-900/30",
  };

  const iconTextClasses = {
    primary: "text-blue-600 dark:text-blue-400",
    danger: "text-red-600 dark:text-red-400",
    warning: "text-orange-600 dark:text-orange-400",
    success: "text-green-600 dark:text-green-400",
    info: "text-blue-600 dark:text-blue-400",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-md mx-auto">
      <div className="p-4 sm:p-5 md:p-6">
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-3">
            {icon && (
              <div className={`flex items-center justify-center w-12 h-12 rounded-full ${iconBgClasses[confirmButtonColor]}`}>
                <div className={iconTextClasses[confirmButtonColor]}>
                  {icon}
                </div>
              </div>
            )}
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">
              {title}
            </h2>
          </div>
          
          {showWarning && warningMessage && (
            <div className="p-3 mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
              <p className="font-medium mb-1">Peringatan!</p>
              <p>{warningMessage}</p>
            </div>
          )}
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {typeof message === "string" ? <p>{message}</p> : message}
          </div>
          {children && <div className="mt-4">{children}</div>}
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors touch-manipulation"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation ${colorClasses[confirmButtonColor]}`}
          >
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};


import { Modal } from "./Modal";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  buttonText?: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  title = "Berhasil",
  message,
  buttonText = "OK",
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="p-5 sm:p-6">
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              {title}
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {message}
          </p>
        </div>
        
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </Modal>
  );
};


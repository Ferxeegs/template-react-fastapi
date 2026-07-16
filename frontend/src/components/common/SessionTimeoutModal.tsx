import { useEffect, useState } from 'react';
import { Modal } from '../ui/modal';
import Button from '../ui/button/Button';
import { AlertIcon } from '../../icons';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  reason?: 'idle' | 'token';
  onStayLoggedIn: () => void;
  onLogout: () => void;
  remainingTime: number; // dalam detik
}

/**
 * Modal untuk menampilkan warning sebelum session timeout
 */
export default function SessionTimeoutModal({
  isOpen,
  reason = 'idle',
  onStayLoggedIn,
  onLogout,
  remainingTime,
}: SessionTimeoutModalProps) {
  const [countdown, setCountdown] = useState(remainingTime);

  // Update countdown setiap detik
  useEffect(() => {
    if (!isOpen) return;

    setCountdown(remainingTime);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto logout jika countdown habis
          setTimeout(() => {
            onLogout();
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, remainingTime, onLogout]);

  // Format waktu menjadi menit:detik
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onStayLoggedIn} 
      className="max-w-md m-4"
    >
      <div 
        className="relative w-full p-6 bg-white rounded-3xl dark:bg-gray-900 lg:p-8"
      >
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="flex items-center justify-center w-16 h-16 mb-4 bg-yellow-100 rounded-full dark:bg-yellow-900/30">
            <AlertIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>

          {/* Title */}
          <h3 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white/90">
            Session Akan Berakhir
          </h3>

          {/* Description */}
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {reason === 'token'
              ? 'Masa berlaku sesi Anda hampir habis. Session akan berakhir dalam:'
              : 'Anda tidak aktif dalam beberapa waktu. Session Anda akan berakhir dalam:'}
          </p>

          {/* Countdown */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 rounded-lg dark:bg-gray-800">
              <span className="text-2xl font-mono font-semibold text-gray-800 dark:text-white">
                {formatTime(countdown)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 w-full">
            <Button
              variant="outline"
              onClick={onLogout}
              className="flex-1"
            >
              Logout
            </Button>
            <Button
              onClick={onStayLoggedIn}
              className="flex-1"
            >
              Tetap Masuk
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}


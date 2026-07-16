import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimeoutOptions {
  /**
   * Waktu dalam milidetik sebelum user dianggap idle (default: 30 menit)
   */
  idleTime: number;
  /**
   * Waktu dalam milidetik untuk menampilkan warning sebelum logout (default: 5 menit)
   */
  warningTime: number;
  /**
   * Callback yang dipanggil ketika user idle
   */
  onIdle: () => void;
  /**
   * Callback yang dipanggil ketika warning harus ditampilkan
   */
  onWarning?: () => void;
  /**
   * Apakah idle detection aktif (default: true)
   */
  enabled?: boolean;
}

/**
 * Custom hook untuk mendeteksi inaktivitas user dan trigger session timeout
 * 
 * @example
 * ```tsx
 * const { resetTimer, pause, resume } = useIdleTimeout({
 *   idleTime: 30 * 60 * 1000, // 30 menit
 *   warningTime: 5 * 60 * 1000, // 5 menit sebelum logout
 *   onIdle: () => {
 *     logout();
 *     navigate('/signin');
 *   },
 *   onWarning: () => {
 *     setShowWarning(true);
 *   },
 * });
 * ```
 */
export const useIdleTimeout = ({
  idleTime = 30 * 60 * 1000, // 30 menit default
  warningTime = 5 * 60 * 1000, // 5 menit default
  onIdle,
  onWarning,
  enabled = true,
}: UseIdleTimeoutOptions) => {
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityTime = useRef<number>(Date.now());
  const isPaused = useRef<boolean>(false);

  /**
   * Reset timer ketika ada aktivitas user
   */
  const resetTimer = useCallback(() => {
    if (!enabled || isPaused.current) return;

    // Clear existing timeouts
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
      timeoutId.current = null;
    }
    if (warningTimeoutId.current) {
      clearTimeout(warningTimeoutId.current);
      warningTimeoutId.current = null;
    }

    // Update last activity time
    lastActivityTime.current = Date.now();

    // Set warning timeout (idleTime - warningTime sebelum idle)
    const warningTimeout = idleTime - warningTime;
    if (warningTimeout > 0 && onWarning) {
      warningTimeoutId.current = setTimeout(() => {
        onWarning();
      }, warningTimeout);
    }

    // Set idle timeout
    timeoutId.current = setTimeout(() => {
      onIdle();
    }, idleTime);
  }, [idleTime, warningTime, onIdle, onWarning, enabled]);

  /**
   * Pause idle detection (misalnya saat modal terbuka)
   */
  const pause = useCallback(() => {
    isPaused.current = true;
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
      timeoutId.current = null;
    }
    if (warningTimeoutId.current) {
      clearTimeout(warningTimeoutId.current);
      warningTimeoutId.current = null;
    }
  }, []);

  /**
   * Resume idle detection
   */
  const resume = useCallback(() => {
    isPaused.current = false;
    resetTimer();
  }, [resetTimer]);

  /**
   * Setup event listeners untuk mendeteksi aktivitas user
   */
  useEffect(() => {
    if (!enabled) return;

    // Meaningful user activity only — mousemove is excluded (micro-movements never reset idle)
    const events = [
      'mousedown',
      'keypress',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    const handleActivity = () => {
      resetTimer();
    };

    // Attach event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      if (warningTimeoutId.current) {
        clearTimeout(warningTimeoutId.current);
      }
    };
  }, [enabled, resetTimer]);

  return {
    resetTimer,
    pause,
    resume,
  };
};


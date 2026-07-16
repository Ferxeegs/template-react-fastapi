import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import {
  useSessionManager,
  type SessionWarningReason,
} from '../../hooks/useSessionManager';
import SessionTimeoutModal from './SessionTimeoutModal';

/**
 * Session lifecycle: idle timeout synced with backend config + proactive token refresh.
 * Timing is loaded from GET /auth/session-config (ACCESS_TOKEN_EXPIRE_MINUTES, etc.).
 */
export default function SessionTimeoutHandler() {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [warningReason, setWarningReason] = useState<SessionWarningReason>('idle');
  const [remainingTime, setRemainingTime] = useState(60);

  const handleLogout = useCallback(async () => {
    setShowWarning(false);
    logout();
    navigate('/signin', {
      state: {
        message:
          'Session Anda telah berakhir. Silakan login kembali.',
      },
      replace: true,
    });
  }, [logout, navigate]);

  const handleWarning = useCallback((reason: SessionWarningReason) => {
    setWarningReason(reason);
    setShowWarning(true);
  }, []);

  const {
    warningSeconds,
    pause,
    resume,
    extendSession,
    clearWarningFlag,
  } = useSessionManager({
    enabled: isAuthenticated && !!user,
    onLogout: handleLogout,
    onWarning: handleWarning,
  });

  useEffect(() => {
    setRemainingTime(warningSeconds);
  }, [warningSeconds]);

  const handleStayLoggedIn = useCallback(async () => {
    setShowWarning(false);
    clearWarningFlag();
    const ok = await extendSession();
    if (!ok) {
      await handleLogout();
    }
  }, [clearWarningFlag, extendSession, handleLogout]);

  useEffect(() => {
    if (showWarning) {
      pause();
      setRemainingTime(warningSeconds);
    } else {
      resume();
    }
  }, [showWarning, pause, resume, warningSeconds]);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <SessionTimeoutModal
      isOpen={showWarning}
      reason={warningReason}
      onStayLoggedIn={handleStayLoggedIn}
      onLogout={handleLogout}
      remainingTime={remainingTime}
    />
  );
}

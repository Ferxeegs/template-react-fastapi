import { useCallback, useEffect, useRef, useState } from 'react';
import { tryRefreshSession } from '../utils/api';
import {
  fetchSessionConfig,
  getAccessTokenExpiresAt,
  resolveSessionDurations,
  subscribeSessionTiming,
  type SessionConfig,
} from '../utils/sessionManager';
import { useIdleTimeout } from './useIdleTimeout';

export type SessionWarningReason = 'idle' | 'token';

interface UseSessionManagerOptions {
  enabled: boolean;
  onLogout: () => void | Promise<void>;
  onWarning: (reason: SessionWarningReason) => void;
}

/**
 * Coordinates idle timeout (synced with backend) and proactive access-token refresh.
 */
export function useSessionManager({
  enabled,
  onLogout,
  onWarning,
}: UseSessionManagerOptions) {
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const onLogoutRef = useRef(onLogout);
  const onWarningRef = useRef(onWarning);
  const warningShownRef = useRef(false);

  onLogoutRef.current = onLogout;
  onWarningRef.current = onWarning;

  useEffect(() => {
    if (!enabled) return;
    fetchSessionConfig().then(setConfig).catch(() => {
      setConfig({
        access_token_expire_minutes: 30,
        refresh_token_expire_days: 7,
        idle_timeout_minutes: 30,
        session_warning_seconds: 60,
        session_refresh_buffer_seconds: 60,
      });
    });
  }, [enabled]);

  const durations = config ? resolveSessionDurations(config) : null;

  const handleIdle = useCallback(async () => {
    await onLogoutRef.current();
  }, []);

  const handleIdleWarning = useCallback(() => {
    if (warningShownRef.current) return;
    warningShownRef.current = true;
    onWarningRef.current('idle');
  }, []);

  const { resetTimer, pause, resume } = useIdleTimeout({
    idleTime: durations?.idleMs ?? 30 * 60 * 1000,
    warningTime: durations?.warningMs ?? 60 * 1000,
    onIdle: handleIdle,
    onWarning: handleIdleWarning,
    enabled: enabled && !!durations,
  });

  const clearWarningFlag = useCallback(() => {
    warningShownRef.current = false;
  }, []);

  const extendSession = useCallback(async (): Promise<boolean> => {
    clearWarningFlag();
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      resetTimer();
      return true;
    }
    return false;
  }, [clearWarningFlag, resetTimer]);

  // Proactive refresh before JWT access token expires (active users stay signed in silently)
  useEffect(() => {
    if (!enabled || !config) return;

    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
    let tokenWarningTimeout: ReturnType<typeof setTimeout> | null = null;

    const clearTimers = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      if (tokenWarningTimeout) clearTimeout(tokenWarningTimeout);
      refreshTimeout = null;
      tokenWarningTimeout = null;
    };

    const scheduleTokenTimers = () => {
      clearTimers();

      const expiresAt = getAccessTokenExpiresAt();
      if (!expiresAt) return;

      const now = Date.now();
      const msUntilExpiry = expiresAt - now;
      if (msUntilExpiry <= 0) return;

      const refreshBufferMs = config.session_refresh_buffer_seconds * 1000;
      const warningMs = durations?.warningMs ?? config.session_warning_seconds * 1000;
      const idleMs = durations?.idleMs ?? config.idle_timeout_minutes * 60 * 1000;

      const effectiveBufferMs = Math.min(
        refreshBufferMs,
        Math.max(msUntilExpiry - 5_000, msUntilExpiry * 0.5),
      );
      const refreshIn = Math.max(0, msUntilExpiry - effectiveBufferMs);
      refreshTimeout = setTimeout(async () => {
        const ok = await tryRefreshSession();
        if (ok) {
          resetTimer();
        } else {
          await onLogoutRef.current();
        }
      }, refreshIn);

      // Token-expiry warning only when user is active (idle handler covers inactive users)
      const tokenWarningIn = Math.max(0, msUntilExpiry - warningMs);
      if (tokenWarningIn > 0 && tokenWarningIn < idleMs - warningMs) {
        tokenWarningTimeout = setTimeout(() => {
          if (warningShownRef.current) return;
          warningShownRef.current = true;
          onWarningRef.current('token');
        }, tokenWarningIn);
      }
    };

    const unsubscribe = subscribeSessionTiming(scheduleTokenTimers);
    scheduleTokenTimers();

    return () => {
      unsubscribe();
      clearTimers();
    };
  }, [enabled, config, durations, resetTimer]);

  return {
    config,
    warningSeconds: durations ? Math.floor(durations.warningMs / 1000) : 60,
    resetTimer,
    pause,
    resume,
    extendSession,
    clearWarningFlag,
  };
}

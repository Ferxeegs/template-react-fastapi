function getAuthApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw || String(raw).trim().length === 0) {
    return '/api/v1';
  }
  const base = String(raw).replace(/\/+$/, '');
  if (base.endsWith('/api/v1')) {
    return base;
  }
  if (base.endsWith('/api')) {
    return `${base}/v1`;
  }
  return `${base}/api/v1`;
}

export interface SessionConfig {
  access_token_expire_minutes: number;
  refresh_token_expire_days: number;
  idle_timeout_minutes: number;
  session_warning_seconds: number;
  session_refresh_buffer_seconds: number;
}

type SessionListener = () => void;

let cachedConfig: SessionConfig | null = null;
let accessTokenExpiresAt: number | null = null;
const listeners = new Set<SessionListener>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function subscribeSessionTiming(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAccessTokenExpiresAt(): number | null {
  return accessTokenExpiresAt;
}

export function setAccessTokenExpiresAt(expiresAtMs: number | null) {
  accessTokenExpiresAt = expiresAtMs;
  notifyListeners();
}

export function setAccessTokenExpiryFromNow(expiresInSeconds: number) {
  if (expiresInSeconds <= 0) {
    setAccessTokenExpiresAt(null);
    return;
  }
  setAccessTokenExpiresAt(Date.now() + expiresInSeconds * 1000);
}

export function clearSessionTiming() {
  setAccessTokenExpiresAt(null);
}

export function getCachedSessionConfig(): SessionConfig | null {
  return cachedConfig;
}

export async function fetchSessionConfig(force = false): Promise<SessionConfig> {
  if (cachedConfig && !force) {
    return cachedConfig;
  }

  const res = await fetch(`${getAuthApiBaseUrl()}/auth/session-config`, {
    credentials: 'include',
  });
  const body = await res.json().catch(() => ({}));
  const data = body?.data ?? body;

  cachedConfig = {
    access_token_expire_minutes: Number(data.access_token_expire_minutes) || 30,
    refresh_token_expire_days: Number(data.refresh_token_expire_days) || 7,
    idle_timeout_minutes: Number(data.idle_timeout_minutes) || 30,
    session_warning_seconds: Number(data.session_warning_seconds) || 60,
    session_refresh_buffer_seconds: Number(data.session_refresh_buffer_seconds) || 60,
  };

  return cachedConfig;
}

/**
 * Compute idle + warning durations from backend config.
 * Ensures warning always fires before logout even for very short token TTLs.
 */
export function resolveSessionDurations(config: SessionConfig): {
  idleMs: number;
  warningMs: number;
} {
  const idleMs = Math.max(config.idle_timeout_minutes * 60 * 1000, 15_000);
  const requestedWarningMs = config.session_warning_seconds * 1000;
  const maxWarningMs = Math.max(idleMs - 10_000, idleMs * 0.2);
  const warningMs = Math.min(requestedWarningMs, maxWarningMs);

  return { idleMs, warningMs: Math.max(warningMs, 5_000) };
}

import {
  useState,
  FormEvent,
  useEffect,
  useRef,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { Link, useLocation } from "react-router";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import { authAPI } from "../../utils/api";
import { setAccessTokenExpiryFromNow } from "../../utils/sessionManager";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { useTheme } from "../../context/ThemeContext";
import AppLogo from "../common/AppLogo";

const LazyTurnstile = lazy(() =>
  import("@marsidev/react-turnstile").then((m) => ({ default: m.Turnstile }))
);
const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";
const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function toTrustedScriptUrl(url: string): string {
  const tt = (window as Window & {
    trustedTypes?: {
      createPolicy: (
        name: string,
        rules: { createScriptURL: (input: string) => string }
      ) => { createScriptURL: (input: string) => string };
    };
  }).trustedTypes;
  if (!tt) return url;
  try {
    const policy = tt.createPolicy("turnstile-policy", {
      createScriptURL: (input: string) => input,
    });
    return String(policy.createScriptURL(url));
  } catch {
    return url;
  }
}

function TurnstilePlaceholder() {
  return (
    <div
      className="flex h-[65px] w-[300px] max-w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white/60 text-xs text-gray-500 dark:border-slate-600 dark:bg-slate-800/40 dark:text-gray-400"
      aria-hidden
    >
      Memuat verifikasi…
    </div>
  );
}

export default function SignInForm() {
  const location = useLocation();
  const { fetchUser } = useAuth();
  const { theme } = useTheme();
  const { settings, isLoading: isSettingsLoading } = useSettings();
  const siteName = settings?.general?.site_name;
  const siteTagline = settings?.general?.site_tagline;
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY || "").trim();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);
  const [turnstileScriptReady, setTurnstileScriptReady] = useState(false);

  useEffect(() => {
    if (!turnstileSiteKey) {
      setTurnstileScriptReady(false);
      return;
    }
    if (window.turnstile) {
      setTurnstileScriptReady(true);
      return;
    }

    const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      const onLoadExisting = () => setTurnstileScriptReady(true);
      const onErrorExisting = () => setTurnstileScriptReady(false);
      existing.addEventListener("load", onLoadExisting);
      existing.addEventListener("error", onErrorExisting);
      return () => {
        existing.removeEventListener("load", onLoadExisting);
        existing.removeEventListener("error", onErrorExisting);
      };
    }

    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    // Satisfy CSP with Trusted Types in hardened production policies.
    script.src = toTrustedScriptUrl(TURNSTILE_SCRIPT_URL) as unknown as string;

    const onLoad = () => setTurnstileScriptReady(true);
    const onError = () => setTurnstileScriptReady(false);
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    document.body.appendChild(script);

    return () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
  }, [turnstileSiteKey]);

  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  // Auto-fill credentials in development mode
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const [formData, setFormData] = useState({
    email: isDevelopment ? (import.meta.env.VITE_DEV_ADMIN_EMAIL || "superadmin@local.com") : "",
    password: isDevelopment ? (import.meta.env.VITE_DEV_ADMIN_PASSWORD || "12341234") : "",
  });

  // Check for success message from navigation state
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear state after showing message
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user types
    if (error) setError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validasi form
    if (!formData.email.trim()) {
      setError("Email harus diisi");
      setIsLoading(false);
      return;
    }

    if (!formData.password) {
      setError("Password harus diisi");
      setIsLoading(false);
      return;
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError("Format email tidak valid");
      setIsLoading(false);
      return;
    }

    if (turnstileSiteKey) {
      if (!turnstileScriptReady) {
        setError("Verifikasi keamanan masih dimuat. Tunggu sebentar lalu coba lagi.");
        setIsLoading(false);
        return;
      }
      if (!turnstileToken?.trim()) {
        setError("Selesaikan verifikasi keamanan di bawah ini terlebih dahulu.");
        setIsLoading(false);
        return;
      }
    }

    try {
      const response = await authAPI.login({
        email: formData.email.trim(),
        password: formData.password,
        remember_me: isChecked,
        ...(turnstileSiteKey && turnstileToken
          ? { turnstile_token: turnstileToken }
          : {}),
      });


      // Backend mengembalikan { status: "success", message: "...", data: {...} }
      // apiRequest mengembalikan data langsung dari backend (tidak wrap lagi)
      const responseStatus = (response as any).status;
      const isSuccess = responseStatus === "success" || response.success === true;
      const hasData = response.data !== null && response.data !== undefined;

      console.log('isSuccess:', isSuccess, 'hasData:', hasData);

      if (isSuccess && hasData) {

        const loginData = response.data as { expires_in?: number };
        if (typeof loginData?.expires_in === 'number' && loginData.expires_in > 0) {
          setAccessTokenExpiryFromNow(loginData.expires_in);
        }

        // Token sudah di-set di HttpOnly cookie oleh backend
        // Get redirect path from location state atau default ke dashboard
        const from = location.state?.from?.pathname || "/";

        // Fetch user data untuk update context (non-blocking)
        // ProtectedRoute akan handle authentication check
        fetchUser(true).catch((fetchError) => {
          console.warn('Failed to fetch user after login:', fetchError);
        });

        // Redirect langsung ke dashboard
        // Gunakan window.location.href untuk force redirect
        window.location.href = from;
      } else {
        const errorMsg = response.message || (response as any).message || response.error || "Login gagal. Silakan coba lagi.";
        console.error('Login failed:', errorMsg);
        setError(errorMsg);
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || err.error || "Terjadi kesalahan. Silakan coba lagi.");
      turnstileRef.current?.reset();
      setTurnstileToken(null);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full justify-center">
      {/* Header khusus mobile/tablet: logo + nama aplikasi */}
      <div className="flex flex-col items-center w-full pt-3 pb-8 text-center lg:hidden">
        <Link to="/" className="inline-flex flex-col items-center gap-1.5">
          <AppLogo className="h-11 w-auto max-w-[180px]" />
          {isSettingsLoading ? (
            <div className="flex flex-col items-center justify-center w-full mt-1.5 gap-2">
              <div className="h-4 w-32 animate-pulse rounded bg-black/[0.04] dark:bg-white/[0.04]" />
              <div className="h-3 w-48 animate-pulse rounded bg-black/[0.03] dark:bg-white/[0.03]" />
            </div>
          ) : (
            <>
              {siteName ? (
                <span className="mt-1 text-sm font-semibold text-gray-800 dark:text-white/90">
                  {siteName}
                </span>
              ) : (
                <span className="mt-1 text-xs text-gray-400 dark:text-gray-500">Nama aplikasi belum diatur</span>
              )}
              {siteTagline ? (
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {siteTagline}
                </span>
              ) : (
                <span className="text-[11px] text-gray-400 dark:text-gray-500">Tagline belum diatur</span>
              )}
            </>
          )}
        </Link>
      </div>

      <div className="w-full max-w-md p-8 sm:p-10 mx-auto bg-white dark:bg-slate-800/80 lg:bg-transparent lg:dark:bg-transparent rounded-[32px] shadow-2xl lg:shadow-none border border-gray-100 lg:border-none dark:border-slate-600/30">
        <div>
          <div className="mb-8 text-center sm:text-left">
            <h1 className="mb-2 font-extrabold text-gray-900 text-3xl dark:text-white tracking-tight">
              Sign In
            </h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Enter your email and password to sign in!
            </p>
          </div>
          <div>
            {/* <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5">
              <button className="inline-flex items-center justify-center gap-3 py-3 text-sm font-normal text-gray-700 transition-colors bg-gray-100 rounded-lg px-7 hover:bg-gray-200 hover:text-gray-800 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z"
                    fill="#EB4335"
                  />
                </svg>
                Sign in with Google
              </button>
              <button className="inline-flex items-center justify-center gap-3 py-3 text-sm font-normal text-gray-700 transition-colors bg-gray-100 rounded-lg px-7 hover:bg-gray-200 hover:text-gray-800 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10">
                <svg
                  width="21"
                  className="fill-current"
                  height="20"
                  viewBox="0 0 21 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M15.6705 1.875H18.4272L12.4047 8.75833L19.4897 18.125H13.9422L9.59717 12.4442L4.62554 18.125H1.86721L8.30887 10.7625L1.51221 1.875H7.20054L11.128 7.0675L15.6705 1.875ZM14.703 16.475H16.2305L6.37054 3.43833H4.73137L14.703 16.475Z" />
                </svg>
                Sign in with X
              </button>
            </div> */}
            {/* <div className="relative py-3 sm:py-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="p-2 text-gray-400 bg-white dark:bg-gray-900 sm:px-5 sm:py-2">
                  Or
                </span>
              </div>
            </div> */}
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                {successMessage && (
                  <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                    {successMessage}
                  </div>
                )}
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                    {error}
                  </div>
                )}
                <div>
                  <Label>
                    Email <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="info@gmail.com"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label>
                    Password <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      disabled={isLoading}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Keep me logged in
                    </span>
                  </div>
                  {/* <Link
                    to="/reset-password"
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Forgot password?
                  </Link> */}
                </div>
                {turnstileSiteKey ? (
                  <div className="flex justify-center pt-1 pb-2">
                    {!turnstileScriptReady ? (
                      <TurnstilePlaceholder />
                    ) : (
                      <Suspense fallback={<TurnstilePlaceholder />}>
                        <LazyTurnstile
                          ref={turnstileRef}
                          siteKey={turnstileSiteKey}
                          injectScript={false}
                          onSuccess={handleTurnstileSuccess}
                          onExpire={handleTurnstileExpire}
                          onError={handleTurnstileError}
                          options={{
                            theme: theme,
                            size: "normal",
                            action: "login",
                            language: "id",
                          }}
                        />
                      </Suspense>
                    )}
                  </div>
                ) : null}
                <div>
                  <button
                    type="submit"
                    disabled={
                      isLoading ||
                      (Boolean(turnstileSiteKey) &&
                        (!turnstileScriptReady || !turnstileToken?.trim()))
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-300 w-full px-4 py-3.5 text-sm font-semibold bg-brand-600 text-white shadow-lg shadow-brand-500/30 hover:bg-brand-500 hover:shadow-brand-500/50 hover:-translate-y-0.5 disabled:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                  >
                    {isLoading ? "Signing in..." : "Sign in"}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-8 lg:hidden">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400">
                Don't have an account? {" "}
                <Link
                  to="/signup"
                  className="font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400 transition-colors"
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

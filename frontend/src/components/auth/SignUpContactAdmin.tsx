import { Link } from "react-router";
import { useSettings } from "../../context/SettingsContext";
import AppLogo from "../common/AppLogo";

const ADMIN_WA_NUMBER = import.meta.env.VITE_ADMIN_WHATSAPP || "6281128510072";
// const ADMIN_WA_DISPLAY = import.meta.env.VITE_ADMIN_WHATSAPP_DISPLAY || "+62 812-3456-7890";
const DEFAULT_MESSAGE =
  "Halo Admin, saya ingin melakukan registrasi akun baru di aplikasi. Mohon panduannya ya. Terima kasih.";

const toWaLink = (phoneNumber: string, message: string) =>
  `https://wa.me/${phoneNumber.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;

export default function SignUpContactAdmin() {
  const { settings, isLoading: isSettingsLoading } = useSettings();
  const waLink = toWaLink(ADMIN_WA_NUMBER, DEFAULT_MESSAGE);
  const siteName = settings?.general?.site_name;

  return (
    <div className="flex w-full flex-col justify-center">
      <div className="flex w-full flex-col items-center pb-8 pt-3 text-center lg:hidden">
        <Link to="/" className="inline-flex flex-col items-center gap-1.5">
          <AppLogo className="h-11 w-auto max-w-[180px]" />
          {isSettingsLoading ? (
            <div className="flex flex-col items-center justify-center w-full mt-1.5">
              <div className="h-4 w-32 animate-pulse rounded bg-black/[0.04] dark:bg-white/[0.04]" />
            </div>
          ) : (
            <span className="mt-1 text-sm font-semibold text-gray-800 dark:text-white/90">
              {siteName || "Nama aplikasi belum diatur"}
            </span>
          )}
        </Link>
      </div>

      <div className="mx-auto w-full max-w-md rounded-3xl border border-gray-100 bg-white p-7 shadow-xl dark:border-slate-700/40 dark:bg-slate-900/50 sm:p-10 lg:rounded-2xl lg:border-gray-200/70 lg:bg-white/70 lg:backdrop-blur-md lg:shadow-none dark:lg:border-slate-700/60 dark:lg:bg-slate-900/45">
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Pendaftaran Akun
          </h1>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            Untuk menjaga keamanan dan validitas data sistem, pendaftaran akun baru hanya dapat dilakukan secara terpusat oleh Admin.
          </p>
        </div>

        <div className="mb-8 rounded-2xl bg-gray-50 p-5 text-center dark:bg-slate-800/50">
          <p className="text-sm font-medium leading-relaxed text-gray-700 dark:text-gray-200">
            Silakan hubungi Administrator melalui WhatsApp dengan melampirkan identitas lengkap Anda.
          </p>
        </div>

        <div>
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#25D366]/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#20ba59] hover:shadow-[#25D366]/45 focus:outline-none focus:ring-4 focus:ring-[#25D366]/20"
          >
            <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
              <path d="M20.52 3.48A11.9 11.9 0 0 0 12.05 0C5.55 0 .27 5.28.27 11.79c0 2.08.54 4.11 1.56 5.9L0 24l6.5-1.7a11.73 11.73 0 0 0 5.54 1.41h.01c6.5 0 11.78-5.28 11.78-11.79a11.7 11.7 0 0 0-3.31-8.44ZM12.05 21.7h-.01a9.86 9.86 0 0 1-5.03-1.38l-.36-.21-3.86 1.01 1.03-3.76-.24-.39a9.84 9.84 0 0 1-1.5-5.18c0-5.46 4.45-9.9 9.93-9.9 2.65 0 5.14 1.03 7 2.89a9.8 9.8 0 0 1 2.9 7.01c0 5.47-4.46 9.91-9.92 9.91Zm5.45-7.44c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.69.15-.2.3-.79.98-.97 1.18-.18.2-.36.23-.66.08-.3-.15-1.28-.47-2.43-1.5a9.1 9.1 0 0 1-1.68-2.08c-.18-.3-.02-.46.14-.61.13-.13.3-.33.46-.5.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.69-1.66-.94-2.27-.25-.59-.5-.5-.69-.5h-.58c-.2 0-.53.07-.8.38-.28.3-1.05 1.02-1.05 2.48s1.08 2.86 1.23 3.06c.15.2 2.12 3.24 5.14 4.54.72.3 1.29.49 1.73.62.73.23 1.4.2 1.93.12.6-.09 1.78-.73 2.03-1.44.25-.7.25-1.3.18-1.44-.07-.12-.28-.2-.58-.35Z" />
            </svg>
            Hubungi Admin
          </a>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sudah punya akun?{" "}
            <Link
              to="/signin"
              className="font-semibold text-brand-600 transition-colors hover:text-brand-500 dark:text-brand-400"
            >
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router";
import { getJakartaHour } from "../../utils/dateTime";
import {
  UserIcon,
  SettingsIcon,
  ArrowRightIcon,
  LockIcon,
  GroupIcon,
} from "../../icons";
import { dashboardAPI, DashboardSummaryData } from "../../utils/api";

export default function Home() {
  const { user, hasPermission } = useAuth();
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const greeting = (() => {
    const h = getJakartaHour();
    if (h < 12) return "Selamat Pagi";
    if (h < 17) return "Selamat Siang";
    return "Selamat Malam";
  })();

  const firstName = user?.firstname || user?.username || "Admin";

  const fetchSummary = async () => {
    try {
      const res = await dashboardAPI.getSummary();
      if (res.success && res.data) {
        setSummary(res.data);
        setError(null);
      } else {
        setError(res.message || "Gagal memuat data dashboard");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchSummary();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const counts = summary?.counts ?? { users: 0, roles: 0, units: 0 };

  const quickLinks = [
    {
      name: "Users",
      path: "/users",
      description: "Kelola akun pengguna",
      icon: <UserIcon className="w-6 h-6" />,
      permission: "view_user",
    },
    {
      name: "Roles",
      path: "/roles",
      description: "Atur peran dan permission",
      icon: <LockIcon className="w-6 h-6" />,
      permission: "view_role",
    },
    {
      name: "Units",
      path: "/units",
      description: "Kelola unit organisasi",
      icon: <GroupIcon className="w-6 h-6" />,
      permission: "view_unit",
    },
    {
      name: "Settings",
      path: "/settings",
      description: "Konfigurasi situs",
      icon: <SettingsIcon className="w-6 h-6" />,
      permission: "view_setting",
    },
  ].filter((link) => hasPermission(link.permission));

  return (
    <>
      <PageMeta
        title="Dashboard"
        description="Ringkasan aplikasi admin"
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Selamat datang di panel admin.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-800 dark:bg-error-900/20 dark:text-error-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Users</p>
            <p className="mt-2 text-3xl font-semibold text-gray-800 dark:text-white/90">
              {loading ? "—" : counts.users}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Roles</p>
            <p className="mt-2 text-3xl font-semibold text-gray-800 dark:text-white/90">
              {loading ? "—" : counts.roles}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Units</p>
            <p className="mt-2 text-3xl font-semibold text-gray-800 dark:text-white/90">
              {loading ? "—" : counts.units}
            </p>
          </div>
        </div>

        {quickLinks.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">
              Pintasan
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {quickLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="group flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-800"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                    {link.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-800 dark:text-white/90">
                        {link.name}
                      </p>
                      <ArrowRightIcon className="h-4 w-4 text-gray-400 transition group-hover:text-brand-500" />
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {link.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

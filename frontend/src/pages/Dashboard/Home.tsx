import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router";
import { formatDateTime, getJakartaHour } from "../../utils/dateTime";
import {
  UserIcon,
  SettingsIcon,
  ArrowRightIcon,
  BoxIcon,
  DollarLineIcon,
  TaskIcon,
  ListIcon,
  PlusIcon,
  InfoIcon,
  AlertIcon,
  HistoryIcon,
  PieChartIcon
} from "../../icons";
import { dashboardAPI, DashboardSummaryData } from "../../utils/api";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

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
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memuat data");
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const prCounts = summary?.counts.purchaseRequisitions || {
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  const poCounts = summary?.counts.purchaseOrders || {
    total: 0,
    delivery: {},
    payment: {},
  };

  // Chart configuration for PR status breakdown
  const prChartOptions: ApexOptions = {
    chart: {
      type: "donut",
      fontFamily: "Outfit, sans-serif",
    },
    labels: ["Draft", "Pending", "Approved", "Rejected"],
    colors: ["#9cb9ff", "#fdb022", "#12b76a", "#f04438"],
    legend: {
      position: "bottom",
      fontFamily: "Outfit",
      labels: {
        colors: "currentColor",
      },
    },
    dataLabels: {
      enabled: false,
    },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total PR",
              fontSize: "16px",
              fontFamily: "Outfit",
              fontWeight: 600,
              color: "currentColor",
              formatter: () => String(prCounts.total),
            },
          },
        },
      },
    },
    stroke: {
      colors: ["transparent"],
    },
    tooltip: {
      fillSeriesColor: false,
    },
  };

  const prChartSeries = [
    prCounts.draft || 0,
    prCounts.pending || 0,
    prCounts.approved || 0,
    prCounts.rejected || 0,
  ];

  return (
    <>
      <PageMeta
        title="Dashboard - Purchasing Go"
        description="Dashboard utama Sistem Manajemen Pengadaan Barang"
      />

      <div className="space-y-6 p-4 text-gray-900 dark:text-white sm:p-6 max-w-7xl mx-auto">
        {/* Top greeting and status banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {greeting}, {firstName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Selamat datang di portal manajemen pengadaan barang perusahaan Anda.
            </p>
          </div>

        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-error-50 text-error-700 dark:bg-error-950/20 dark:text-error-400 border border-error-200 dark:border-error-900/30 flex items-center gap-3">
            <AlertIcon className="w-5 h-5 flex-shrink-0 text-error-600" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        {/* Dynamic Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-850 p-6 sm:p-8 text-white shadow-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-64 h-64 rounded-full bg-teal-400/10 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                E-Procurement
              </span>
              <h2 className="text-3xl font-black mt-4 leading-tight">
                Purchasing Go
              </h2>
              <p className="mt-2 text-sm text-brand-100 max-w-xl opacity-90 leading-relaxed">
                Kelola seluruh alur pengadaan barang mulai dari pengajuan Permintaan Pembelian (PR), penerbitan Purchase Order (PO), hingga pencatatan stok gudang secara otomatis dan transparan.
              </p>
            </div>
            {hasPermission("create_purchase_requisition") && (
              <div className="mt-6">
                <Link
                  to="/purchase-requisitions/create"
                  className="inline-flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 transition-colors px-5 py-2.5 rounded-2xl text-sm font-bold shadow-md"
                >
                  <PlusIcon className="w-4 h-4" />
                  Buat Permintaan Baru
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Statistics Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Requisitions */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Permintaan (PR)
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                <TaskIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold tracking-tight">
                {loading ? "..." : prCounts.total}
              </span>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Total Permintaan Diajukan</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t border-gray-100 dark:border-gray-800 pt-3">
              <div>
                <span className="text-gray-400">Draft:</span>{" "}
                <span className="font-bold text-gray-600 dark:text-gray-300">
                  {loading ? "-" : prCounts.draft}
                </span>
              </div>
              <div>
                <span className="text-warning-600">Pending:</span>{" "}
                <span className="font-bold text-warning-700 dark:text-warning-400">
                  {loading ? "-" : prCounts.pending}
                </span>
              </div>
              <div>
                <span className="text-success-600">Approved:</span>{" "}
                <span className="font-bold text-success-700 dark:text-success-400">
                  {loading ? "-" : prCounts.approved}
                </span>
              </div>
              <div>
                <span className="text-error-600">Rejected:</span>{" "}
                <span className="font-bold text-error-700 dark:text-error-400">
                  {loading ? "-" : prCounts.rejected}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Purchase Orders */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Pesanan (PO)
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
                <DollarLineIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold tracking-tight">
                {loading ? "..." : poCounts.total}
              </span>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Total Purchase Order Terbit</p>
            </div>
            <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-3">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Pengiriman Diterima:</span>
                <span className="font-bold text-success-600 dark:text-success-400">
                  {loading ? "-" : poCounts.delivery["Diterima"] || 0}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Masih Diproses:</span>
                <span className="font-bold text-warning-600">
                  {loading ? "-" : poCounts.delivery["Diproses"] || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Products & Vendors */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Produk & Vendor
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400">
                <BoxIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold tracking-tight">
                {loading ? "..." : summary?.counts.products}
              </span>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Item Produk Terdaftar</p>
            </div>
            <div className="mt-4 flex justify-between items-center text-xs border-t border-gray-100 dark:border-gray-800 pt-3">
              <span className="text-gray-500 dark:text-gray-400">Total Vendor Aktif:</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {loading ? "-" : summary?.counts.vendors}
              </span>
            </div>
          </div>

          {/* Card 4: Low Stock Alert */}
          <div className={`rounded-3xl border p-6 shadow-sm transition-all hover:shadow-md ${
            !loading && summary && summary.counts.lowStockAlerts > 0
              ? "border-orange-200 bg-orange-25/50 dark:border-orange-900/30 dark:bg-orange-950/10"
              : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Peringatan Stok
              </span>
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                !loading && summary && summary.counts.lowStockAlerts > 0
                  ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              }`}>
                <AlertIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className={`text-3xl font-extrabold tracking-tight ${
                !loading && summary && summary.counts.lowStockAlerts > 0 ? "text-orange-600 dark:text-orange-400" : ""
              }`}>
                {loading ? "..." : summary?.counts.lowStockAlerts}
              </span>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Stok di bawah minimum produk</p>
            </div>
            <div className="mt-4 flex justify-between items-center text-xs border-t border-gray-100 dark:border-gray-800 pt-3">
              <span className="text-gray-500 dark:text-gray-400">Kategori Produk:</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {loading ? "-" : summary?.counts.categories}
              </span>
            </div>
          </div>
        </div>

        {/* Charts & Actions Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* PR Status Chart */}
          <div className="lg:col-span-2 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-brand-500" />
                Status Permintaan Pengadaan (PR)
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Visualisasi persentase status dari seluruh pengajuan Permintaan Pembelian yang masuk.
              </p>
            </div>
            <div className="mt-4 flex justify-center items-center h-64">
              {loading ? (
                <div className="text-sm text-gray-400">Memuat data grafik...</div>
              ) : prCounts.total === 0 ? (
                <div className="text-center text-sm text-gray-500 py-10 dark:text-gray-400">
                  Tidak ada data PR yang tersedia untuk digambarkan.
                </div>
              ) : (
                <div className="w-full max-w-sm">
                  <Chart
                    options={prChartOptions}
                    series={prChartSeries}
                    type="donut"
                    height={260}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <SettingsIcon className="w-5 h-5 text-brand-500" />
              Tautan Cepat Navigasi
            </h3>
            <div className="flex flex-col gap-2">
              {hasPermission("create_purchase_requisition") && (
                <Link
                  to="/purchase-requisitions/create"
                  className="group flex items-center justify-between p-3 rounded-2xl bg-gray-200/50 hover:bg-brand-50 dark:bg-gray-800/40 dark:hover:bg-brand-900/20 border border-transparent hover:border-brand-200 dark:hover:border-brand-800/55 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
                      <PlusIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">Buat PR Baru</h4>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Ajukan permintaan pembelian</p>
                    </div>
                  </div>
                  <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
                </Link>
              )}

              {hasPermission("view_stock") && (
                <Link
                  to="/inventory"
                  className="group flex items-center justify-between p-3 rounded-2xl bg-gray-200/50 hover:bg-brand-50 dark:bg-gray-800/40 dark:hover:bg-brand-900/20 border border-transparent hover:border-brand-200 dark:hover:border-brand-800/55 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500 text-white shadow-sm">
                      <BoxIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">Stok & Gudang</h4>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Pemakaian & penyesuaian stok</p>
                    </div>
                  </div>
                  <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
                </Link>
              )}

              {hasPermission("view_product") && (
                <Link
                  to="/products"
                  className="group flex items-center justify-between p-3 rounded-2xl bg-gray-200/50 hover:bg-brand-50 dark:bg-gray-800/40 dark:hover:bg-brand-900/20 border border-transparent hover:border-brand-200 dark:hover:border-brand-800/55 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500 text-white shadow-sm">
                      <ListIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">Katalog Produk</h4>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Kelola master data barang</p>
                    </div>
                  </div>
                  <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
                </Link>
              )}

              {hasPermission("view_user") && (
                <Link
                  to="/users"
                  className="group flex items-center justify-between p-3 rounded-2xl bg-gray-200/50 hover:bg-brand-50 dark:bg-gray-800/40 dark:hover:bg-brand-900/20 border border-transparent hover:border-brand-200 dark:hover:border-brand-800/55 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-sm">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">Kelola Pengguna</h4>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Atur akses admin & karyawan</p>
                    </div>
                  </div>
                  <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Recent Requisitions Table */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 text-brand-500" />
              Permintaan Pengadaan (PR) Terkini
            </h3>
            <Link
              to="/purchase-requisitions"
              className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1"
            >
              Lihat Semua PR
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">No. PR</th>
                  <th className="py-3 px-4">Unit Kerja</th>
                  <th className="py-3 px-4">Dibuat Oleh</th>
                  <th className="py-3 px-4">Tanggal Pengajuan</th>
                  <th className="py-3 px-4 text-right">Total Estimasi</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      Memuat data aktivitas...
                    </td>
                  </tr>
                ) : !summary || summary.recentRequisitions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                      Belum ada permintaan pengadaan yang dibuat.
                    </td>
                  </tr>
                ) : (
                  summary.recentRequisitions.map((pr) => {
                    let badgeClass = "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
                    let badgeText = "Draft";

                    const statusClean = String(pr.approval_status).toLowerCase();
                    if (statusClean === "draft") {
                      badgeClass = "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
                      badgeText = "Draft";
                    } else if (statusClean === "pending" || statusClean.startsWith("pending_")) {
                      badgeClass = "bg-warning-50 text-warning-700 dark:bg-warning-950/20 dark:text-warning-400";
                      badgeText = "Pending";
                    } else if (statusClean === "approved") {
                      badgeClass = "bg-success-50 text-success-700 dark:bg-success-950/20 dark:text-success-400";
                      badgeText = "Disetujui";
                    } else if (statusClean === "rejected") {
                      badgeClass = "bg-error-50 text-error-700 dark:bg-error-950/20 dark:text-error-400";
                      badgeText = "Ditolak";
                    }

                    return (
                      <tr
                        key={pr.id}
                        className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-semibold text-brand-600 dark:text-brand-400 group-hover:underline">
                          <Link to={`/purchase-requisitions/${pr.id}`}>{pr.pr_number}</Link>
                        </td>
                        <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300">{pr.unit_name || "-"}</td>
                        <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400">{pr.created_by_name}</td>
                        <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400">{formatDateTime(pr.created_at)}</td>
                        <td className="py-3.5 px-4 text-right font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(pr.total_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badgeClass}`}>
                            {badgeText}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Step-by-step onboarding guide */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <InfoIcon className="w-5 h-5 text-brand-500" />
            Alur Kerja Dasar Purchasing Go
          </h2>
          <div className="grid gap-6 md:grid-cols-3 text-sm">
            <div className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-sm font-bold text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                1
              </span>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">Pengajuan Permintaan</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Karyawan unit mengajukan Permintaan Pembelian (PR) dengan menentukan produk, jumlah, dan vendor tujuan.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-sm font-bold text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                2
              </span>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">Persetujuan & Pemesanan</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Pihak manajemen menyetujui pengajuan, dan sistem akan menerbitkan Purchase Order (PO) otomatis untuk dikirim ke vendor.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-sm font-bold text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                3
              </span>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">Penerimaan & Inventori</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Barang diterima dari vendor, dicatat di menu gudang, dan stok produk akan diperbarui secara otomatis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

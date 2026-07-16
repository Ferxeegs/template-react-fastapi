import React from "react";
import { Link } from "react-router";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";
import { useSettings } from "../../context/SettingsContext";
import FaviconUpdater from "../../components/common/FaviconUpdater";
import AppLogo from "../../components/common/AppLogo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { settings, isLoading: isSettingsLoading } = useSettings();

  return (
    <div className="relative flex min-h-screen bg-gray-50 dark:bg-gray-950 font-outfit overflow-hidden">
      <FaviconUpdater />
      
      {/* Left Column: Auth Form */}
      <div className="relative z-10 flex flex-col justify-center w-full lg:w-1/2 p-6 sm:p-12 xl:p-24 bg-white dark:bg-gray-900 shadow-[20px_0_40px_rgba(0,0,0,0.05)] dark:shadow-[20px_0_40px_rgba(0,0,0,0.5)]">
        <div className="w-full max-w-md mx-auto">
          {children}
        </div>
        <div className="absolute bottom-6 right-6 lg:right-auto lg:left-6">
          <ThemeTogglerTwo />
        </div>
      </div>

      {/* Right Column: Premium Branding */}
      <div className="relative hidden w-1/2 lg:flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 overflow-hidden">
        {/* Dynamic Abstract Shapes */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-[15%] -right-[10%] w-[60%] h-[60%] rounded-full bg-brand-500/20 blur-[100px] animate-pulse" style={{ animationDuration: '4s' }}></div>
          <div className="absolute top-[60%] -left-[10%] w-[50%] h-[50%] rounded-full bg-cyan-400/20 blur-[120px]"></div>
          <div className="absolute top-[30%] right-[20%] w-[40%] h-[40%] rounded-full bg-blue-300/10 blur-[80px] animate-pulse" style={{ animationDuration: '6s' }}></div>
          
          {/* subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center max-w-xl px-10 text-center text-white">
          {/* Logo Container with Glassmorphism */}
          <div className="mb-10 p-8 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition-transform duration-500 hover:scale-105 hover:bg-white/10">
            <Link to="/" className="block">
              <AppLogo className="h-16 w-auto drop-shadow-xl" />
            </Link>
          </div>
          
          {isSettingsLoading ? (
            <div className="flex flex-col gap-4 w-full items-center mt-4">
              <div className="h-8 w-3/4 animate-pulse rounded-lg bg-white/20" />
              <div className="h-5 w-5/6 animate-pulse rounded-lg bg-white/10" />
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
                {settings?.general?.site_name || "App Template"}
              </h2>
              <p className="text-lg text-blue-100/90 font-medium leading-relaxed max-w-md mx-auto">
                {settings?.general?.site_tagline || 
                 "Sistem Manajemen Pengadaan Barang Terpadu — dari permintaan hingga penerimaan."}
              </p>
            </div>
          )}

          {/* Feature Badges */}
          <div className="mt-14 grid grid-cols-2 gap-5 w-full">
            <div className="p-5 bg-gradient-to-b from-white/10 to-white/5 rounded-2xl border border-white/10 backdrop-blur-md shadow-lg flex flex-col items-center group hover:from-white/15 hover:to-white/10 transition-all duration-300">
              <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-cyan-400/20 text-cyan-300 group-hover:scale-110 group-hover:bg-cyan-400/30 transition-all duration-300">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold tracking-wide text-white/90">Pengadaan Terstruktur</h3>
              <p className="text-xs text-white/60 mt-1">Kelola permintaan & PO</p>
            </div>
            
            <div className="p-5 bg-gradient-to-b from-white/10 to-white/5 rounded-2xl border border-white/10 backdrop-blur-md shadow-lg flex flex-col items-center group hover:from-white/15 hover:to-white/10 transition-all duration-300">
              <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-blue-400/20 text-blue-300 group-hover:scale-110 group-hover:bg-blue-400/30 transition-all duration-300">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold tracking-wide text-white/90">Data Terlindungi</h3>
              <p className="text-xs text-white/60 mt-1">Audit trail lengkap</p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

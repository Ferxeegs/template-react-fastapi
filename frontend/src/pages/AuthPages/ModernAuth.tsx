import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";
import { useSettings } from "../../context/SettingsContext";
import FaviconUpdater from "../../components/common/FaviconUpdater";
import SignInForm from "../../components/auth/SignInForm";
// import SignUpForm from "../../components/auth/SignUpForm";
import PageMeta from "../../components/common/PageMeta";
import SignUpContactAdmin from "../../components/auth/SignUpContactAdmin";
import AppLogo from "../../components/common/AppLogo";

export default function ModernAuth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, isLoading: isSettingsLoading } = useSettings();

  const [isSignUp, setIsSignUp] = useState(location.pathname === "/signup");

  useEffect(() => {
    setIsSignUp(location.pathname === "/signup");
  }, [location.pathname]);

  return (
    <div className="relative flex flex-col justify-center items-center w-full min-h-screen overflow-hidden transition-colors duration-500 p-4 sm:p-6 lg:p-8
      bg-gradient-to-br from-slate-50 via-cyan-50/80 to-blue-100/70
      dark:from-[#020617] dark:via-[#06152a] dark:to-[#082f49]">
      <FaviconUpdater />
      <PageMeta
        title={isSignUp ? "Sign Up" : "Sign In"}
        description={isSignUp ? "Daftar ke sistem" : "Masuk ke sistem"}
      />

      <div className="fixed z-50 bottom-6 right-6">
        <ThemeTogglerTwo />
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* ── LIGHT MODE BACKGROUND ── */}
      {/* ═══════════════════════════════════════════ */}
      {/* Primary cyan orb — top-left */}
      <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] max-w-[1000px] max-h-[1000px] rounded-full pointer-events-none
        bg-[radial-gradient(circle,_rgba(6,182,212,0.25)_0%,_rgba(14,165,233,0.1)_40%,_transparent_70%)]
        blur-[60px] dark:hidden" />
      {/* Secondary soft-blue — bottom-right */}
      <div className="absolute -bottom-[10%] -right-[5%] w-[50vw] h-[50vw] max-w-[900px] max-h-[900px] rounded-full pointer-events-none
        bg-[radial-gradient(circle,_rgba(56,189,248,0.2)_0%,_rgba(14,165,233,0.08)_45%,_transparent_70%)]
        blur-[70px] dark:hidden" />

      {/* ═══════════════════════════════════════════ */}
      {/* ── DARK MODE BACKGROUND ── */}
      {/* ═══════════════════════════════════════════ */}
      {/* Decorative background shapes */}
      <div className="absolute -top-[10%] -left-[10%] w-[80vw] h-[80vw] max-w-[1300px] max-h-[1300px] rounded-full pointer-events-none
        bg-[radial-gradient(circle,_rgba(14,165,233,0.4)_0%,_rgba(2,132,199,0.2)_30%,_rgba(8,145,178,0.08)_55%,_transparent_75%)]
        blur-[80px] hidden dark:block" />
      {/* 2. Cyan wash — bottom-right */}
      <div className="absolute -bottom-[10%] -right-[10%] w-[70vw] h-[70vw] max-w-[1200px] max-h-[1200px] rounded-full pointer-events-none
        bg-[radial-gradient(circle,_rgba(6,182,212,0.3)_0%,_rgba(8,145,178,0.15)_35%,_transparent_70%)]
        blur-[90px] hidden dark:block" />
      {/* 3. Teal accent streak — center-right */}
      <div className="absolute top-[20%] -right-[5%] w-[50vw] h-[40vw] max-w-[800px] max-h-[600px] rounded-full pointer-events-none
        bg-[radial-gradient(ellipse,_rgba(45,212,191,0.25)_0%,_rgba(20,184,166,0.1)_40%,_transparent_65%)]
        blur-[70px] rotate-[-10deg] hidden dark:block" />
      {/* 4. Subtle blue accent — bottom-left */}
      <div className="absolute bottom-[10%] left-[5%] w-[40vw] h-[35vw] max-w-[600px] max-h-[500px] rounded-full pointer-events-none
        bg-[radial-gradient(ellipse,_rgba(56,189,248,0.15)_0%,_transparent_60%)]
        blur-[60px] hidden dark:block" />

      {/* ═══════════════════════════════════════════ */}
      {/* ── SHARED TEXTURE OVERLAYS ── */}
      {/* ═══════════════════════════════════════════ */}
      {/* Fine noise grain */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '150px 150px',
        }}
      />
      {/* Subtle dot grid */}
      <div className="absolute inset-0 pointer-events-none
        opacity-[0.08] dark:opacity-[0.06]"
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 0.8px, transparent 0.8px)`,
          backgroundSize: '32px 32px',
          color: '#0ea5e9',
        }}
      />

      {/* Accent shapes */}
      <div className="absolute top-[10%] left-[8%] w-40 h-40 rounded-full pointer-events-none hidden xl:block
        border-[3px] border-cyan-500/[0.1] dark:border-cyan-400/[0.15]
        animate-[float_18s_ease-in-out_infinite]" />
      <div className="absolute bottom-[15%] right-[10%] w-48 h-48 rounded-[2rem] rotate-12 pointer-events-none hidden xl:block
        border-2 border-blue-400/[0.08] dark:border-blue-400/[0.12]
        animate-[float-reverse_22s_ease-in-out_infinite]" />
      
      {/* Abstract accent */}
      <div className="absolute top-[65%] left-[5%] w-16 h-16 pointer-events-none hidden xl:flex items-center justify-center
        animate-[float_15s_ease-in-out_infinite_2s]">
          <div className="absolute w-2 h-12 bg-cyan-500/[0.1] dark:bg-cyan-400/[0.15] rounded-full" />
          <div className="absolute w-12 h-2 bg-cyan-500/[0.1] dark:bg-cyan-400/[0.15] rounded-full" />
      </div>

      {/* Micro glow particles */}
      <div className="absolute top-[25%] left-[32%] w-2 h-2 rounded-full pointer-events-none
        bg-cyan-400 blur-[3px] opacity-40 dark:opacity-60
        animate-[pulse_4s_ease-in-out_infinite]" />
      <div className="absolute bottom-[30%] right-[28%] w-2 h-2 rounded-full pointer-events-none
        bg-blue-400 blur-[2px] opacity-30 dark:opacity-50
        animate-[pulse_5s_ease-in-out_infinite_1.5s]" />

      {/* Keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(5deg); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0) scale(1) rotate(12deg); }
          50% { transform: translateY(-35px) scale(1.03) rotate(8deg); }
        }
      `}</style>

      {/* ═══════════════════════════════════════════ */}
      {/* ── MAIN CARD ── */}
      {/* ═══════════════════════════════════════════ */}
      <div className="relative w-full max-w-5xl h-[720px] lg:h-[660px]
        overflow-hidden flex flex-col lg:flex-row
        rounded-[2rem]
        bg-white/75 dark:bg-slate-900/70
        backdrop-blur-2xl backdrop-saturate-150
        shadow-[0_4px_32px_-8px_rgba(70,95,255,0.12),0_24px_64px_-16px_rgba(15,23,42,0.1)]
        dark:shadow-[0_4px_40px_-8px_rgba(59,130,246,0.2),0_24px_80px_-16px_rgba(0,0,0,0.6)]
        border border-white/70 dark:border-slate-700/50
        ring-1 ring-black/[0.04] dark:ring-white/[0.06]">

        {/* === MOBILE/TABLET VIEW === */}
        <div className="lg:hidden w-full h-full relative overflow-y-auto no-scrollbar">
          <div className={`absolute top-0 left-0 w-full p-6 sm:p-8 transition-all duration-500 ${isSignUp ? 'opacity-0 invisible scale-95 pointer-events-none' : 'opacity-100 visible scale-100 delay-200'}`}>
            <SignInForm />
          </div>
          <div className={`absolute top-0 left-0 w-full p-6 sm:p-8 transition-all duration-500 ${!isSignUp ? 'opacity-0 invisible scale-95 pointer-events-none' : 'opacity-100 visible scale-100 delay-200'}`}>
            <SignUpContactAdmin />
          </div>
        </div>

        {/* === DESKTOP VIEW === */}
        <div className="hidden lg:flex absolute inset-0 w-full h-full z-10 pointer-events-none">
          <div className={`w-1/2 h-full flex items-center justify-center p-12 transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${isSignUp ? 'opacity-0 -translate-x-16 pointer-events-none' : 'opacity-100 translate-x-0 delay-200 pointer-events-auto'}`}>
            <div className="w-full max-w-sm"><SignInForm /></div>
          </div>
          <div className={`w-1/2 h-full flex items-center justify-center p-12 transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${!isSignUp ? 'opacity-0 translate-x-16 pointer-events-none' : 'opacity-100 translate-x-0 delay-200 pointer-events-auto'}`}>
            <div className="w-full max-w-sm"><SignUpContactAdmin /></div>
          </div>
        </div>

        <div
          className={`hidden lg:flex absolute top-0 w-1/2 h-full z-20 flex-col items-center justify-center p-12 transition-all duration-1000 ease-[cubic-bezier(0.65,0.05,0.15,1)] overflow-hidden
            bg-gradient-to-br from-brand-500 via-cyan-600 to-blue-800
            shadow-[4px_0_40px_-4px_rgba(0,0,0,0.3)] dark:shadow-[4px_0_60px_-4px_rgba(0,0,0,0.7)]
            ${isSignUp
              ? 'translate-x-0 rounded-none rounded-l-3xl rounded-r-[150px]'
              : 'translate-x-full rounded-none rounded-r-3xl rounded-l-[150px]'}
          `}
        >
          {/* Panel inner glow effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-72 h-72 rounded-full
              bg-[radial-gradient(ellipse_at_top_left,_rgba(255,255,255,0.1)_0%,_transparent_60%)]
              blur-[40px]" />
            <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full
              bg-[radial-gradient(ellipse_at_bottom_right,_rgba(99,102,241,0.2)_0%,_transparent_60%)]
              blur-[50px]" />
            <div className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full
              bg-[radial-gradient(ellipse_at_center,_rgba(125,211,252,0.08)_0%,_transparent_70%)]
              blur-[30px] -translate-x-1/2 -translate-y-1/2" />
          </div>

          {/* Decorative rings */}
          <div className="absolute top-[-20%] left-[-20%] w-64 h-64 border-[1.5px] border-white/[0.08] rounded-full pointer-events-none" />
          <div className="absolute top-[-18%] left-[-18%] w-72 h-72 border border-white/[0.04] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-20%] w-80 h-80 border-[1.5px] border-white/[0.08] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-18%] right-[-18%] w-96 h-96 border border-white/[0.04] rounded-full pointer-events-none" />

          {/* Panel Content */}
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Sign Up content */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center text-center transition-all duration-700 ease-in-out
               ${isSignUp ? 'opacity-100 translate-x-0 delay-300 pointer-events-auto' : 'opacity-0 translate-x-16 pointer-events-none'}
             `}>
              <AppLogo dark={true} className="h-12 w-auto mb-10 brightness-0 invert drop-shadow-[0_0_20px_rgba(255,255,255,0.25)] hover:scale-105 transition-transform duration-300" />
              <h2 className="text-4xl font-extrabold text-white mb-6 tracking-tight drop-shadow-sm flex justify-center text-center">
                {isSettingsLoading ? (
                  <span className="block h-10 w-64 bg-white/20 animate-pulse rounded-lg" />
                ) : (
                  settings?.general?.site_name || "App Template"
                )}
              </h2>
              <div
                className="text-blue-100/90 text-lg mb-10 max-w-sm font-light leading-relaxed flex flex-col items-center gap-2"
                role={isSettingsLoading ? "status" : undefined}
                aria-busy={isSettingsLoading || undefined}
              >
                {isSettingsLoading ? (
                  <>
                    <span className="block h-5 w-full max-w-[280px] bg-white/20 animate-pulse rounded-md" />
                    <span className="block h-5 w-4/5 max-w-[224px] bg-white/20 animate-pulse rounded-md" />
                  </>
                ) : (
                  settings?.general?.site_tagline || "Silakan masuk dengan kredensial Anda untuk mengakses aplikasi."
                )}
              </div>
              <button
                onClick={() => navigate('/signin')}
                className="rounded-xl border-2 border-white/90 bg-transparent px-8 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-white hover:text-brand-600 focus:outline-none focus:ring-4 focus:ring-white/30"
              >
                Masuk
              </button>
            </div>

            {/* Sign In content (shown when isSignUp is false, meaning user is on SignIn page, so overlay shows Sign Up promo) */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center text-center transition-all duration-700 ease-in-out
               ${!isSignUp ? 'opacity-100 translate-x-0 delay-300 pointer-events-auto' : 'opacity-0 -translate-x-16 pointer-events-none'}
             `}>
              <AppLogo dark={true} className="h-12 w-auto mb-10 brightness-0 invert drop-shadow-[0_0_20px_rgba(255,255,255,0.25)] hover:scale-105 transition-transform duration-300" />
              <h2 className="text-4xl font-extrabold text-white mb-6 tracking-tight drop-shadow-sm flex justify-center text-center">
                {isSettingsLoading ? (
                  <span className="block h-10 w-64 bg-white/20 animate-pulse rounded-lg" />
                ) : (
                  settings?.general?.site_name || "Portal Pengadaan"
                )}
              </h2>
              <div
                className="text-blue-100/90 text-lg mb-10 max-w-sm font-light leading-relaxed flex flex-col items-center gap-2"
                role={isSettingsLoading ? "status" : undefined}
                aria-busy={isSettingsLoading || undefined}
              >
                {isSettingsLoading ? (
                  <>
                    <span className="block h-5 w-full max-w-[280px] bg-white/20 animate-pulse rounded-md" />
                    <span className="block h-5 w-4/5 max-w-[224px] bg-white/20 animate-pulse rounded-md" />
                  </>
                ) : (
                  settings?.general?.site_tagline || "Daftar untuk mendapatkan akses ke aplikasi."
                )}
              </div>
              <button
                onClick={() => navigate('/signup')}
                className="rounded-xl border-2 border-white/90 bg-transparent px-8 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-white hover:text-brand-600 focus:outline-none focus:ring-4 focus:ring-white/30"
              >
                Daftar
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
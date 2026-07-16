import { useEffect } from "react";
import GridShape from "../../components/common/GridShape";

export default function Forbidden() {
  // Hide body overflow when component mounts
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden bg-white dark:bg-gray-900"
      style={{ zIndex: 99999 }}
    >
      <GridShape />
      <div className="relative z-10 mx-auto w-full max-w-[242px] text-center sm:max-w-[472px]">
        <h1 className="mb-8 font-bold text-gray-800 text-title-md dark:text-white/90 xl:text-title-2xl">
          FORBIDDEN
        </h1>

        <div className="flex items-center justify-center mb-8">
          <svg
            className="w-32 h-32 text-red-500 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <p className="mt-10 text-base text-gray-700 dark:text-gray-400 sm:text-lg">
          Akses ditolak. Role ini tidak dapat mengakses admin panel.
        </p>
      </div>
    </div>
  );
}


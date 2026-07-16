import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
// import { useSettings } from "../context/SettingsContext";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
// import NotificationDropdown from "../components/header/NotificationDropdown";
import UserDropdown from "../components/header/UserDropdown";
import AppLogo from "../components/common/AppLogo";

interface SearchCommand {
  name: string;
  path: string;
  keywords: string[];
  category: string;
  requiredPermission?: string | string[];
}

const searchCommands: SearchCommand[] = [
  {
    name: "Beranda",
    path: "/",
    keywords: ["dashboard", "home", "beranda"],
    category: "Navigasi",
  },
  {
    name: "Permintaan (PR)",
    path: "/purchase-requisitions",
    keywords: ["pr", "purchase requisition", "permintaan", "pengajuan"],
    category: "Transaksi",
    requiredPermission: "view_purchase_requisition",
  },
  {
    name: "Buat Permintaan (PR)",
    path: "/purchase-requisitions/create",
    keywords: ["buat pr", "create pr", "tambah pr", "permintaan baru"],
    category: "Transaksi",
    requiredPermission: "create_purchase_requisition",
  },
  {
    name: "Purchase Order (PO)",
    path: "/purchase-orders",
    keywords: ["po", "purchase order", "pesanan"],
    category: "Transaksi",
    requiredPermission: "view_purchase_order",
  },
  {
    name: "Item PO",
    path: "/purchase-orders/items",
    keywords: ["item po", "purchase order item", "rincian po", "barang po"],
    category: "Transaksi",
    requiredPermission: "view_purchase_order",
  },
  {
    name: "Laporan Harga PR vs PO",
    path: "/purchase-orders/reports/price-variance",
    keywords: ["laporan", "variance", "harga", "pr vs po", "selisih harga"],
    category: "Transaksi",
    requiredPermission: "view_po_price_variance_report",
  },
  {
    name: "Manajemen Stok",
    path: "/inventory",
    keywords: ["stok", "inventory", "gudang", "stock"],
    category: "Transaksi",
    requiredPermission: "view_stock",
  },
  {
    name: "Produk",
    path: "/products",
    keywords: ["produk", "product", "barang", "item"],
    category: "Data Master",
    requiredPermission: "view_product",
  },
  {
    name: "Kategori Produk",
    path: "/categories",
    keywords: ["kategori", "category", "kategori produk"],
    category: "Data Master",
    requiredPermission: "view_category",
  },
  {
    name: "Satuan (UOM)",
    path: "/uoms",
    keywords: ["uom", "satuan", "unit of measure"],
    category: "Data Master",
    requiredPermission: "view_uom",
  },
  {
    name: "Vendor",
    path: "/vendors",
    keywords: ["vendor", "pemasok", "supplier"],
    category: "Data Master",
    requiredPermission: "view_vendor",
  },
  {
    name: "Pengguna",
    path: "/users",
    keywords: ["users", "user", "pengguna", "akun"],
    category: "Akses",
    requiredPermission: "view_user",
  },
  {
    name: "Peran",
    path: "/roles",
    keywords: ["roles", "role", "peran", "hak akses"],
    category: "Akses",
    requiredPermission: "view_role",
  },
  {
    name: "Unit",
    path: "/units",
    keywords: ["unit", "units", "cabang", "brand", "outlet"],
    category: "Akses",
    requiredPermission: "view_unit",
  },
  {
    name: "Role Scopes",
    path: "/role-scopes",
    keywords: ["role scope", "scope", "cakupan", "akses unit"],
    category: "Akses",
    requiredPermission: "view_role_scope",
  },
  {
    name: "Pengaturan",
    path: "/settings",
    keywords: ["settings", "setting", "pengaturan", "konfigurasi", "site"],
    category: "Sistem",
    requiredPermission: "view_setting",
  },
  {
    name: "Profil Saya",
    path: "/profile",
    keywords: ["profile", "profil", "account", "akun saya"],
    category: "Navigasi",
    requiredPermission: "view_myprofile",
  },
];

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const {
    isImpersonating,
    impersonatedBy,
    user,
    hasPermission,
    stopImpersonate,
    isSessionTransitioning,
  } = useAuth();
  // const { getLogoUrl } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const inputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen((prev) => !prev);
  };

  const availableCommands = useMemo(() => {
    return searchCommands.filter((cmd) => {
      if (!cmd.requiredPermission) return true;
      return hasPermission(cmd.requiredPermission);
    });
  }, [hasPermission]);

  // Filter command berdasarkan query
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();

    return availableCommands.filter((cmd) => {
      const nameMatch = cmd.name.toLowerCase().includes(q);
      const keywordMatch = cmd.keywords.some((k) =>
        k.toLowerCase().includes(q),
      );
      return nameMatch || keywordMatch;
    });
  }, [searchQuery, availableCommands]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsSearchOpen(value.trim().length > 0);
    setSelectedIndex(0);
  };

  const handleSelectCommand = (command: SearchCommand) => {
    navigate(command.path);
    setSearchQuery("");
    setIsSearchOpen(false);
    inputRef.current?.blur();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen || filteredCommands.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleSelectCommand(filteredCommands[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setSearchQuery("");
        setIsSearchOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchResultsRef.current &&
        !searchResultsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };

    if (isSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSearchOpen]);

  // Shortcut global Cmd/Ctrl+K
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") {
          if (target !== inputRef.current) return;
        }
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        if (searchQuery.trim().length > 0) {
          setIsSearchOpen(true);
        }
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [searchQuery]);

  // Close search ketika route berubah
  useEffect(() => {
    setIsSearchOpen(false);
    setSearchQuery("");
  }, [location.pathname]);

  const handleStopImpersonateFromBanner = async () => {
    if (isSessionTransitioning) return;
    try {
      await stopImpersonate();
    } catch (e: unknown) {
      console.error(e);
    }
  };

  return (
    <header className="sticky top-0 z-[1000] flex w-full flex-col bg-white dark:bg-gray-900 lg:border-b lg:border-gray-200 dark:lg:border-gray-800">
      {isImpersonating && impersonatedBy && !isSessionTransitioning && (
        <div
          className="w-full border-b border-amber-200 bg-amber-50 dark:border-amber-800/80 dark:bg-amber-950/50"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 lg:px-6">
            <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 sm:text-sm">
                  Mode impersonate
                </p>
                <p className="truncate text-[11px] leading-snug text-amber-800/90 dark:text-amber-200/90 sm:text-xs">
                  <span className="text-amber-700/80 dark:text-amber-300/80">
                    Admin:{" "}
                  </span>
                  <span className="font-medium">{impersonatedBy.username}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStopImpersonateFromBanner}
              className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-amber-700 sm:py-1.5 sm:text-sm touch-manipulation w-full sm:w-auto"
            >
              Keluar dari impersonate
            </button>
          </div>
        </div>
      )}
      <div className="flex grow flex-col items-center justify-between lg:flex-row lg:px-6">
        <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          {/* Sidebar toggle */}
          <button
            className="items-center justify-center w-10 h-10 text-gray-500 border-gray-200 rounded-lg z-[1001] dark:border-gray-800 lg:flex dark:text-gray-400 lg:h-11 lg:w-11 lg:border touch-manipulation"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg
                width="16"
                height="12"
                viewBox="0 0 16 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>

          {/* Logo mobile */}
          <Link to="/" className="lg:hidden">
            <AppLogo className="h-8 w-[120px]" />
          </Link>

          {/* App menu (mobile) */}
          <button
            onClick={toggleApplicationMenu}
            className="flex items-center justify-center w-10 h-10 text-gray-700 rounded-lg z-[1001] hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden touch-manipulation"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.99902 10.4951C6.82745 10.4951 7.49902 11.1667 7.49902 11.9951V12.0051C7.49902 12.8335 6.82745 13.5051 5.99902 13.5051C5.1706 13.5051 4.49902 12.8335 4.49902 12.0051V11.9951C4.49902 11.1667 5.1706 10.4951 5.99902 10.4951ZM17.999 10.4951C18.8275 10.4951 19.499 11.1667 19.499 11.9951V12.0051C19.499 12.8335 18.8275 13.5051 17.999 13.5051C17.1706 13.5051 16.499 12.8335 16.499 12.0051V11.9951C16.499 11.1667 17.1706 10.4951 17.999 10.4951ZM13.499 11.9951C13.499 11.1667 12.8275 10.4951 11.999 10.4951C11.1706 10.4951 10.499 11.1667 10.499 11.9951V12.0051C10.499 12.8335 11.1706 13.5051 11.999 13.5051C12.8275 13.5051 13.499 12.8335 13.499 12.0051V11.9951Z"
                fill="currentColor"
              />
            </svg>
          </button>

          {/* Search (desktop) */}
          <div className="hidden lg:block">
            <div className="relative">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (filteredCommands[selectedIndex]) {
                    handleSelectCommand(filteredCommands[selectedIndex]);
                  }
                }}
              >
                <div className="relative">
                  <span className="absolute -translate-y-1/2 pointer-events-none left-4 top-1/2">
                    <svg
                      className="fill-gray-500 dark:fill-gray-400"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                        fill=""
                      />
                    </svg>
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Cari atau ketik perintah..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={handleInputKeyDown}
                    onFocus={() => {
                      if (searchQuery.trim().length > 0) {
                        setIsSearchOpen(true);
                      }
                    }}
                    className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      inputRef.current?.focus();
                      if (searchQuery.trim().length > 0) {
                        setIsSearchOpen(true);
                      }
                    }}
                    className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs -tracking-[0.2px] text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
                  >
                    <span> ⌘ </span>
                    <span> K </span>
                  </button>
                </div>
              </form>

              {/* Search results */}
              {isSearchOpen && filteredCommands.length > 0 && (
                <div
                  ref={searchResultsRef}
                  className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
                >
                  <div className="p-2">
                    {filteredCommands.map((command, index) => (
                      <button
                        key={`${command.path}-${index}`}
                        type="button"
                        onClick={() => handleSelectCommand(command)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          index === selectedIndex
                            ? "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{command.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {command.category}
                            </div>
                          </div>
                          <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
                            Enter
                          </kbd>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {isSearchOpen &&
                searchQuery.trim().length > 0 &&
                filteredCommands.length === 0 && (
                  <div
                    ref={searchResultsRef}
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-50 p-4"
                  >
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      Tidak ada hasil untuk &quot;{searchQuery}&quot;
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Right: impersonate, role badge, theme toggle, user menu */}
        <div
          className={`${
            isApplicationMenuOpen ? "flex" : "hidden"
          } items-center justify-between w-full gap-4 px-5 py-4 lg:flex shadow-theme-md lg:justify-end lg:px-0 lg:shadow-none`}
        >
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2 2xsm:gap-3 lg:flex-none">
            {user?.roles && user.roles.length > 0 && (
              <div className="flex min-w-0 max-w-[100px] items-center gap-1 rounded-lg border border-brand-300 bg-brand-100 px-1.5 py-1 sm:max-w-[220px] md:max-w-none dark:border-brand-800 dark:bg-brand-900/30 sm:gap-2 sm:px-3 sm:py-1.5">
                <svg
                  className="w-4 h-4 text-brand-600 dark:text-brand-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span className="text-xs font-medium text-brand-800 dark:text-brand-300 truncate">
                  {user.roles.map((role) => role.name).join(", ")}
                </span>
              </div>
            )}

            <ThemeToggleButton />
            {/* <NotificationDropdown /> */}
          </div>
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
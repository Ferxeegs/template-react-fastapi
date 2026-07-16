import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Link, useLocation } from "react-router";

import {
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  LockIcon,
  SettingsIcon,
  UserIcon,
  DocsIcon,
  BoxIcon,
  ListIcon,
  GroupIcon,
  DollarLineIcon,
  TableIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import AppLogo from "../components/common/AppLogo";
import { purchaseRequisitionAPI, purchaseOrderAPI, inventoryAPI } from "../utils/api";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { 
    name: string; 
    path: string; 
    pro?: boolean; 
    new?: boolean;
    requiredPermission?: string | string[];
  }[];
  requiredPermission?: string | string[];
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const sidebarGroups: NavGroup[] = [
  {
    title: "Menu Utama",
    items: [
      {
        icon: <GridIcon />,
        name: "Beranda",
        path: "/",
      },
    ],
  },
  {
    title: "Transaksi Pembelian",
    items: [
      {
        icon: <DocsIcon />,
        name: "Permintaan (PR)",
        path: "/purchase-requisitions",
        requiredPermission: ["view_purchase_requisition"],
      },
      {
        icon: <DollarLineIcon />,
        name: "Purchase Order (PO)",
        path: "/purchase-orders",
        requiredPermission: ["view_purchase_order"],
      },
      {
        icon: <ListIcon />,
        name: "Daftar Item PO",
        path: "/purchase-orders/items",
        requiredPermission: ["view_purchase_order"],
      },
      {
        icon: <TableIcon />,
        name: "Laporan Harga PR vs PO",
        path: "/purchase-orders/reports/price-variance",
        requiredPermission: ["view_po_price_variance_report"],
      },
      {
        icon: <TableIcon />,
        name: "Manajemen Stok",
        path: "/inventory",
        requiredPermission: ["view_stock"],
      },
    ],
  },
  {
    title: "Data Master",
    items: [
      {
        icon: <BoxIcon />,
        name: "Produk",
        path: "/products",
        requiredPermission: ["view_product"],
      },
      {
        icon: <ListIcon />,
        name: "Kategori Produk",
        path: "/categories",
        requiredPermission: ["view_category"],
      },
      {
        icon: <TableIcon />,
        name: "Satuan (UOM)",
        path: "/uoms",
        requiredPermission: ["view_uom"],
      },
      {
        icon: <GroupIcon />,
        name: "Vendor",
        path: "/vendors",
        requiredPermission: ["view_vendor"],
      },
    ],
  },
  {
    title: "Sistem & Keamanan",
    items: [
      {
        icon: <LockIcon />,
        name: "Akses Kontrol",
        subItems: [
          {
            name: "Users",
            path: "/users",
            requiredPermission: ["view_user"],
          },
          {
            name: "Roles",
            path: "/roles",
            requiredPermission: ["view_role"],
          },
          {
            name: "Units",
            path: "/units",
            requiredPermission: ["view_unit"],
          },
          {
            name: "Role Scopes",
            path: "/role-scopes",
            requiredPermission: ["view_role_scope"],
          },
        ],
      },
      {
        icon: <SettingsIcon />,
        name: "Site Settings",
        path: "/settings",
        requiredPermission: ["view_setting"],
      },
      {
        icon: <UserIcon />,
        name: "My Profile",
        path: "/profile",
        requiredPermission: ["view_myprofile"],
      },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const { hasPermission } = useAuth();

  const [pendingPrCount, setPendingPrCount] = useState<number>(0);
  const [pendingPoCount, setPendingPoCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  const fetchPendingCount = useCallback(async () => {
    if (hasPermission("approve_purchase_requisition") && hasPermission("view_purchase_requisition")) {
      try {
        const res = await purchaseRequisitionAPI.getAll({ pending_approval: true, limit: 1 });
        if (res.success && res.data?.pagination) {
          setPendingPrCount(res.data.pagination.total);
        }
      } catch (err) {
        console.error("Failed to fetch pending PR count for sidebar badge", err);
      }
    } else {
      setPendingPrCount(0);
    }
  }, [hasPermission]);

  const fetchPendingPoCount = useCallback(async () => {
    if (hasPermission("view_purchase_order")) {
      try {
        const res = await purchaseOrderAPI.getAll({ incomplete_unpaid: true, limit: 1 });
        if (res.success && res.data?.pagination) {
          setPendingPoCount(res.data.pagination.total);
        }
      } catch (err) {
        console.error("Failed to fetch pending PO count for sidebar badge", err);
      }
    } else {
      setPendingPoCount(0);
    }
  }, [hasPermission]);

  const fetchLowStockCount = useCallback(async () => {
    if (hasPermission("view_stock")) {
      try {
        const res = await inventoryAPI.getStocks({ limit: 1 });
        if (res.success && res.data) {
          setLowStockCount(res.data.low_stock_count ?? 0);
        }
      } catch (err) {
        console.error("Failed to fetch low stock count for sidebar badge", err);
      }
    } else {
      setLowStockCount(0);
    }
  }, [hasPermission]);

  useEffect(() => {
    fetchPendingCount();
    fetchPendingPoCount();
    fetchLowStockCount();
  }, [fetchPendingCount, fetchPendingPoCount, fetchLowStockCount, location.pathname]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchPendingCount();
        fetchPendingPoCount();
        fetchLowStockCount();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchPendingCount, fetchPendingPoCount, fetchLowStockCount]);

  const getBadgeCount = useCallback((name: string): number => {
    if (name === "Permintaan (PR)") return pendingPrCount;
    if (name === "Purchase Order (PO)") return pendingPoCount;
    if (name === "Manajemen Stok") return lowStockCount;
    return 0;
  }, [pendingPrCount, pendingPoCount, lowStockCount]);

  const [openSubmenu, setOpenSubmenu] = useState<{
    groupIndex: number;
    itemIndex: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Filter menu items based on permissions
  const filteredNavGroups = useMemo(() => {
    return sidebarGroups.map((group) => {
      const filteredItems = group.items.map((item) => {
        // Filter subItems based on permissions
        if (item.subItems) {
          const filteredSubItems = item.subItems.filter((subItem) => {
            if (!subItem.requiredPermission) return true; // No permission required
            return hasPermission(subItem.requiredPermission);
          });
          
          // If parent item has permission check, check it first
          if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
            return null;
          }
          
          // Return item with filtered subItems, or null if no subItems remain
          return filteredSubItems.length > 0 
            ? { ...item, subItems: filteredSubItems }
            : null;
        }
        
        // For items without subItems, check parent permission
        if (!item.requiredPermission) return item;
        return hasPermission(item.requiredPermission) ? item : null;
      }).filter((item): item is NavItem => item !== null);

      return filteredItems.length > 0 ? { ...group, items: filteredItems } : null;
    }).filter((group): group is NavGroup => group !== null);
  }, [hasPermission]);

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    filteredNavGroups.forEach((group, groupIndex) => {
      group.items.forEach((nav, itemIndex) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                groupIndex,
                itemIndex,
              });
              submenuMatched = true;
            }
          });
        }
        // Also check if the parent path matches (for items without subItems)
        if (nav.path && isActive(nav.path)) {
          submenuMatched = true;
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive, filteredNavGroups]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.groupIndex}-${openSubmenu.itemIndex}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (groupIndex: number, itemIndex: number) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.groupIndex === groupIndex &&
        prevOpenSubmenu.itemIndex === itemIndex
      ) {
        return null;
      }
      return { groupIndex, itemIndex };
    });
  };

  const renderMenuItems = (items: NavItem[], groupIndex: number) => (
    <ul className="flex flex-col gap-1.5">
      {items.map((nav, itemIndex) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(groupIndex, itemIndex)}
              className={`menu-item group ${
                openSubmenu?.groupIndex === groupIndex && openSubmenu?.itemIndex === itemIndex
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={`menu-item-icon-size  ${
                  openSubmenu?.groupIndex === groupIndex && openSubmenu?.itemIndex === itemIndex
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.groupIndex === groupIndex &&
                    openSubmenu?.itemIndex === itemIndex
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`menu-item-icon-size relative ${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                  {getBadgeCount(nav.name) > 0 && (!isExpanded && !isHovered && !isMobileOpen) && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-error-500 ring-2 ring-white dark:ring-gray-900" />
                  )}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <>
                    <span className="menu-item-text">{nav.name}</span>
                    {getBadgeCount(nav.name) > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-error-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                        {getBadgeCount(nav.name)}
                      </span>
                    )}
                  </>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${groupIndex}-${itemIndex}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.groupIndex === groupIndex && openSubmenu?.itemIndex === itemIndex
                    ? `${subMenuHeight[`${groupIndex}-${itemIndex}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-1.5 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-[900] border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <AppLogo className="w-[150px] h-[40px]" />
          ) : (
            <AppLogo
              isSquare={true}
              className="w-[32px] h-[32px]"
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            {filteredNavGroups.map((group, groupIndex) => (
              <div key={group.title} className={groupIndex > 0 ? "mt-4" : ""}>
                <h2
                  className={`mb-3.5 text-xs font-semibold uppercase flex leading-[20px] text-gray-400 dark:text-gray-500 tracking-wider ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    group.title
                  ) : (
                    <HorizontaLDots className="size-6" />
                  )}
                </h2>
                {renderMenuItems(group.items, groupIndex)}
              </div>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;

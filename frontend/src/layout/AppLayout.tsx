import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import SessionTimeoutHandler from "../components/common/SessionTimeoutHandler";
import FaviconUpdater from "../components/common/FaviconUpdater";
import { useToast } from "../context/ToastContext";
import ToastContainer from "../components/ui/toast/ToastContainer";
import MobileBottomNav from "./MobileBottomNav";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { toasts, removeToast } = useToast();

  return (
    <>
      <FaviconUpdater />
      <SessionTimeoutHandler />
      <div className="min-h-screen xl:flex">
        <div>
          <AppSidebar />
          <Backdrop />
        </div>
        <div
          className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${
            isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
          } ${isMobileOpen ? "ml-0" : ""}`}
        >
          <AppHeader />
          <div className="p-3 mx-auto max-w-(--breakpoint-2xl) sm:p-4 md:p-6 pb-24 lg:pb-6">
            <Outlet />
          </div>
        </div>
      </div>
      <MobileBottomNav />
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;

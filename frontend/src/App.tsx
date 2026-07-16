import { BrowserRouter as Router, Routes, Route } from "react-router";
import AuthNavigationBridge from "./components/common/AuthNavigationBridge";
import ModernAuth from "./pages/AuthPages/ModernAuth";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Home from "./pages/Dashboard/Home";
import Users from "./pages/Users/Users";
import EditUser from "./pages/Users/EditUser";
import CreateUser from "./pages/Users/CreateUser";
import ViewUser from "./pages/Users/ViewUser";
import Roles from "./pages/Roles/Roles";
import EditRole from "./pages/Roles/EditRole";
import Settings from "./pages/Settings/Settings";
import Units from "./pages/Units/Units";
import RoleScopes from "./pages/RoleScopes/RoleScopes";
import Categories from "./pages/Categories/Categories";
import Uoms from "./pages/Uoms/Uoms";
import Vendors from "./pages/Vendors/Vendors";
import Products from "./pages/Products/Products";
import PurchaseRequisitions from "./pages/PurchaseRequisitions/PurchaseRequisitions";
import CreatePurchaseRequisition from "./pages/PurchaseRequisitions/CreatePurchaseRequisition";
import EditPurchaseRequisition from "./pages/PurchaseRequisitions/EditPurchaseRequisition";
import ViewPurchaseRequisition from "./pages/PurchaseRequisitions/ViewPurchaseRequisition";
import PurchaseOrders from "./pages/PurchaseOrders/PurchaseOrders";
import PurchaseOrderItems from "./pages/PurchaseOrders/PurchaseOrderItems";
import ViewPurchaseOrder from "./pages/PurchaseOrders/ViewPurchaseOrder";
import PoPriceVarianceReport from "./pages/PurchaseOrders/PoPriceVarianceReport";
import Inventory from "./pages/Inventory/Inventory";


export default function App() {
  return (
    <>
      <Router basename="/">
        <AuthNavigationBridge />
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout - Semua route di dalam AppLayout harus protected */}
          <Route element={<AppLayout />}>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />

            {/* Others Page */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute requiredPermission="view_myprofile">
                  <UserProfiles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute requiredPermission="view_user">
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/create"
              element={
                <ProtectedRoute requiredPermission="create_user">
                  <CreateUser />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/:id"
              element={
                <ProtectedRoute requiredPermission="view_user">
                  <ViewUser />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/:id/edit"
              element={
                <ProtectedRoute requiredPermission="update_user">
                  <EditUser />
                </ProtectedRoute>
              }
            />
            <Route
              path="/roles"
              element={
                <ProtectedRoute requiredPermission="view_role">
                  <Roles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/roles/:id/edit"
              element={
                <ProtectedRoute requiredPermission={["update_role", "view_role"]}>
                  <EditRole />
                </ProtectedRoute>
              }
            />
            <Route
              path="/units"
              element={
                <ProtectedRoute requiredPermission="view_unit">
                  <Units />
                </ProtectedRoute>
              }
            />
            <Route
              path="/role-scopes"
              element={
                <ProtectedRoute requiredPermission="view_role_scope">
                  <RoleScopes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/categories"
              element={
                <ProtectedRoute requiredPermission="view_category">
                  <Categories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/uoms"
              element={
                <ProtectedRoute requiredPermission="view_uom">
                  <Uoms />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendors"
              element={
                <ProtectedRoute requiredPermission="view_vendor">
                  <Vendors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute requiredPermission="view_product">
                  <Products />
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchase-requisitions"
              element={
                <ProtectedRoute requiredPermission="view_purchase_requisition">
                  <PurchaseRequisitions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchase-requisitions/create"
              element={
                <ProtectedRoute requiredPermission="create_purchase_requisition">
                  <CreatePurchaseRequisition />
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchase-requisitions/:id"
              element={
                <ProtectedRoute requiredPermission="view_purchase_requisition">
                  <ViewPurchaseRequisition />
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchase-requisitions/:id/edit"
              element={
                <ProtectedRoute requiredPermission="update_purchase_requisition">
                  <EditPurchaseRequisition />
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchase-orders"
              element={
                <ProtectedRoute requiredPermission="view_purchase_order">
                  <PurchaseOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchase-orders/items"
              element={
                <ProtectedRoute requiredPermission="view_purchase_order">
                  <PurchaseOrderItems />
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchase-orders/reports/price-variance"
              element={
                <ProtectedRoute requiredPermission="view_po_price_variance_report">
                  <PoPriceVarianceReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchase-orders/:id"
              element={
                <ProtectedRoute requiredPermission="view_purchase_order">
                  <ViewPurchaseOrder />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute requiredPermission="view_stock">
                  <Inventory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute requiredPermission="view_setting">
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Auth Layout */}
          <Route path="/signin" element={<ModernAuth />} />
          <Route path="/signup" element={<ModernAuth />} />

          {/* Fallback Route - Full screen, outside AppLayout */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}

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

export default function App() {
  return (
    <>
      <Router basename="/">
        <AuthNavigationBridge />
        <ScrollToTop />
        <Routes>
          <Route element={<AppLayout />}>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
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
              path="/settings"
              element={
                <ProtectedRoute requiredPermission="view_setting">
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="/signin" element={<ModernAuth />} />
          <Route path="/signup" element={<ModernAuth />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}

import { Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminFlatDetailsPage from "./pages/admin/AdminFlatDetailsPage";
import AdminGuardDetailsPage from "./pages/admin/AdminGuardDetailsPage";
import AdminOperationsPage from "./pages/admin/AdminOperationsPage";
import AdminModulesPage from "./pages/admin/AdminModulesPage";
import MemberCommunityPage from "./pages/member/MemberCommunityPage";
import MemberServicesPage from "./pages/member/MemberServicesPage";
import MemberVisitorsPage from "./pages/member/MemberVisitorsPage";
import SecurityEntryPage from "./pages/security/SecurityEntryPage";
import SecurityOperationsPage from "./pages/security/SecurityOperationsPage";
import SecurityModulesPage from "./pages/security/SecurityModulesPage";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/flats"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminFlatDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/guards"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminGuardDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/operations"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminOperationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/modules"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminModulesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/security"
          element={
            <ProtectedRoute allowedRoles={["SECURITY"]}>
              <SecurityEntryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/security/operations"
          element={
            <ProtectedRoute allowedRoles={["SECURITY"]}>
              <SecurityOperationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/security/modules"
          element={
            <ProtectedRoute allowedRoles={["SECURITY"]}>
              <SecurityModulesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/member"
          element={
            <ProtectedRoute allowedRoles={["MEMBER"]}>
              <MemberVisitorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/member/community"
          element={
            <ProtectedRoute allowedRoles={["MEMBER"]}>
              <MemberCommunityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/member/services"
          element={
            <ProtectedRoute allowedRoles={["MEMBER"]}>
              <MemberServicesPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;

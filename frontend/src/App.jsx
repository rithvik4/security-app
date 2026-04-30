import { Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminFlatDetailsPage from "./pages/admin/AdminFlatDetailsPage";
import AdminGuardDetailsPage from "./pages/admin/AdminGuardDetailsPage";
import MemberVisitorsPage from "./pages/member/MemberVisitorsPage";
import SecurityEntryPage from "./pages/security/SecurityEntryPage";
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
          path="/security"
          element={
            <ProtectedRoute allowedRoles={["SECURITY"]}>
              <SecurityEntryPage />
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
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;

import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Components
import Login from "./components/auth/Login";
// import Dashboard from "./components/dashboard/Dashboard";
import Layout from "./components/layout/Layout";
import LoadingSpinner from "./components/common/LoadingSpinner";

// Pages
import DashboardHome from "./pages/DashboardHome";
import UnitsManagement from "./pages/UnitsManagement";
import UsersManagement from "./pages/UsersManagement";
import PaymentsManagement from "./pages/PaymentsManagement";
import PersonnelManagement from "./pages/PersonnelManagement";
import SeasonsManagement from "./pages/SeasonsManagement";
import NewsManagement from "./pages/NewsManagement";
import ServicesManagement from "./pages/ServicesManagement";
import QRCodesManagement from "./pages/QRCodesManagement";
import FeedbackManagement from "./pages/FeedbackManagement";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route index element={<DashboardHome />} />
                  <Route path="units" element={<UnitsManagement />} />
                  <Route path="users" element={<UsersManagement />} />
                  <Route path="payments" element={<PaymentsManagement />} />
                  <Route path="personnel" element={<PersonnelManagement />} />
                  <Route path="seasons" element={<SeasonsManagement />} />
                  <Route path="news" element={<NewsManagement />} />
                  <Route path="services" element={<ServicesManagement />} />
                  <Route path="qr-codes" element={<QRCodesManagement />} />
                  <Route path="feedback" element={<FeedbackManagement />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#363636",
              color: "#fff",
            },
            success: {
              duration: 3000,
              theme: {
                primary: "#4aed88",
              },
            },
          }}
        />
      </div>
    </AuthProvider>
  );
}

export default App;

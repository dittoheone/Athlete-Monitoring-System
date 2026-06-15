import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContexts";
import { ToastProvider } from "./context/ToastProvider";
import LoginPage from "./pages/LoginPage";
import MedisPage from "./pages/MedisPage";
import CoachPage from "./pages/CoachPage";
import LoadingSkeleton from "./components/common/LoadingSkeleton";

import AdminPage from "./pages/AdminPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.requires_password_change) {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />

      <Route
        path="/change-password"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : !user.requires_password_change ? (
            <Navigate to="/" replace />
          ) : (
            <ChangePasswordPage />
          )
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            {user?.role === "admin" ? (
              <Navigate to="/admin" replace />
            ) : user?.role === "medis" ? (
              <Navigate to="/medis" replace />
            ) : (
              <Navigate to="/coach" replace />
            )}
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/medis/*"
        element={
          <ProtectedRoute allowedRoles={["medis"]}>
            <MedisPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/coach/*"
        element={
          <ProtectedRoute allowedRoles={["pelatih"]}>
            <CoachPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
      cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
      refetchOnWindowFocus: false, // Don't refetch on window focus to avoid spamming
      retry: 1, // Only retry once on failure
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

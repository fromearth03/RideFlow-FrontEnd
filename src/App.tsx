import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CreateRidePage from "./pages/CreateRidePage";
import UserRidesPage from "./pages/UserRidesPage";
import DriverRidesPage from "./pages/DriverRidesPage";
import DispatchRidesPage from "./pages/DispatchRidesPage";
import AdminRidesPage from "./pages/admin/AdminRidesPage";
import AdminDriversPage from "./pages/admin/AdminDriversPage";
import AdminVehiclesPage from "./pages/admin/AdminVehiclesPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminDispatchersPage from "./pages/admin/AdminDispatchersPage";
import AdminActivityPage from "./pages/admin/AdminActivityPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Generic dashboard — redirects by role */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

            {/* Role-specific dashboard routes */}
            <Route path="/user-dashboard" element={<ProtectedRoute roles={['ROLE_CUSTOMER']}><DashboardPage /></ProtectedRoute>} />
            <Route path="/driver-dashboard" element={<ProtectedRoute roles={['ROLE_DRIVER']}><DashboardPage /></ProtectedRoute>} />
            <Route path="/dispatcher-dashboard" element={<ProtectedRoute roles={['ROLE_DISPATCHER']}><DashboardPage /></ProtectedRoute>} />
            <Route path="/admin-dashboard" element={<ProtectedRoute roles={['ROLE_ADMIN']}><DashboardPage /></ProtectedRoute>} />

            {/* Customer routes */}
            <Route path="/rides" element={<ProtectedRoute roles={['ROLE_CUSTOMER']}><UserRidesPage /></ProtectedRoute>} />
            <Route path="/rides/new" element={<ProtectedRoute roles={['ROLE_CUSTOMER']}><CreateRidePage /></ProtectedRoute>} />

            {/* Driver routes */}
            <Route path="/driver/rides" element={<ProtectedRoute roles={['ROLE_DRIVER']}><DriverRidesPage /></ProtectedRoute>} />

            {/* Dispatcher routes */}
            <Route path="/dispatch/rides" element={<ProtectedRoute roles={['ROLE_DISPATCHER']}><DispatchRidesPage /></ProtectedRoute>} />
            <Route path="/dispatch/rides/new" element={<ProtectedRoute roles={['ROLE_DISPATCHER']}><CreateRidePage /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin/rides" element={<ProtectedRoute roles={['ROLE_ADMIN']}><AdminRidesPage /></ProtectedRoute>} />
            <Route path="/admin/drivers" element={<ProtectedRoute roles={['ROLE_ADMIN']}><AdminDriversPage /></ProtectedRoute>} />
            <Route path="/admin/dispatchers" element={<ProtectedRoute roles={['ROLE_ADMIN']}><AdminDispatchersPage /></ProtectedRoute>} />
            <Route path="/admin/vehicles" element={<ProtectedRoute roles={['ROLE_ADMIN']}><AdminVehiclesPage /></ProtectedRoute>} />
            <Route path="/admin/customers" element={<ProtectedRoute roles={['ROLE_ADMIN']}><AdminUsersPage /></ProtectedRoute>} />
            <Route path="/admin/activity" element={<ProtectedRoute roles={['ROLE_ADMIN']}><AdminActivityPage /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;

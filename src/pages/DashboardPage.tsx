import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { UserDashboard } from '@/pages/dashboards/UserDashboard';
import { DriverDashboard } from '@/pages/dashboards/DriverDashboard';
import { DispatcherDashboard } from '@/pages/dashboards/DispatcherDashboard';
import { AdminDashboard } from '@/pages/dashboards/AdminDashboard';

const DashboardPage = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  const dashboards = {
    ROLE_CUSTOMER: UserDashboard,
    ROLE_DRIVER: DriverDashboard,
    ROLE_DISPATCHER: DispatcherDashboard,
    ROLE_ADMIN: AdminDashboard,
  };

  const Dashboard = dashboards[user.role];

  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
};

export default DashboardPage;

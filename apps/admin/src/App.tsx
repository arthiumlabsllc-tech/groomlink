import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Salons } from './pages/Salons';
import { Users } from './pages/Users';
import { Transactions } from './pages/Transactions';
import { Promotions } from './pages/Promotions';
import { Support } from './pages/Support';
import { SupportStaff } from './pages/SupportStaff';
import { AdminManagement } from './pages/AdminManagement';
import { Settings } from './pages/Settings';
import { Policies } from './pages/Policies';
import { Escrow } from './pages/Escrow';
import { Cancellations } from './pages/Cancellations';
import { NoShows } from './pages/NoShows';
import { Login } from './pages/Login';
import NotFound from './pages/NotFound';
import { useAuth } from './hooks';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

// Permission guard component
function PermissionGuard({ 
  children, 
  pageId,
  requireSuperAdmin = false 
}: { 
  children: React.ReactNode; 
  pageId?: string;
  requireSuperAdmin?: boolean;
}) {
  const { user } = useAuth();
  const location = useLocation();

  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check for SUPER_ADMIN requirement
  if (requireSuperAdmin && user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  // Check page permissions for ADMIN users
  if (user.role === 'ADMIN' && pageId && pageId !== 'settings') {
    const hasPermission = user.pages?.includes(pageId);
    if (!hasPermission) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route 
          path="dashboard" 
          element={
            <PermissionGuard pageId="dashboard">
              <Dashboard />
            </PermissionGuard>
          } 
        />
        <Route 
          path="salons" 
          element={
            <PermissionGuard pageId="salons">
              <Salons />
            </PermissionGuard>
          } 
        />
        <Route 
          path="users" 
          element={
            <PermissionGuard pageId="users">
              <Users />
            </PermissionGuard>
          } 
        />
        <Route 
          path="transactions" 
          element={
            <PermissionGuard pageId="transactions">
              <Transactions />
            </PermissionGuard>
          } 
        />
        <Route 
          path="promotions" 
          element={
            <PermissionGuard pageId="promotions">
              <Promotions />
            </PermissionGuard>
          } 
        />
        <Route 
          path="support" 
          element={
            <PermissionGuard pageId="support">
              <Support />
            </PermissionGuard>
          } 
        />
        <Route 
          path="support-staff" 
          element={
            <PermissionGuard pageId="support-staff">
              <SupportStaff />
            </PermissionGuard>
          } 
        />
        <Route 
          path="admins" 
          element={
            <PermissionGuard requireSuperAdmin>
              <AdminManagement />
            </PermissionGuard>
          } 
        />
        <Route 
          path="settings" 
          element={
            <PermissionGuard pageId="settings">
              <Settings />
            </PermissionGuard>
          } 
        />
        <Route 
          path="policies" 
          element={
            <PermissionGuard pageId="policies">
              <Policies />
            </PermissionGuard>
          } 
        />
        <Route 
          path="escrow" 
          element={
            <PermissionGuard pageId="escrow">
              <Escrow />
            </PermissionGuard>
          } 
        />
        <Route 
          path="cancellations" 
          element={
            <PermissionGuard pageId="cancellations">
              <Cancellations />
            </PermissionGuard>
          } 
        />
        <Route 
          path="no-shows" 
          element={
            <PermissionGuard pageId="no-shows">
              <NoShows />
            </PermissionGuard>
          } 
        />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

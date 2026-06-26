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
import { SponsoredSalons } from './pages/SponsoredSalons';
import { SubscriptionOverview } from './pages/SubscriptionOverview';
import { SubscriptionPlans } from './pages/SubscriptionPlans';
import { SubscriptionInvoices } from './pages/SubscriptionInvoices';
import Feedback from './pages/Feedback';
import { SalonReviews } from './pages/SalonReviews';
import { Security } from './pages/Security';
import { Builds } from './pages/Builds';
import { AccessDenied } from './pages/AccessDenied';
import { Login } from './pages/Login';
import NotFound from './pages/NotFound';
import { useAuth } from './hooks';
import LoadingScreen from './components/LoadingScreen';
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
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Check if user is authenticated
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check for SUPER_ADMIN requirement (only for specific actions like modifying SUPER_ADMIN accounts)
  if (requireSuperAdmin && user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/access-denied" replace />;
  }

  // Check page-level permissions
  if (pageId) {
    // SUPER_ADMIN has access to everything
    if (user.role === 'SUPER_ADMIN') {
      return <>{children}</>;
    }
    
    // Check if user has permission for this page
    const hasAccess = user.permissions?.pages?.includes(pageId);
    
    if (!hasAccess) {
      return <Navigate to="/access-denied" replace />;
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
            <PermissionGuard pageId="admins">
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
        <Route 
          path="sponsored-salons" 
          element={
            <PermissionGuard pageId="sponsored-salons">
              <SponsoredSalons />
            </PermissionGuard>
          } 
        />
        <Route 
          path="subscriptions" 
          element={
            <PermissionGuard pageId="subscriptions">
              <SubscriptionOverview />
            </PermissionGuard>
          } 
        />
        <Route 
          path="subscriptions/plans" 
          element={
            <PermissionGuard pageId="subscriptions">
              <SubscriptionPlans />
            </PermissionGuard>
          } 
        />
        <Route 
          path="subscriptions/invoices" 
          element={
            <PermissionGuard pageId="subscriptions">
              <SubscriptionInvoices />
            </PermissionGuard>
          } 
        />
        <Route 
          path="feedback" 
          element={
            <PermissionGuard pageId="feedback">
              <Feedback />
            </PermissionGuard>
          } 
        />
        <Route 
          path="salon-reviews" 
          element={
            <PermissionGuard pageId="salons">
              <SalonReviews />
            </PermissionGuard>
          } 
        />
        <Route 
          path="security" 
          element={
            <PermissionGuard pageId="security">
              <Security />
            </PermissionGuard>
          } 
        />
        <Route 
          path="builds" 
          element={
            <PermissionGuard pageId="settings">
              <Builds />
            </PermissionGuard>
          } 
        />
      </Route>
      <Route path="/access-denied" element={<AccessDenied />} />
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

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth, AuthProvider } from './hooks/useAuth';
import { useImpersonation } from './hooks/useImpersonation';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import Customers from './pages/Customers';
import Users from './pages/Users';
import Salons from './pages/Salons';
import Tickets from './pages/Tickets';
import LiveChat from './pages/LiveChat';
import Settings from './pages/Settings';

function SessionManager() {
  const { isAuthenticated } = useAuth();
  // Only run session timeout for authenticated users
  if (isAuthenticated) {
    useSessionTimeout();
  }
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/customers" element={
        <ProtectedRoute>
          <Layout>
            <Customers />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <ProtectedRoute>
          <Layout>
            <Users />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/salons" element={
        <ProtectedRoute>
          <Layout>
            <Salons />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/tickets" element={
        <ProtectedRoute>
          <Layout>
            <Tickets />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/live-chat" element={
        <ProtectedRoute>
          <Layout>
            <LiveChat />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Layout>
            <Settings />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function ImpersonationEndHandler() {
  const { endImpersonation } = useImpersonation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const endLogId = params.get('end_impersonation');

    if (endLogId) {
      // Clean up the URL immediately
      window.history.replaceState({}, document.title, window.location.pathname);
      // Call the backend API to record endedAt and clean up impersonation state
      // The endImpersonation function calls api.endImpersonation(logId) and restores the original token
      localStorage.setItem('impersonation_log_id', endLogId);
      endImpersonation();
    }
  }, [endImpersonation]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <SessionManager />
          <ImpersonationEndHandler />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

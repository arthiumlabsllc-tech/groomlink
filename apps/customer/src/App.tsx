import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { ProfileSetupGuard } from './components/ProfileSetupGuard';
import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Explore from './pages/Explore';
import Bookings from './pages/Bookings';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import SalonDetail from './pages/SalonDetail';
import BookSalon from './pages/BookSalon';
import PaymentCallback from './pages/PaymentCallback';
import Notifications from './pages/Notifications';
import Rewards from './pages/Rewards';
import NotFound from './pages/NotFound';
import { useAuthStore } from './store/auth';

/**
 * Process impersonation token from URL SYNCHRONOUSLY before React mounts.
 * This is critical: if we wait for useEffect, ProtectedRoute will redirect
 * to the login page before the token is stored.
 */
function processImpersonationToken(): boolean {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const impersonationLogId = params.get('impersonation_log_id');
  const isImpersonating = params.get('impersonation') === 'true';
  
  if (token) {
    // Store the token IMMEDIATELY as customer_token so initialize() finds it
    localStorage.setItem('customer_token', token);
    if (impersonationLogId) {
      localStorage.setItem('impersonation_log_id', impersonationLogId);
    }
    if (isImpersonating) {
      localStorage.setItem('is_impersonating', 'true');
    }
    // Remove token from URL for security
    const newUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, newUrl);
    return true;
  }
  return false;
}

// Process token SYNCHRONOUSLY at module load time, BEFORE React renders
const hasImpersonationToken = processImpersonationToken();

function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const setToken = useAuthStore((state) => state.setToken);

  useEffect(() => {
    // If we processed an impersonation token synchronously, use setToken
    // to update the Zustand store and trigger profile fetch
    if (hasImpersonationToken) {
      const token = localStorage.getItem('customer_token');
      if (token) {
        setToken(token);
      }
    }
    
    initialize();
  }, [initialize, setToken]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#006B3F',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#CE1126',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Profile Setup - Protected but outside Layout, NOT wrapped by ProfileSetupGuard */}
        <Route path="/profile/setup" element={
          <ProtectedRoute>
            <ProfileSetup />
          </ProtectedRoute>
        } />
        
        {/* Onboarding - Protected but outside Layout, wrapped by ProfileSetupGuard */}
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <ProfileSetupGuard>
              <Onboarding />
            </ProfileSetupGuard>
          </ProtectedRoute>
        } />
        
        {/* All other routes - inside Layout (Header + BottomNav) */}
        <Route element={<Layout />}>
          {/* Public discovery routes */}
          <Route path="/explore" element={<Explore />} />
          <Route path="/salon/:id" element={<SalonDetail />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <ProfileSetupGuard>
                <Dashboard />
              </ProfileSetupGuard>
            </ProtectedRoute>
          } />
          <Route path="/bookings" element={
            <ProtectedRoute>
              <ProfileSetupGuard>
                <Bookings />
              </ProfileSetupGuard>
            </ProtectedRoute>
          } />
          <Route path="/favorites" element={
            <ProtectedRoute>
              <ProfileSetupGuard>
                <Favorites />
              </ProfileSetupGuard>
            </ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute>
              <ProfileSetupGuard>
                <Notifications />
              </ProfileSetupGuard>
            </ProtectedRoute>
          } />
          <Route path="/rewards" element={
            <ProtectedRoute>
              <ProfileSetupGuard>
                <Rewards />
              </ProfileSetupGuard>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfileSetupGuard>
                <Profile />
              </ProfileSetupGuard>
            </ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
        
        {/* Booking Page - Protected, outside Layout */}
        <Route path="/salon/:id/book" element={
          <ProtectedRoute>
            <ProfileSetupGuard>
              <BookSalon />
            </ProfileSetupGuard>
          </ProtectedRoute>
        } />
        
        {/* Payment Callback - Protected, outside Layout */}
        {/* Hubtel mobile money flow: polls for payment confirmation after USSD/STK prompt */}
        <Route path="/payment/callback" element={
          <ProtectedRoute>
            <ProfileSetupGuard>
              <PaymentCallback />
            </ProfileSetupGuard>
          </ProtectedRoute>
        } />
        <Route path="/payment/verify" element={
          <ProtectedRoute>
            <ProfileSetupGuard>
              <PaymentCallback />
            </ProfileSetupGuard>
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

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

function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const setToken = useAuthStore((state) => state.setToken);

  useEffect(() => {
    // Check for token in URL params (from redirect after login or impersonation)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const impersonationLogId = urlParams.get('impersonation_log_id');
    
    if (tokenFromUrl) {
      // Store token and clean up URL
      setToken(tokenFromUrl);
      // Store impersonation log id if present
      if (impersonationLogId) {
        localStorage.setItem('impersonation_log_id', impersonationLogId);
      }
      // Remove token from URL without reloading
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
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
        
        {/* Protected routes with ProfileSetupGuard */}
        <Route path="/" element={
          <ProtectedRoute>
            <ProfileSetupGuard>
              <Layout />
            </ProfileSetupGuard>
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="explore" element={<Explore />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="rewards" element={<Rewards />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        
        {/* Salon Detail - Protected but outside Layout for full-width experience */}
        <Route path="/salon/:id" element={
          <ProtectedRoute>
            <ProfileSetupGuard>
              <SalonDetail />
            </ProfileSetupGuard>
          </ProtectedRoute>
        } />
        
        {/* Booking Page - Protected */}
        <Route path="/salon/:id/book" element={
          <ProtectedRoute>
            <ProfileSetupGuard>
              <BookSalon />
            </ProfileSetupGuard>
          </ProtectedRoute>
        } />
        
        {/* Payment Callback - Protected */}
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

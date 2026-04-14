import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Explore from './pages/Explore';
import Bookings from './pages/Bookings';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import SalonDetail from './pages/SalonDetail';
import BookSalon from './pages/BookSalon';
import PaymentCallback from './pages/PaymentCallback';
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
        
        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="explore" element={<Explore />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        
        {/* Salon Detail - Protected but outside Layout for full-width experience */}
        <Route path="/salon/:id" element={
          <ProtectedRoute>
            <SalonDetail />
          </ProtectedRoute>
        } />
        
        {/* Booking Page - Protected */}
        <Route path="/salon/:id/book" element={
          <ProtectedRoute>
            <BookSalon />
          </ProtectedRoute>
        } />
        
        {/* Payment Callback - Protected */}
        <Route path="/payment/callback" element={
          <ProtectedRoute>
            <PaymentCallback />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

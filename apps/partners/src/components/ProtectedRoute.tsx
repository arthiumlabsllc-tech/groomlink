import { Navigate } from 'react-router-dom';
import { api } from '../lib/api';

/**
 * ProtectedRoute - Checks if user is authenticated
 * 
 * Checks both the in-memory API token AND localStorage as a fallback,
 * which handles the case where TokenHandler sets the token via URL params
 * after the initial render.
 * 
 * Note: Salon existence check is handled by SalonSetupWrapper
 * which wraps all protected routes in App.tsx
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Check both in-memory token and localStorage (for impersonation flow timing)
  const isAuthenticated = api.isAuthenticated() || !!localStorage.getItem('auth_token');
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

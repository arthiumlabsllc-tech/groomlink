import { Navigate } from 'react-router-dom';
import { api } from '../lib/api';

/**
 * ProtectedRoute - Checks if user is authenticated
 * 
 * Note: Salon existence check is handled by SalonSetupWrapper
 * which wraps all protected routes in App.tsx
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!api.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

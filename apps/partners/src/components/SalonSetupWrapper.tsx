import { Navigate, useLocation } from 'react-router-dom';
import { useSalon } from '../store/SalonContext';
import LoadingScreen from './LoadingScreen';

/**
 * SalonSetupWrapper - Forces new partners without a salon to the settings page
 * 
 * This wrapper ensures that:
 * 1. If user has no salon (hasSalon === false), they can ONLY access /settings
 * 2. All other routes redirect to /settings for setup
 * 3. Once salon is created, normal navigation is allowed
 */
export function SalonSetupWrapper({ children }: { children: React.ReactNode }) {
  const { hasSalon, loading } = useSalon();
  const location = useLocation();

  // While loading, show nothing (or could show a spinner)
  if (loading) {
    return <LoadingScreen />;
  }

  // If user has no salon, force them to settings page
  // But during impersonation, allow access to any page (support agent viewing account)
  const isImpersonating = !!localStorage.getItem('is_impersonating')
  if (hasSalon === false && !isImpersonating) {
    // Allow access to settings page for salon creation
    if (location.pathname === '/settings') {
      return <>{children}</>;
    }
    // Redirect all other routes to settings
    return <Navigate to="/settings" replace />;
  }

  // User has a salon or unknown state - allow normal access
  return <>{children}</>;
}

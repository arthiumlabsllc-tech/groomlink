import { Navigate, useLocation } from 'react-router-dom';
import { useSalon } from '../store/SalonContext';

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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-ghana-green border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // If user has no salon, force them to settings page
  if (hasSalon === false) {
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

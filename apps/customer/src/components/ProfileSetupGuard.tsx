import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

/**
 * ProfileSetupGuard - Forces new customers with incomplete profiles to the profile setup page
 * 
 * This wrapper ensures that:
 * 1. If user has incomplete profile (missing firstName or phoneNumber), they can ONLY access /profile/setup
 * 2. All other routes redirect to /profile/setup for completion
 * 3. Once profile is complete, normal navigation is allowed
 */
export function ProfileSetupGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuthStore();
  const location = useLocation();

  // While loading, show spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#006B3F] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't handle here - let ProtectedRoute handle it
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Check if profile is complete (has both firstName and phoneNumber)
  const isProfileComplete = user?.firstName && user?.phoneNumber;

  // If user has incomplete profile, force them to setup page
  if (!isProfileComplete) {
    // Allow access to profile setup page
    if (location.pathname === '/profile/setup') {
      return <>{children}</>;
    }
    // Redirect all other routes to profile setup
    return <Navigate to="/profile/setup" replace />;
  }

  // User has a complete profile - allow normal access
  return <>{children}</>;
}

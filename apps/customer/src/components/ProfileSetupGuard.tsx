import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import LoadingScreen from './LoadingScreen';

/**
 * ProfileSetupGuard - Forces new customers with incomplete profiles or onboarding to the correct page
 * 
 * This wrapper ensures that:
 * 1. If user has incomplete profile (missing firstName or phoneNumber), they can ONLY access /profile/setup
 * 2. If user has complete profile but hasn't finished onboarding (onboardingComplete === false), redirect to /onboarding
 * 3. Once both profile and onboarding are complete, normal navigation is allowed
 */
export function ProfileSetupGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuthStore();
  const location = useLocation();

  // While loading, show spinner
  if (isLoading) {
    return <LoadingScreen />;
  }

  // If not authenticated, don't handle here - let ProtectedRoute handle it
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Check if profile is complete (has both firstName and phoneNumber)
  const isProfileComplete = user?.firstName && user?.phoneNumber;
  const isImpersonating = !!localStorage.getItem('is_impersonating');

  // If user has incomplete profile, force them to setup page
  // But during impersonation, allow access to any page (support agent viewing account)
  if (!isProfileComplete && !isImpersonating) {
    // Allow access to profile setup page
    if (location.pathname === '/profile/setup') {
      return <>{children}</>;
    }
    // Redirect all other routes to profile setup
    return <Navigate to="/profile/setup" replace />;
  }

  // Profile is complete- check onboarding
  const needsOnboarding = user?.onboardingComplete === false;

  if (needsOnboarding) {
    // Allow access to onboarding page
    if (location.pathname === '/onboarding') {
      return <>{children}</>;
    }
    // Redirect to onboarding
    return <Navigate to="/onboarding" replace />;
  }

  // User has a complete profile and finished onboarding- allow normal access
  return <>{children}</>;
}

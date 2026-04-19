import { useAuthStore } from '../store/auth';
import LoadingScreen from './LoadingScreen';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    // Redirect to main login page with redirect parameter
    const currentUrl = encodeURIComponent(window.location.href);
    window.location.href = `https://my.groomlinkgh.com/login?redirect=${currentUrl}`;
    return null;
  }
  
  return <>{children}</>;
}

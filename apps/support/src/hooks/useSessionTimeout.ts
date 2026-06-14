import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function useSessionTimeout() {
  const navigate = useNavigate();
  const { logout: authLogout } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doLogout = useCallback(() => {
    // Call the auth logout which calls api.logout() and cleans up state
    authLogout();
    navigate('/login');
    
    // Show notification on next page
    sessionStorage.setItem('session_expired', 'true');
  }, [authLogout, navigate]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      doLogout();
    }, INACTIVITY_TIMEOUT);
  }, [doLogout]);

  useEffect(() => {
    // Events to track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    
    // Start timer
    resetTimer();
    
    // Reset timer on user activity
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });
    
    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [resetTimer]);

  return { resetTimer };
}

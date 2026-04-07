import { useState, useCallback } from 'react';
import { api } from '../api';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  role: string;
  status: string;
  createdAt: string;
  salons?: { id: string; businessName: string }[];
}

export function useImpersonation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(!!localStorage.getItem('impersonation_log_id'));

  const startImpersonation = useCallback(async (userId: string, reason?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.startImpersonation(userId, reason);
      if (response.success) {
        setIsImpersonating(true);
        window.location.href = 'https://partners.groomlinkgh.com';
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start impersonation');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const endImpersonation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const logId = localStorage.getItem('impersonation_log_id');
      if (logId) {
        await api.endImpersonation(logId);
      }
      localStorage.removeItem('impersonation_log_id');
      localStorage.removeItem('impersonating_user');
      localStorage.removeItem('auth_token');
      setIsImpersonating(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end impersonation');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    startImpersonation,
    endImpersonation,
    isLoading,
    error,
    isImpersonating,
  };
}

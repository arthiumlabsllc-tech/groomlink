import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  role: string;
  status: string;
  avatar?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithEmailOTP: (email: string, code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    const token = localStorage.getItem('auth_token');
    const impersonatingUser = localStorage.getItem('impersonating_user');
    
    if (token) {
      if (impersonatingUser) {
        setUser(JSON.parse(impersonatingUser));
      } else {
        // Get user profile
        fetchUserProfile();
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Fetch full profile from API to get avatar
        const response = await api.getAgentProfile();
        if (response.success) {
          setUser({
            id: response.data.user.id,
            firstName: response.data.user.firstName,
            lastName: response.data.user.lastName,
            phoneNumber: '',
            email: response.data.user.email || undefined,
            role: response.data.user.role,
            status: response.data.user.status,
            avatar: response.data.user.avatar,
          });
        } else {
          // Fallback to decoding JWT if profile fetch fails
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUser({
            id: payload.userId,
            firstName: payload.firstName || 'Support',
            lastName: payload.lastName || 'Agent',
            phoneNumber: payload.phoneNumber || '',
            role: payload.role,
            status: 'ACTIVE',
            avatar: null,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // Fallback to JWT decoding
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUser({
            id: payload.userId,
            firstName: payload.firstName || 'Support',
            lastName: payload.lastName || 'Agent',
            phoneNumber: payload.phoneNumber || '',
            role: payload.role,
            status: 'ACTIVE',
            avatar: null,
          });
        }
      } catch {
        api.logout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmailOTP = useCallback(async (email: string, code: string) => {
    const response = await api.verifyEmailOTP(email, code);
    if (response.success && response.data) {
      setUser(response.data.user);
    }
  }, []);

  const logout = useCallback(() => {
    const impersonationLogId = localStorage.getItem('impersonation_log_id');
    if (impersonationLogId) {
      api.endImpersonation(impersonationLogId).catch(console.error);
    }
    api.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, loginWithEmailOTP, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

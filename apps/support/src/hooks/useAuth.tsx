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
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithOtp: (phone: string, otp: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
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
      // In a real app, you'd fetch the profile from an endpoint
      // For now, we'll just check the token exists
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Decode JWT to get user info (basic check)
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: payload.userId,
          firstName: payload.firstName || 'Support',
          lastName: payload.lastName || 'Agent',
          phoneNumber: payload.phoneNumber || '',
          role: payload.role,
          status: 'ACTIVE',
        });
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      api.logout();
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOtp = useCallback(async (phone: string, otp: string) => {
    const response = await api.verifyOtp(phone, otp);
    if (response.success && response.data) {
      setUser(response.data.user);
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const response = await api.loginWithEmail(email, password);
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
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, loginWithOtp, loginWithEmail, logout }}>
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

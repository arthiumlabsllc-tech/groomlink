import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi, AdminUser, AuthResponse } from '../api';

const AUTH_KEY = 'admin_auth';

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Get current user from localStorage
  const getStoredUser = (): AdminUser | null => {
    const userStr = localStorage.getItem('admin_user');
    if (!userStr || userStr === 'undefined') return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  };

  // Query for current user
  const { data: user, isLoading } = useQuery({
    queryKey: [AUTH_KEY, 'user'],
    queryFn: async () => {
      const stored = getStoredUser();
      if (!stored) return null;
      
      try {
        const response = await authApi.getProfile();
        if (response.success) {
          localStorage.setItem('admin_user', JSON.stringify(response.data.user));
          return response.data.user;
        }
        return stored;
      } catch {
        return stored;
      }
    },
    initialData: getStoredUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Login with password mutation
  const login = useMutation({
    mutationFn: ({ phoneNumber, password }: { phoneNumber: string; password: string }) =>
      authApi.login(phoneNumber, password),
    onSuccess: (response) => {
      if (response.success) {
        localStorage.setItem('admin_token', response.data.tokens.accessToken);
        localStorage.setItem('admin_refresh_token', response.data.tokens.refreshToken);
        localStorage.setItem('admin_user', JSON.stringify(response.data.user));
        queryClient.setQueryData([AUTH_KEY, 'user'], response.data.user);
        navigate('/dashboard');
      }
    },
  });

  // Request OTP mutation
  const requestOTP = useMutation({
    mutationFn: authApi.requestOTP,
  });

  // Verify OTP mutation
  const verifyOTP = useMutation({
    mutationFn: ({ phoneNumber, otp }: { phoneNumber: string; otp: string }) =>
      authApi.verifyOTP(phoneNumber, otp),
    onSuccess: (response) => {
      if (response.success) {
        localStorage.setItem('admin_token', response.data.tokens.accessToken);
        localStorage.setItem('admin_refresh_token', response.data.tokens.refreshToken);
        localStorage.setItem('admin_user', JSON.stringify(response.data.user));
        queryClient.setQueryData([AUTH_KEY, 'user'], response.data.user);
        navigate('/dashboard');
      }
    },
  });

  // Request Email OTP mutation
  const requestEmailOTP = useMutation({
    mutationFn: authApi.requestEmailOTP,
  });

  // Admin login (email + password); may complete directly or require 2FA
  const adminLogin = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.adminLogin(email, password),
    onSuccess: (response) => {
      if (response.success && !('requiresTwoFactor' in response.data)) {
        localStorage.setItem('admin_token', response.data.tokens.accessToken);
        localStorage.setItem('admin_refresh_token', response.data.tokens.refreshToken);
        localStorage.setItem('admin_user', JSON.stringify(response.data.user));
        queryClient.setQueryData([AUTH_KEY, 'user'], response.data.user);
        navigate('/dashboard');
      }
    },
  });

  // Admin login step 2: verify TOTP / backup code
  const verifyAdmin2FA = useMutation({
    mutationFn: ({ twoFactorToken, code }: { twoFactorToken: string; code: string }) =>
      authApi.verifyAdmin2FA(twoFactorToken, code),
    onSuccess: (response) => {
      if (response.success) {
        localStorage.setItem('admin_token', response.data.tokens.accessToken);
        localStorage.setItem('admin_refresh_token', response.data.tokens.refreshToken);
        localStorage.setItem('admin_user', JSON.stringify(response.data.user));
        queryClient.setQueryData([AUTH_KEY, 'user'], response.data.user);
        navigate('/dashboard');
      }
    },
  });

  // Verify Email OTP mutation
  const verifyEmailOTP = useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      authApi.verifyEmailOTP(email, code),
    onSuccess: (response: AuthResponse) => {
      if (response.success) {
        localStorage.setItem('admin_token', response.data.tokens.accessToken);
        localStorage.setItem('admin_refresh_token', response.data.tokens.refreshToken);
        localStorage.setItem('admin_user', JSON.stringify(response.data.user));
        queryClient.setQueryData([AUTH_KEY, 'user'], response.data.user);
        navigate('/dashboard');
      }
    },
  });

  // Logout mutation
  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
      navigate('/login');
    },
  });

  const isAuthenticated = !!user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    requestOTP,
    verifyOTP,
    requestEmailOTP,
    verifyEmailOTP,
    adminLogin,
    verifyAdmin2FA,
    logout,
  };
}

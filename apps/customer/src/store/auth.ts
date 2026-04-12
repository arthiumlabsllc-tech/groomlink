import { create } from 'zustand';
import apiClient from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  role: string;
  profileImage: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  requestOTP: (email: string) => Promise<{ isNewUser: boolean }>;
  verifyOTP: (email: string, code: string) => Promise<{ isNewUser: boolean; token?: string }>;
  completeRegistration: (data: { firstName: string; lastName: string; email: string; role: string }) => Promise<void>;
  fetchProfile: () => Promise<void>;
  logout: () => void;
  initialize: () => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: () => {
    const token = localStorage.getItem('customer_token');
    const userStr = localStorage.getItem('customer_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ token, user, isAuthenticated: true, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  setToken: (token: string) => {
    localStorage.setItem('customer_token', token);
    set({ token, isAuthenticated: true });
    // Fetch user profile after setting token
    get().fetchProfile();
  },

  requestOTP: async (email: string) => {
    const res = await apiClient.post('/auth/otp/email/request', { email });
    return { isNewUser: res.data.data?.isNewUser ?? res.data.isNewUser ?? false };
  },

  verifyOTP: async (email: string, code: string) => {
    const res = await apiClient.post('/auth/otp/email/verify', { email, code });
    const data = res.data.data || res.data;
    
    // Handle both old format (data.token) and new format (data.tokens.accessToken)
    const accessToken = data.token || data.tokens?.accessToken;
    
    if (accessToken && data.user) {
      localStorage.setItem('customer_token', accessToken);
      localStorage.setItem('customer_user', JSON.stringify(data.user));
      set({ token: accessToken, user: data.user, isAuthenticated: true });
      return { isNewUser: false, token: accessToken };
    }
    
    // New user - store temp token for registration
    const tempToken = data.tempToken || data.tokens?.accessToken;
    if (tempToken) {
      localStorage.setItem('customer_temp_token', tempToken);
    }
    return { isNewUser: true };
  },

  completeRegistration: async (data) => {
    const tempToken = localStorage.getItem('customer_temp_token');
    const res = await apiClient.post('/auth/complete-registration', data, {
      headers: tempToken ? { Authorization: `Bearer ${tempToken}` } : {},
    });
    const result = res.data.data || res.data;
    
    // Handle both old format (result.token) and new format (result.tokens.accessToken)
    const accessToken = result.token || result.tokens?.accessToken;
    
    localStorage.removeItem('customer_temp_token');
    localStorage.setItem('customer_token', accessToken);
    localStorage.setItem('customer_user', JSON.stringify(result.user));
    set({ token: accessToken, user: result.user, isAuthenticated: true });
  },

  fetchProfile: async () => {
    try {
      const res = await apiClient.get('/users/profile');
      const user = res.data.data || res.data;
      localStorage.setItem('customer_user', JSON.stringify(user));
      set({ user });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  },

  logout: () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_user');
    localStorage.removeItem('customer_temp_token');
    set({ token: null, user: null, isAuthenticated: false });
    window.location.href = 'https://my.groomlinkgh.com/login';
  },
}));

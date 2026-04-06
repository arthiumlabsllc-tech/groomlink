import apiClient from './client';

export interface LoginCredentials {
  phoneNumber: string;
  password?: string;
  otp?: string;
}

export interface AdminUser {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: 'ADMIN' | 'SALON_OWNER' | 'CUSTOMER';
  isVerified: boolean;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: AdminUser;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
    isNewUser?: boolean;
  };
}

export const authApi = {
  // Login with phone and password
  login: async (phoneNumber: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', { phoneNumber, password });
    return response.data;
  },

  // Request OTP for login
  requestOTP: async (phoneNumber: string) => {
    const response = await apiClient.post('/auth/otp/request', { phoneNumber });
    return response.data;
  },

  // Verify OTP and login
  verifyOTP: async (phoneNumber: string, otp: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/otp/verify', { phoneNumber, code: otp });
    return response.data;
  },

  // Refresh token
  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  // Get current user profile
  getProfile: async () => {
    const response = await apiClient.get('/user/profile');
    return response.data;
  },

  // Logout
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Ignore logout errors
    }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user');
  },
};

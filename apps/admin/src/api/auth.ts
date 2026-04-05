import apiClient from './client';

export interface LoginCredentials {
  phoneNumber: string;
  otp: string;
}

export interface AdminUser {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: 'ADMIN' | 'SALON_OWNER' | 'CUSTOMER';
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: AdminUser;
    token: string;
  };
}

export const authApi = {
  // Request OTP for login
  requestOTP: async (phoneNumber: string) => {
    const response = await apiClient.post('/auth/otp/request', { phoneNumber });
    return response.data;
  },

  // Verify OTP and login
  verifyOTP: async (phoneNumber: string, otp: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/otp/verify', { phoneNumber, otp });
    return response.data;
  },

  // Get current user profile
  getProfile: async (): Promise<AuthResponse> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Logout
  logout: async () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  },
};

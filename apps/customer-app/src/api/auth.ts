import apiClient from './client';
import * as SecureStore from 'expo-secure-store';
import { AuthResponse, User } from '../types';

export const authApi = {
  // Request OTP for login (phone-based - kept for future use)
  requestOTP: async (phoneNumber: string) => {
    const response = await apiClient.post('/auth/otp/request', { phoneNumber });
    return response.data;
  },

  // Verify OTP and login (phone-based - kept for future use)
  verifyOTP: async (phoneNumber: string, code: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/otp/verify', { phoneNumber, code });
    
    if (response.data.success) {
      const { tokens, user } = response.data.data;
      await SecureStore.setItemAsync('accessToken', tokens.accessToken);
      await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
    }
    
    return response.data;
  },

  // Request Email OTP for login
  requestEmailOTP: async (email: string) => {
    const response = await apiClient.post('/auth/otp/email/request', { email });
    return response.data;
  },

  // Verify Email OTP and login
  verifyEmailOTP: async (email: string, code: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/otp/email/verify', { email, code });
    
    if (response.data.success) {
      const { tokens, user } = response.data.data;
      await SecureStore.setItemAsync('accessToken', tokens.accessToken);
      await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
    }
    
    return response.data;
  },

  // Get current user profile
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get('/users/profile');
    return response.data.data;
  },

  // Update profile
  updateProfile: async (data: Partial<User>) => {
    const response = await apiClient.put('/users/profile', data);
    return response.data;
  },

  // Complete registration for new users
  completeRegistration: async (data: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    city?: string;
    region?: string;
  }) => {
    const response = await apiClient.post('/auth/complete-registration', data);
    if (response.data?.data?.tokens?.accessToken) {
      await SecureStore.setItemAsync('accessToken', response.data.data.tokens.accessToken);
      if (response.data.data.tokens.refreshToken) {
        await SecureStore.setItemAsync('refreshToken', response.data.data.tokens.refreshToken);
      }
      await SecureStore.setItemAsync('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  // Logout
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Ignore logout errors
    }
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
  },

  // Get stored user
  getStoredUser: async (): Promise<User | null> => {
    const userStr = await SecureStore.getItemAsync('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Upload avatar image
  uploadAvatar: async (formData: FormData) => {
    const response = await apiClient.post('/users/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

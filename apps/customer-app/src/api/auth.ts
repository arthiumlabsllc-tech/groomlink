import apiClient from './client';
import * as SecureStore from 'expo-secure-store';
import { AuthResponse, User } from '../types';

export const authApi = {
  // Request OTP for login
  requestOTP: async (phoneNumber: string) => {
    const response = await apiClient.post('/auth/otp/request', { phoneNumber });
    return response.data;
  },

  // Verify OTP and login
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
};

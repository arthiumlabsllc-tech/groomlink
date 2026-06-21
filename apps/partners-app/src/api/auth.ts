import apiClient from './client';
import * as SecureStore from 'expo-secure-store';
import { AuthResponse, User } from '../types';

export const authApi = {
  // Request OTP for login (phone-based - legacy)
  requestOTP: async (phoneNumber: string) => {
    const response = await apiClient.post('/auth/otp/request', { phoneNumber });
    return response.data;
  },

  // Verify OTP and login (phone-based - legacy)
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
    const response = await apiClient.post('/auth/otp/email/request', { email, role: 'SALON_OWNER' });
    return response.data;
  },

  // Verify Email OTP and login
  verifyEmailOTP: async (email: string, code: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/otp/email/verify', { email, code, role: 'SALON_OWNER' });
    
    if (response.data.success) {
      const { tokens, user, isNewUser } = response.data.data;
      
      // For new users, tokens might be temporary or empty
      // Only store tokens if we have a valid access token
      if (tokens?.accessToken) {
        await SecureStore.setItemAsync('accessToken', tokens.accessToken);
        // Only store refresh token if it's non-empty (new users get empty string)
        if (tokens.refreshToken) {
          await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
        }
      }
      
      // Always store user data
      if (user) {
        await SecureStore.setItemAsync('user', JSON.stringify(user));
      }
      
      // Mark new user state so app doesn't clear tokens during registration flow
      if (isNewUser) {
        await SecureStore.setItemAsync('isNewUser', 'true');
      }
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
    await SecureStore.deleteItemAsync('isNewUser');
    await SecureStore.deleteItemAsync('registrationEmail');
  },

  // Get stored user
  getStoredUser: async (): Promise<User | null> => {
    const userStr = await SecureStore.getItemAsync('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Refresh auth state after salon setup completion
  // This fetches the updated profile and stores it
  refreshAuthAfterSalonSetup: async (): Promise<User> => {
    const profile = await authApi.getProfile();
    await SecureStore.setItemAsync('user', JSON.stringify(profile));
    return profile;
  },

  // Delete account (GDPR/Ghana DPA)
  deleteAccount: async (): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.delete('/users/account');
    if (response.data.success) {
      // Clear all stored data
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('user');
      await SecureStore.deleteItemAsync('isNewUser');
      await SecureStore.deleteItemAsync('registrationEmail');
    }
    return response.data;
  },

  // Complete registration for new users (sets profile and role)
  completeRegistration: async (data: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    role?: string;
  }) => {
    const response = await apiClient.post('/auth/complete-registration', data);
    if (response.data?.success) {
      const tokens = response.data?.data?.tokens;
      if (tokens?.accessToken) {
        await SecureStore.setItemAsync('accessToken', tokens.accessToken);
      }
      if (tokens?.refreshToken) {
        await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
      }
      if (response.data?.data?.user) {
        await SecureStore.setItemAsync('user', JSON.stringify(response.data.data.user));
      }
      // Always clear the new user flag after successful completeRegistration
      await SecureStore.deleteItemAsync('isNewUser');
      await SecureStore.deleteItemAsync('registrationEmail');
    }
    return response.data;
  },
};

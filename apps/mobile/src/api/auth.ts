import apiClient from './client';
import { User, AuthTokens } from '../types';

interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export const authApi = {
  requestOTP: async (phoneNumber: string): Promise<void> => {
    await apiClient.post('/auth/otp/request', { phoneNumber });
  },

  verifyOTP: async (phoneNumber: string, code: string): Promise<{ verified: boolean }> => {
    const response = await apiClient.post('/auth/otp/verify', { phoneNumber, code });
    return response.data.data;
  },

  register: async (data: {
    phoneNumber: string;
    firstName: string;
    lastName: string;
    email?: string;
    password?: string;
  }): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', data);
    return response.data.data;
  },

  login: async (data: {
    phoneNumber: string;
    password?: string;
  }): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/login', data);
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data.data;
  },
};

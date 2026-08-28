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
  role: 'ADMIN' | 'SUPER_ADMIN' | 'SUPPORT' | 'SALON_OWNER' | 'CUSTOMER';
  isVerified: boolean;
  permissions?: {
    pages: string[];
  } | null;
}

export interface EmailOTPRequest {
  email: string;
}

export interface EmailOTPVerify {
  email: string;
  code: string;
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

/** Admin login can complete immediately or require a 2FA step. */
export interface AdminLoginResponse {
  success: boolean;
  data:
    | { requiresTwoFactor: true; twoFactorToken: string }
    | {
        user: AdminUser;
        tokens: {
          accessToken: string;
          refreshToken: string;
        };
      };
}

export interface TwoFactorSetupResponse {
  secret: string;
  otpauthUrl: string;
  qrCode: string;
}

export const authApi = {
  // Login with phone and password
  login: async (phoneNumber: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', { phoneNumber, password });
    return response.data;
  },

  // Admin login step 1: email + password
  adminLogin: async (email: string, password: string): Promise<AdminLoginResponse> => {
    const response = await apiClient.post('/auth/admin/login', { email, password });
    return response.data;
  },

  // Admin login step 2: TOTP / backup code
  verifyAdmin2FA: async (twoFactorToken: string, code: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/admin/2fa/verify', { twoFactorToken, code });
    return response.data;
  },

  // 2FA status for the signed-in admin
  getTwoFactorStatus: async (): Promise<{ enabled: boolean; backupCodesRemaining: number }> => {
    const response = await apiClient.get('/auth/admin/2fa/status');
    return response.data.data;
  },

  // Begin 2FA enrollment (secret + QR)
  setupTwoFactor: async (): Promise<TwoFactorSetupResponse> => {
    const response = await apiClient.post('/auth/admin/2fa/setup');
    return response.data.data;
  },

  // Confirm enrollment with an authenticator code
  enableTwoFactor: async (code: string): Promise<{ backupCodes: string[] }> => {
    const response = await apiClient.post('/auth/admin/2fa/enable', { code });
    return response.data.data;
  },

  // Disable 2FA (requires current code)
  disableTwoFactor: async (code: string): Promise<void> => {
    await apiClient.post('/auth/admin/2fa/disable', { code });
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

  // Request Email OTP for admin login
  requestEmailOTP: async (email: string) => {
    const response = await apiClient.post('/auth/otp/email/request', { email });
    return response.data;
  },

  // Verify Email OTP and login
  verifyEmailOTP: async (email: string, code: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/otp/email/verify', { email, code });
    return response.data;
  },

  // Refresh token
  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  // Get current user profile
  getProfile: async () => {
    const response = await apiClient.get('/users/profile');
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

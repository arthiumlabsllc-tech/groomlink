import apiClient from './client';

export interface SiteSettings {
  siteName: string;
  email: string;
  phoneNumber: string;
  address: string;
  logoUrl: string | null;
  maintenanceMode: boolean;
  maintenanceMsg: string | null;
}

export interface MaintenanceSettings {
  enabled: boolean;
  message: string | null;
}

export interface PaymentSettings {
  paymentGateway: string;
  hubtelApiId: string | null;
  hubtelApiSecret: string | null;
  hubtelMerchantAccountId: string | null;
  paystackPublicKey: string | null;
  paystackSecretKey: string | null;
  isPaymentTestMode: boolean;
  transactionFeePercent: number | null;
}

export interface AdminSystemHealth {
  api: {
    status: 'healthy' | 'degraded' | 'down';
    uptime: number;
  };
  database: {
    status: 'connected' | 'disconnected';
    latency: number;
  };
  redis: {
    status: 'connected' | 'disconnected';
    latency: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  counts: {
    users: number;
    salons: number;
    bookings: number;
  };
  sessions: {
    active24h: number;
  };
  security: {
    suspiciousActivitiesLastHour: number;
  };
}

export const settingsApi = {
  // Get site settings
  getSettings: async (): Promise<SiteSettings> => {
    const response = await apiClient.get('/admin/settings');
    return response.data.data;
  },

  // Update site settings
  updateSettings: async (data: Partial<SiteSettings>): Promise<SiteSettings> => {
    const response = await apiClient.put('/admin/settings', data);
    return response.data.data;
  },

  // Toggle maintenance mode
  toggleMaintenance: async (data: MaintenanceSettings): Promise<MaintenanceSettings> => {
    const response = await apiClient.post('/admin/settings/maintenance', data);
    return response.data.data;
  },

  // Get system health
  getHealth: async (): Promise<AdminSystemHealth> => {
    const response = await apiClient.get('/admin/health');
    return response.data.data;
  },

  // Get payment settings
  getPaymentSettings: async (): Promise<PaymentSettings> => {
    const response = await apiClient.get('/admin/payment-settings');
    return response.data.data;
  },

  // Update payment settings
  updatePaymentSettings: async (data: Partial<PaymentSettings>): Promise<PaymentSettings> => {
    const response = await apiClient.put('/admin/payment-settings', data);
    return response.data.data;
  },
};

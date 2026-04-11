import apiClient from './client';

export interface SiteSettings {
  siteName: string;
  contactEmail: string;
  phoneNumber: string;
  address: string;
  logoUrl: string | null;
}

export interface MaintenanceSettings {
  enabled: boolean;
  message: string | null;
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
};

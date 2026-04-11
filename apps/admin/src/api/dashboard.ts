import apiClient from './client';

export interface DashboardStats {
  totalUsers: number;
  totalSalons: number;
  totalBookings: number;
  totalPayments: number;
  bookingsLast24h: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  stats: DashboardStats;
}

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface BookingChartData {
  labels: string[];
  bookings: number[];
}

export interface RevenueChartData {
  labels: string[];
  revenue: number[];
}

export interface UserGrowthData {
  labels: string[];
  users: number[];
}

export const dashboardApi = {
  // Get system health and basic stats
  getHealth: async (): Promise<SystemHealth> => {
    const response = await apiClient.get('/admin/health');
    return response.data.data;
  },

  // Get system metrics for charts
  getMetrics: async (days: number = 30) => {
    const response = await apiClient.get('/admin/metrics', {
      params: { days },
    });
    return response.data.data;
  },

  // Get booking statistics
  getBookingStats: async (period: string = '30d') => {
    const response = await apiClient.get('/admin/bookings/stats', {
      params: { period },
    });
    return response.data.data;
  },

  // Get revenue statistics
  getRevenueStats: async (period: string = '30d') => {
    const response = await apiClient.get('/admin/revenue/stats', {
      params: { period },
    });
    return response.data.data;
  },

  // Get recent activities
  getRecentActivities: async (limit: number = 5) => {
    const response = await apiClient.get('/admin/activities', { params: { limit } });
    return response.data.data;
  },
};

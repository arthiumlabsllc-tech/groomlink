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

// New system monitoring interfaces
export interface ApiStatus {
  status: 'healthy';
  uptime: number;
  version: string;
}

export interface DatabaseStatus {
  status: 'connected' | 'disconnected';
  responseTimeMs: number;
  poolSize?: number;
  totalQueries?: number;
  slowQueries?: number;
  slowQueryPercentage?: string;
}

export interface RedisStatus {
  status: 'connected' | 'disconnected';
  responseTimeMs: number;
  memoryUsage: string;
}

export interface MemoryStatus {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
}

export interface ActiveSessions {
  count: number;
  socketConnections: number;
}

export interface SuspiciousActivity {
  recentFailedLogins: number;
}

export interface SystemMonitoringData {
  api: ApiStatus;
  database: DatabaseStatus;
  redis: RedisStatus;
  memory: MemoryStatus;
  activeSessions: ActiveSessions;
  suspiciousActivity: SuspiciousActivity;
  timestamp: string;
}

export interface ComprehensiveRevenueStats {
  totalRevenue: number;
  totalTransactions: number;
  platformFeesEarned: number;
  pendingPayouts: number;
  completedPayouts: number;
  refundedAmount: number;
  refundedCount: number;
  recentRevenue30d: number;
  recentTransactions30d: number;
}

export interface HubtelBalance {
  currency: string;
  balance: number;
  rawBalance: number;
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

  // Get detailed system monitoring data
  getSystemMonitoring: async (): Promise<SystemMonitoringData> => {
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

  // Get comprehensive revenue stats
  getComprehensiveRevenueStats: async (): Promise<ComprehensiveRevenueStats> => {
    const response = await apiClient.get('/admin/revenue/comprehensive');
    return response.data.data;
  },

  // Get Hubtel balance
  getHubtelBalance: async (): Promise<{ balances: HubtelBalance[]; fetchedAt: string }> => {
    const response = await apiClient.get('/admin/hubtel-balance');
    return response.data.data;
  },
};

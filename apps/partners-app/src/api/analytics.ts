import apiClient from './client';

export interface EarningsSummary {
  totalEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  totalBookings: number;
  completedBookings: number;
  completionRate: number;
  averageBookingValue: number;
}

export interface TopService {
  id: string;
  name: string;
  bookingCount: number;
  revenue: number;
}

export interface DailyEarning {
  date: string;
  earnings: number;
  bookings: number;
}

export interface AnalyticsResponse {
  summary: EarningsSummary;
  topServices: TopService[];
  dailyEarnings: DailyEarning[];
  period: {
    start: string;
    end: string;
  };
}

export const analyticsApi = {
  /**
   * Get earnings summary — aggregates from existing salon stats + payout balance endpoints.
   * Uses GET /salons/:id/stats and GET /salons/:id/payout-balance.
   */
  getEarningsSummary: async (salonId: string): Promise<EarningsSummary> => {
    const [statsRes, payoutRes] = await Promise.all([
      apiClient.get(`/salons/${salonId}/stats`),
      apiClient.get(`/salons/${salonId}/payout-balance`),
    ]);

    const stats = statsRes.data?.data || {};
    const payout = payoutRes.data?.data || {};

    const totalEarnings = payout.totalRevenue || stats.totalRevenue || 0;
    const totalBookings = stats.totalBookings || 0;
    const completedBookings = stats.completedBookings || 0;
    const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
    const averageBookingValue = totalBookings > 0 ? totalEarnings / totalBookings : 0;

    return {
      totalEarnings,
      weeklyEarnings: payout.thisWeekEarnings || 0,
      monthlyEarnings: payout.thisMonthEarnings || 0,
      totalBookings,
      completedBookings,
      completionRate,
      averageBookingValue,
    };
  },

  /**
   * Get booking analytics for a period to derive top services and daily earnings.
   * Uses GET /bookings/salon/:id with a high limit.
   */
  getBookingAnalytics: async (salonId: string, days = 30): Promise<{
    topServices: TopService[];
    dailyEarnings: DailyEarning[];
  }> => {
    const response = await apiClient.get(`/bookings/salon/${salonId}`, {
      params: { page: 1, limit: 200 },
    });

    const bookings = response.data?.data || [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const filtered = bookings.filter((b: any) => {
      const d = new Date(b.date);
      return d >= cutoff && b.status === 'COMPLETED';
    });

    // Aggregate top services
    const serviceMap: Record<string, { id: string; name: string; bookingCount: number; revenue: number }> = {};
    const dailyMap: Record<string, { earnings: number; bookings: number }> = {};

    filtered.forEach((b: any) => {
      const svc = b.service;
      if (svc) {
        if (!serviceMap[svc.id]) {
          serviceMap[svc.id] = { id: svc.id, name: svc.name, bookingCount: 0, revenue: 0 };
        }
        serviceMap[svc.id].bookingCount += 1;
        serviceMap[svc.id].revenue += parseFloat(String(b.totalAmount || b.finalAmount || 0));
      }

      const dateStr = b.date?.split('T')[0] || '';
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { earnings: 0, bookings: 0 };
      }
      dailyMap[dateStr].earnings += parseFloat(String(b.totalAmount || b.finalAmount || 0));
      dailyMap[dateStr].bookings += 1;
    });

    const topServices = Object.values(serviceMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const dailyEarnings = Object.entries(dailyMap)
      .map(([date, v]) => ({ date, earnings: v.earnings, bookings: v.bookings }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { topServices, dailyEarnings };
  },

  /**
   * Get payout history for earnings tracking
   */
  getPayoutHistory: async (salonId: string, page = 1, limit = 50) => {
    const response = await apiClient.get(`/salons/${salonId}/payout-history`, {
      params: { page, limit },
    });
    return response.data?.data;
  },
};

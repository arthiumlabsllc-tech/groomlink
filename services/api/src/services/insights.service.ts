import prisma from '../config/database';
import logger from '../config/logger';
import { PaymentStatus, BookingStatus } from '@prisma/client';

export interface PeakHourData {
  dayOfWeek: number;
  dayName: string;
  hour: number;
  bookingCount: number;
}

export interface PeakHoursResult {
  peakHours: PeakHourData[];
  byDayOfWeek: Record<number, { dayName: string; hours: { hour: number; count: number }[] }>;
}

export interface PricingInsight {
  serviceId: string;
  serviceName: string;
  category: string;
  yourPrice: number;
  cityAverage: number;
  difference: number;
  percentile: number;
}

export interface PricingInsightsResult {
  insights: PricingInsight[];
  summary: {
    aboveAverage: number;
    belowAverage: number;
    atAverage: number;
  };
}

export interface StaffPerformance {
  staffId: string;
  fullName: string;
  avatar: string | null;
  bookingCount: number;
  totalRevenue: number;
  averageRating: number;
  completionRate: number;
}

export interface StaffPerformanceResult {
  staff: StaffPerformance[];
  summary: {
    totalBookings: number;
    totalRevenue: number;
    averageRating: number;
  };
}

export interface LoyaltyMetrics {
  repeatCustomerRate: number;
  totalUniqueCustomers: number;
  repeatCustomers: number;
  atRiskCustomers: {
    customerId: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    lastVisitDate: Date;
    daysSinceVisit: number;
    totalBookings: number;
  }[];
  topCustomers: {
    customerId: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    bookingCount: number;
    totalSpent: number;
  }[];
}

export interface RevenueDataPoint {
  period: string;
  revenue: number;
  bookingCount: number;
}

export interface RevenueResult {
  period: 'daily' | 'weekly' | 'monthly';
  data: RevenueDataPoint[];
  summary: {
    totalRevenue: number;
    totalBookings: number;
    averageRevenue: number;
  };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Get peak hours analytics - bookings grouped by day-of-week and hour
 */
export async function getPeakHours(salonId: string): Promise<PeakHoursResult> {
  try {
    // Get all bookings for the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const bookings = await prisma.booking.findMany({
      where: {
        salonId,
        createdAt: { gte: ninetyDaysAgo },
        status: { not: BookingStatus.CANCELLED },
      },
      select: {
        date: true,
        startTime: true,
      },
    });

    // Group by day of week and hour
    const hourCounts: Record<string, number> = {};
    const byDayOfWeek: Record<number, { dayName: string; hours: Record<number, number> }> = {};

    // Initialize structure for all days
    for (let day = 0; day < 7; day++) {
      byDayOfWeek[day] = { dayName: DAY_NAMES[day], hours: {} };
    }

    bookings.forEach((booking) => {
      const date = new Date(booking.date);
      const dayOfWeek = date.getDay();
      const hour = parseInt(booking.startTime.split(':')[0], 10);
      const key = `${dayOfWeek}-${hour}`;

      hourCounts[key] = (hourCounts[key] || 0) + 1;
      byDayOfWeek[dayOfWeek].hours[hour] = (byDayOfWeek[dayOfWeek].hours[hour] || 0) + 1;
    });

    // Convert to sorted array of peak hours
    const peakHours: PeakHourData[] = Object.entries(hourCounts)
      .map(([key, count]) => {
        const [dayOfWeek, hour] = key.split('-').map(Number);
        return {
          dayOfWeek,
          dayName: DAY_NAMES[dayOfWeek],
          hour,
          bookingCount: count,
        };
      })
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 20); // Top 20 busiest periods

    // Format byDayOfWeek for response
    const formattedByDayOfWeek: Record<number, { dayName: string; hours: { hour: number; count: number }[] }> = {};
    for (let day = 0; day < 7; day++) {
      const hours = Object.entries(byDayOfWeek[day].hours)
        .map(([hour, count]) => ({ hour: parseInt(hour, 10), count }))
        .sort((a, b) => a.hour - b.hour);
      formattedByDayOfWeek[day] = {
        dayName: DAY_NAMES[day],
        hours,
      };
    }

    return {
      peakHours,
      byDayOfWeek: formattedByDayOfWeek,
    };
  } catch (error) {
    logger.error('Error getting peak hours:', error);
    throw error;
  }
}

/**
 * Get pricing insights - compare salon's prices with city average
 */
export async function getPricingInsights(salonId: string): Promise<PricingInsightsResult> {
  try {
    // Get the salon's city
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { city: true },
    });

    if (!salon) {
      throw new Error('Salon not found');
    }

    // Get salon's services
    const myServices = await prisma.service.findMany({
      where: { salonId, isActive: true },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
      },
    });

    // Get average prices for same categories in the same city
    const cityServices = await prisma.service.findMany({
      where: {
        salon: { city: salon.city },
        salonId: { not: salonId },
        isActive: true,
      },
      select: {
        category: true,
        price: true,
      },
    });

    // Calculate city averages by category
    const categoryPrices: Record<string, number[]> = {};
    cityServices.forEach((service) => {
      const price = parseFloat(service.price.toString());
      if (!categoryPrices[service.category]) {
        categoryPrices[service.category] = [];
      }
      categoryPrices[service.category].push(price);
    });

    const cityAverages: Record<string, number> = {};
    Object.entries(categoryPrices).forEach(([category, prices]) => {
      cityAverages[category] = prices.reduce((a, b) => a + b, 0) / prices.length;
    });

    // Build insights for each service
    const insights: PricingInsight[] = myServices.map((service) => {
      const myPrice = parseFloat(service.price.toString());
      const cityAvg = cityAverages[service.category] || myPrice;
      const difference = myPrice - cityAvg;

      // Calculate percentile (what % of salons charge less than this price)
      const categoryPricesList = categoryPrices[service.category] || [];
      const lowerPrices = categoryPricesList.filter((p) => p < myPrice).length;
      const percentile = categoryPricesList.length > 0
        ? Math.round((lowerPrices / categoryPricesList.length) * 100)
        : 50;

      return {
        serviceId: service.id,
        serviceName: service.name,
        category: service.category,
        yourPrice: myPrice,
        cityAverage: Math.round(cityAvg * 100) / 100,
        difference: Math.round(difference * 100) / 100,
        percentile,
      };
    });

    const summary = {
      aboveAverage: insights.filter((i) => i.difference > 0).length,
      belowAverage: insights.filter((i) => i.difference < 0).length,
      atAverage: insights.filter((i) => i.difference === 0).length,
    };

    return {
      insights,
      summary,
    };
  } catch (error) {
    logger.error('Error getting pricing insights:', error);
    throw error;
  }
}

/**
 * Get staff performance metrics
 */
export async function getStaffPerformance(salonId: string): Promise<StaffPerformanceResult> {
  try {
    const staff = await prisma.worker.findMany({
      where: { salonId, isActive: true },
      select: {
        id: true,
        fullName: true,
        avatar: true,
      },
    });

    const staffPerformance: StaffPerformance[] = await Promise.all(
      staff.map(async (worker) => {
        // Get bookings for this worker
        const bookings = await prisma.booking.findMany({
          where: {
            workerId: worker.id,
            status: { not: BookingStatus.CANCELLED },
          },
          select: {
            id: true,
            status: true,
            finalAmount: true,
          },
        });

        // Get reviews for this worker
        const reviews = await prisma.review.findMany({
          where: { workerId: worker.id },
          select: { rating: true },
        });

        const bookingCount = bookings.length;
        const completedBookings = bookings.filter((b) => b.status === BookingStatus.COMPLETED).length;
        const totalRevenue = bookings.reduce(
          (sum, b) => sum + parseFloat(b.finalAmount.toString()),
          0
        );
        const averageRating = reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;
        const completionRate = bookingCount > 0 ? (completedBookings / bookingCount) * 100 : 0;

        return {
          staffId: worker.id,
          fullName: worker.fullName,
          avatar: worker.avatar,
          bookingCount,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          averageRating: Math.round(averageRating * 10) / 10,
          completionRate: Math.round(completionRate * 10) / 10,
        };
      })
    );

    // Sort by booking count (descending)
    staffPerformance.sort((a, b) => b.bookingCount - a.bookingCount);

    const summary = {
      totalBookings: staffPerformance.reduce((sum, s) => sum + s.bookingCount, 0),
      totalRevenue: Math.round(
        staffPerformance.reduce((sum, s) => sum + s.totalRevenue, 0) * 100
      ) / 100,
      averageRating:
        staffPerformance.length > 0
          ? Math.round(
              (staffPerformance.reduce((sum, s) => sum + s.averageRating, 0) /
                staffPerformance.length) *
                10
            ) / 10
          : 0,
    };

    return {
      staff: staffPerformance,
      summary,
    };
  } catch (error) {
    logger.error('Error getting staff performance:', error);
    throw error;
  }
}

/**
 * Get loyalty metrics - repeat customers and at-risk customers
 */
export async function getLoyaltyMetrics(salonId: string): Promise<LoyaltyMetrics> {
  try {
    // Get all customers with their booking counts and last visit
    const customerBookings = await prisma.booking.groupBy({
      by: ['customerId'],
      where: {
        salonId,
        status: { not: BookingStatus.CANCELLED },
      },
      _count: { id: true },
      _max: { date: true },
    });

    // Get customer details and total spent
    const customerDetails = await Promise.all(
      customerBookings.map(async (cb) => {
        const customer = await prisma.user.findUnique({
          where: { id: cb.customerId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        });

        const totalSpent = await prisma.payment.aggregate({
          where: {
            booking: { salonId, customerId: cb.customerId },
            status: PaymentStatus.SUCCESS,
          },
          _sum: { amount: true },
        });

        return {
          customerId: cb.customerId,
          firstName: customer?.firstName || '',
          lastName: customer?.lastName || '',
          phoneNumber: customer?.phoneNumber || null,
          bookingCount: cb._count.id,
          lastVisitDate: cb._max.date,
          totalSpent: parseFloat(totalSpent._sum.amount?.toString() || '0'),
        };
      })
    );

    // Calculate repeat customer rate (customers with 2+ bookings)
    const repeatCustomers = customerDetails.filter((c) => c.bookingCount >= 2);
    const repeatCustomerRate = customerDetails.length > 0
      ? (repeatCustomers.length / customerDetails.length) * 100
      : 0;

    // Find at-risk customers (last visit > 30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const atRiskCustomers = customerDetails
      .filter((c) => c.lastVisitDate && new Date(c.lastVisitDate) < thirtyDaysAgo)
      .map((c) => ({
        customerId: c.customerId,
        firstName: c.firstName,
        lastName: c.lastName,
        phoneNumber: c.phoneNumber,
        lastVisitDate: c.lastVisitDate!,
        daysSinceVisit: Math.floor(
          (Date.now() - new Date(c.lastVisitDate!).getTime()) / (1000 * 60 * 60 * 24)
        ),
        totalBookings: c.bookingCount,
      }))
      .sort((a, b) => b.daysSinceVisit - a.daysSinceVisit);

    // Get top customers by booking count
    const topCustomers = customerDetails
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 10)
      .map((c) => ({
        customerId: c.customerId,
        firstName: c.firstName,
        lastName: c.lastName,
        phoneNumber: c.phoneNumber,
        bookingCount: c.bookingCount,
        totalSpent: c.totalSpent,
      }));

    return {
      repeatCustomerRate: Math.round(repeatCustomerRate * 10) / 10,
      totalUniqueCustomers: customerDetails.length,
      repeatCustomers: repeatCustomers.length,
      atRiskCustomers,
      topCustomers,
    };
  } catch (error) {
    logger.error('Error getting loyalty metrics:', error);
    throw error;
  }
}

/**
 * Get revenue aggregated by period for charts
 */
export async function getRevenue(
  salonId: string,
  period: 'daily' | 'weekly' | 'monthly'
): Promise<RevenueResult> {
  try {
    // Determine date range based on period
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 30); // Last 30 days
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 84); // Last 12 weeks
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 12); // Last 12 months
        break;
    }

    // Get payments with booking dates
    const payments = await prisma.payment.findMany({
      where: {
        booking: { salonId },
        status: PaymentStatus.SUCCESS,
        completedAt: { gte: startDate, lte: endDate },
      },
      select: {
        amount: true,
        completedAt: true,
        booking: {
          select: {
            id: true,
          },
        },
      },
    });

    // Group by period
    const revenueMap: Record<string, { revenue: number; bookings: Set<string> }> = {};

    payments.forEach((payment) => {
      const date = new Date(payment.completedAt!);
      let periodKey: string;

      switch (period) {
        case 'daily':
          periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'weekly': {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        }
        case 'monthly':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (!revenueMap[periodKey]) {
        revenueMap[periodKey] = { revenue: 0, bookings: new Set() };
      }

      revenueMap[periodKey].revenue += parseFloat(payment.amount.toString());
      revenueMap[periodKey].bookings.add(payment.booking.id);
    });

    // Fill in missing periods with zero values
    const data: RevenueDataPoint[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      let periodKey: string;

      switch (period) {
        case 'daily':
          periodKey = current.toISOString().split('T')[0];
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly': {
          const weekStart = new Date(current);
          weekStart.setDate(current.getDate() - current.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
          current.setDate(current.getDate() + 7);
          break;
        }
        case 'monthly':
          periodKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
          current.setMonth(current.getMonth() + 1);
          break;
      }

      const periodData = revenueMap[periodKey] || { revenue: 0, bookings: new Set() };
      data.push({
        period: periodKey,
        revenue: Math.round(periodData.revenue * 100) / 100,
        bookingCount: periodData.bookings.size,
      });
    }

    // Sort by period
    data.sort((a, b) => a.period.localeCompare(b.period));

    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const totalBookings = data.reduce((sum, d) => sum + d.bookingCount, 0);

    return {
      period,
      data,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalBookings,
        averageRevenue: data.length > 0 ? Math.round((totalRevenue / data.length) * 100) / 100 : 0,
      },
    };
  } catch (error) {
    logger.error('Error getting revenue:', error);
    throw error;
  }
}

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api';

const DASHBOARD_KEY = 'dashboard';

export function useDashboardStats() {
  return useQuery({
    queryKey: [DASHBOARD_KEY, 'stats'],
    queryFn: () => dashboardApi.getHealth(),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useDashboardMetrics(days: number = 30) {
  return useQuery({
    queryKey: [DASHBOARD_KEY, 'metrics', days],
    queryFn: () => dashboardApi.getMetrics(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBookingStats(period: string = '30d') {
  return useQuery({
    queryKey: [DASHBOARD_KEY, 'bookings', period],
    queryFn: () => dashboardApi.getBookingStats(period),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRevenueStats(period: string = '30d') {
  return useQuery({
    queryKey: [DASHBOARD_KEY, 'revenue', period],
    queryFn: () => dashboardApi.getRevenueStats(period),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecentActivities(limit: number = 5) {
  return useQuery({
    queryKey: [DASHBOARD_KEY, 'activities', limit],
    queryFn: () => dashboardApi.getRecentActivities(limit),
    staleTime: 60 * 1000,
  });
}

export function useComprehensiveRevenueStats() {
  return useQuery({
    queryKey: [DASHBOARD_KEY, 'revenue', 'comprehensive'],
    queryFn: () => dashboardApi.getComprehensiveRevenueStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePaystackBalance() {
  return useQuery({
    queryKey: [DASHBOARD_KEY, 'paystack', 'balance'],
    queryFn: () => dashboardApi.getPaystackBalance(),
    staleTime: 60 * 1000, // 1 minute
  });
}

import apiClient from './client';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  platformFeePercent: number;
  maxStaff: number;
  maxLocations: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  salonId: string;
  planId: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
  salon: {
    id: string;
    businessName: string;
    email: string | null;
    phoneNumber: string;
  };
  plan: SubscriptionPlan;
}

export interface SubscriptionOverviewStats {
  totalSubscribers: number;
  revenueThisMonth: number;
  activePro: number;
  activePremium: number;
  expiringSoon: number;
  subscribersByTier: {
    free: number;
    pro: number;
    premium: number;
  };
}

export interface RecentSubscription {
  id: string;
  salonName: string;
  planName: string;
  status: string;
  changedAt: string;
}

export interface ExpiringSubscription {
  id: string;
  salonId: string;
  salonName: string;
  planName: string;
  expiryDate: string;
  daysRemaining: number;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  salonId: string;
  salonName: string;
  planName: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'FAILED';
  paymentReference: string | null;
  paymentMethod: string | null;
  paidAt: string | null;
  createdAt: string;
  periodStart: string;
  periodEnd: string;
}

export interface PaginatedInvoices {
  data: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedSubscriptions {
  data: Subscription[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdatePlanData {
  name?: string;
  description?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  platformFeePercent?: number;
  maxStaff?: number;
  maxLocations?: number;
  features?: string[];
  isActive?: boolean;
}

export interface CreatePlanData {
  name: string;
  slug: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  platformFeePercent: number;
  maxStaff: number;
  maxLocations: number;
  features?: string[];
}

export interface AssignPlanData {
  salonId: string;
  planSlug: string;
}

export const subscriptionApi = {
  // Get subscription overview stats
  getOverview: async (): Promise<SubscriptionOverviewStats> => {
    const response = await apiClient.get('/admin/subscriptions/overview');
    return response.data.data;
  },

  // Get all subscriptions with pagination
  getAll: async (page: number = 1, limit: number = 20, status?: string): Promise<PaginatedSubscriptions> => {
    const response = await apiClient.get('/admin/subscriptions', {
      params: { page, limit, status },
    });
    return response.data;
  },

  // Get subscription plans (admin endpoint returns all plans incl. inactive)
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const response = await apiClient.get('/admin/subscriptions/plans');
    return response.data.data;
  },

  // Update a plan
  updatePlan: async (planId: string, data: UpdatePlanData): Promise<SubscriptionPlan> => {
    const response = await apiClient.put(`/admin/subscriptions/plans/${planId}`, data);
    return response.data.data;
  },

  // Create a new plan
  createPlan: async (data: CreatePlanData): Promise<SubscriptionPlan> => {
    const response = await apiClient.post('/admin/subscriptions/plans', data);
    return response.data.data;
  },

  // Assign plan to salon
  assignPlan: async (data: AssignPlanData): Promise<Subscription> => {
    const response = await apiClient.post('/admin/subscriptions/assign', data);
    return response.data.data;
  },

  // Get all invoices
  getInvoices: async (
    page: number = 1,
    limit: number = 20,
    status?: string,
    startDate?: string,
    endDate?: string,
    planSlug?: string
  ): Promise<PaginatedInvoices> => {
    const response = await apiClient.get('/admin/subscriptions/invoices', {
      params: { page, limit, status, startDate, endDate, planSlug },
    });
    return response.data;
  },

  // Get recent subscriptions (last 10 changes)
  getRecent: async (): Promise<RecentSubscription[]> => {
    const response = await apiClient.get('/admin/subscriptions/recent');
    return response.data.data;
  },

  // Get expiring soon subscriptions (next 7 days)
  getExpiringSoon: async (): Promise<ExpiringSubscription[]> => {
    const response = await apiClient.get('/admin/subscriptions/expiring-soon');
    return response.data.data;
  },

  // Get salon subscription details
  getSalonSubscription: async (salonId: string): Promise<Subscription | null> => {
    const response = await apiClient.get(`/admin/subscriptions/salon/${salonId}`);
    return response.data.data;
  },

  // Extend salon subscription
  extendSubscription: async (salonId: string, days: number): Promise<Subscription> => {
    const response = await apiClient.post(`/admin/subscriptions/salon/${salonId}/extend`, { days });
    return response.data.data;
  },

  // Get salon invoices
  getSalonInvoices: async (salonId: string): Promise<Invoice[]> => {
    const response = await apiClient.get(`/admin/subscriptions/salon/${salonId}/invoices`);
    return response.data.data;
  },
};

import apiClient from './client';

export interface PlanFeature {
  name: string;
  included: boolean;
}

export interface Plan {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  // API price fields — Prisma Decimal columns serialize as strings in JSON
  priceMonthlyGhs?: number | string | null;
  priceYearlyGhs?: number | string | null;
  // Legacy aliases some callers may still send
  monthlyPrice?: number | string | null;
  yearlyPrice?: number | string | null;
  maxStaff: number;
  maxLocations: number;
  // The API returns `features` as a map ({ instant_payouts: true, ... })
  // and a pre-formatted `feature_list` array for UI display.
  features?: Record<string, boolean> | string[];
  feature_list?: PlanFeature[];
  isPopular?: boolean;
}

export interface SubscriptionStatus {
  id: string;
  plan: Plan;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
  billingPeriod: 'MONTHLY' | 'YEARLY';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
}

export interface FeatureCheckResponse {
  hasFeature: boolean;
  feature: string;
  currentPlan: string;
}

export interface SubscribeResponse {
  paymentUrl: string;
  subscriptionId: string;
}

export const subscriptionApi = {
  // Get current subscription status
  getCurrentPlan: async (): Promise<SubscriptionStatus | null> => {
    try {
      const response = await apiClient.get('/subscription/status');
      return response.data.data;
    } catch (error) {
      return null;
    }
  },

  // Get all available plans
  getPlans: async (): Promise<Plan[]> => {
    const response = await apiClient.get('/subscription/plans');
    return response.data.data;
  },

  // Upgrade to a new plan
  upgradeToPlan: async (planSlug: string, billingPeriod: 'MONTHLY' | 'YEARLY'): Promise<SubscribeResponse> => {
    const response = await apiClient.post('/subscription/subscribe', {
      planSlug,
      billingPeriod,
    });
    return response.data.data;
  },

  // Cancel subscription
  cancelSubscription: async (cancelImmediately = false): Promise<void> => {
    await apiClient.post('/subscription/cancel', {
      cancelImmediately,
    });
  },

  // Check if a feature is available
  checkFeature: async (feature: string): Promise<FeatureCheckResponse> => {
    const response = await apiClient.get('/subscription/check-feature', {
      params: { feature },
    });
    return response.data.data;
  },
};

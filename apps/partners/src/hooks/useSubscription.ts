/**
 * Subscription API hooks for partners dashboard
 * Uses the existing api client pattern from lib/api
 */
import { useState, useEffect, useCallback } from 'react';
import { api, API_BASE_URL } from '../lib/api';

// Types
export interface PlanFeature {
  name: string;
  included: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  priceMonthlyGhs: number;
  priceYearlyGhs: number | null;
  transactionFeePercentage: number;
  maxStaff: number;
  maxLocations: number;
  features: Record<string, boolean>;
  feature_list: PlanFeature[];
  isActive: boolean;
  sortOrder: number;
}

export interface SubscriptionStatus {
  plan: {
    name: string;
    slug: string;
    maxStaff: number;
    maxLocations: number;
  };
  status: string;
  expires_at: string | null;
  features: Record<string, boolean>;
  usage_stats: Record<string, { used: number; limit: number | null }>;
  cancel_at_period_end: boolean;
}

export interface FeatureCheckResult {
  hasFeature: boolean;
}

export interface SubscribeResult {
  subscriptionId: string;
  paymentReference: string;
  checkoutUrl?: string;
  amount: number;
  message: string;
}

export interface CancelResult {
  message: string;
}

/**
 * Fetch all active subscription plans
 */
export function usePlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.request<{ success: boolean; data: SubscriptionPlan[] }>('/subscription/plans');
      if (response.success && response.data) {
        setPlans(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return { plans, loading, error, refetch: fetchPlans };
}

/**
 * Fetch current subscription status for the authenticated salon
 */
export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.request<{ success: boolean; data: SubscriptionStatus }>('/subscription/status');
      if (response.success && response.data) {
        setSubscription(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch subscription status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { subscription, loading, error, refetch: fetchStatus };
}

/**
 * Check if the salon has access to a specific feature
 */
export function useFeatureCheck(feature: string) {
  const [hasFeature, setHasFeature] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkFeature = useCallback(async () => {
    if (!feature) return;
    try {
      setLoading(true);
      setError(null);
      const response = await api.request<{ success: boolean; data: FeatureCheckResult }>(
        `/subscription/check-feature?feature=${encodeURIComponent(feature)}`
      );
      if (response.success && response.data) {
        setHasFeature(response.data.hasFeature);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check feature');
      setHasFeature(false);
    } finally {
      setLoading(false);
    }
  }, [feature]);

  useEffect(() => {
    checkFeature();
  }, [checkFeature]);

  return { hasFeature, loading, error, recheck: checkFeature };
}

/**
 * Subscribe to a plan — returns checkout URL for payment
 */
export async function subscribeToPlan(
  planSlug: string,
  billingPeriod: 'MONTHLY' | 'YEARLY'
): Promise<SubscribeResult> {
  const response = await api.request<{ success: boolean; data: SubscribeResult }>('/subscription/subscribe', {
    method: 'POST',
    body: JSON.stringify({ planSlug, billingPeriod }),
  });
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error('Failed to subscribe');
}

/**
 * Cancel the current subscription
 */
export async function cancelSubscription(cancelImmediately: boolean = false): Promise<CancelResult> {
  const response = await api.request<{ success: boolean; data: CancelResult }>('/subscription/cancel', {
    method: 'POST',
    body: JSON.stringify({ cancelImmediately }),
  });
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error('Failed to cancel subscription');
}

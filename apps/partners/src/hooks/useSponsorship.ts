/**
 * Sponsorship API hooks for partners dashboard
 * Uses the existing api client pattern from lib/api
 */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

// Types
export interface SponsorshipPackage {
  id: string;
  packageName: string;
  durationType: string; // 'hours', 'days', 'months', 'years'
  durationValue: number;
  priceGhs: number;
  priorityLevel: number;
  isActive: boolean;
}

export interface SponsoredSalonOrder {
  id: string;
  salonId: string;
  durationHours: number;
  startTime: string;
  endTime: string;
  amountPaid: number | null;
  paymentStatus: string; // 'pending' | 'paid' | 'expired'
  paymentReference: string | null;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

export interface SponsorshipStatus {
  active: SponsoredSalonOrder | null;
  pending: SponsoredSalonOrder | null;
  history: SponsoredSalonOrder[];
}

export interface PurchaseResult {
  sponsoredSalonId: string;
  paymentReference: string;
  checkoutUrl?: string;
  amount: number;
  message: string;
}

/**
 * Fetch all active sponsorship packages
 */
export function useSponsorshipPackages() {
  const [packages, setPackages] = useState<SponsorshipPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.request<{ success: boolean; data: SponsorshipPackage[] }>('/sponsorship/packages');
      if (response.success && response.data) {
        setPackages(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sponsorship packages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  return { packages, loading, error, refetch: fetchPackages };
}

/**
 * Fetch current sponsorship status for the authenticated salon
 */
export function useSponsorshipStatus() {
  const [status, setStatus] = useState<SponsorshipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.request<{ success: boolean; data: SponsorshipStatus }>('/sponsorship/status');
      if (response.success && response.data) {
        setStatus(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sponsorship status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
}

/**
 * Purchase a sponsorship package - returns checkout URL for payment
 */
export async function purchaseSponsorship(packageId: string): Promise<PurchaseResult> {
  const response = await api.request<{ success: boolean; data: PurchaseResult }>('/sponsorship/purchase', {
    method: 'POST',
    body: JSON.stringify({ packageId }),
  });
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error('Failed to purchase sponsorship');
}

/**
 * Resume payment for a pending sponsorship order
 */
export async function resumeSponsorshipPayment(sponsoredSalonId: string): Promise<PurchaseResult> {
  const response = await api.request<{ success: boolean; data: PurchaseResult }>('/sponsorship/resume-payment', {
    method: 'POST',
    body: JSON.stringify({ sponsoredSalonId }),
  });
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error('Failed to resume payment');
}

/**
 * Human-friendly duration label for a package
 */
export function formatPackageDuration(durationType: string, durationValue: number): string {
  const unit = durationValue === 1 ? durationType.replace(/s$/, '') : durationType;
  return `${durationValue} ${unit}`;
}

/**
 * Convert package duration to hours (mirrors backend helper)
 */
export function packageDurationToHours(durationType: string, durationValue: number): number {
  switch (durationType.toLowerCase()) {
    case 'hours':
      return durationValue;
    case 'days':
      return durationValue * 24;
    case 'months':
      return durationValue * 30 * 24;
    case 'years':
      return durationValue * 365 * 24;
    default:
      return durationValue;
  }
}

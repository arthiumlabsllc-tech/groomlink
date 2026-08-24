import apiClient from './client';

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

export interface SponsorshipPurchaseResult {
  sponsoredSalonId: string;
  paymentReference: string;
  checkoutUrl?: string;
  amount: number;
  message: string;
}

// Human-friendly duration label for a package
export function formatPackageDuration(durationType: string, durationValue: number): string {
  const unit = durationValue === 1 ? durationType.replace(/s$/, '') : durationType;
  return `${durationValue} ${unit}`;
}

export const sponsorshipApi = {
  // Get all active sponsorship packages
  getPackages: async (): Promise<SponsorshipPackage[]> => {
    const response = await apiClient.get('/sponsorship/packages');
    return response.data.data || [];
  },

  // Get current sponsorship status for the authenticated salon
  getStatus: async (): Promise<SponsorshipStatus> => {
    const response = await apiClient.get('/sponsorship/status');
    return response.data.data;
  },

  // Purchase a sponsorship package - returns checkout URL for payment
  purchase: async (packageId: string): Promise<SponsorshipPurchaseResult> => {
    const response = await apiClient.post('/sponsorship/purchase', { packageId });
    return response.data.data;
  },

  // Resume payment for a pending sponsorship order
  resumePayment: async (sponsoredSalonId: string): Promise<SponsorshipPurchaseResult> => {
    const response = await apiClient.post('/sponsorship/resume-payment', { sponsoredSalonId });
    return response.data.data;
  },
};

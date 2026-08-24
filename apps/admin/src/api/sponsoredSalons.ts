import apiClient from './client';

export type SponsorType = 'paid' | 'featured' | 'promoted';
export type DurationUnit = 'hours' | 'days' | 'months' | 'years';
// Backend values: 'pending' (unpaid self-service order), 'paid', 'expired'.
// Legacy rows may still carry 'completed'/'failed'.
export type PaymentStatus = 'pending' | 'paid' | 'expired' | 'completed' | 'failed';

export interface SponsoredSalon {
  id: string;
  salonId: string;
  salon: {
    id: string;
    businessName: string;
    // Backend returns `logo` (Salon.logo column). Keep this field name aligned.
    logo: string | null;
    address: string | null;
    city: string | null;
    region?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
  };
  sponsorType: SponsorType;
  durationHours: number;
  startTime: string;
  endTime: string;
  amountPaid: number | null;
  paymentStatus: PaymentStatus;
  paymentReference: string | null;
  isActive: boolean;
  priority: number;
  createdById: string | null;
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SponsorshipPackage {
  id: string;
  packageName: string;
  durationType: DurationUnit;
  durationValue: number;
  priceGhs: number;
  priorityLevel: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalonSearchResult {
  id: string;
  businessName: string;
  logo: string | null;
  address: string | null;
  city: string | null;
  status: string;
}

export interface CreateSponsoredSalonData {
  salonId: string;
  sponsorType: SponsorType;
  durationHours: number;
  amountPaid?: number;
  usePackage?: boolean;
  packageId?: string;
}

export interface CustomDurationData {
  value: number;
  unit: DurationUnit;
}

export interface PaginatedSponsoredSalons {
  data: SponsoredSalon[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Base rate: GH₵2 per hour
export const BASE_RATE_PER_HOUR = 2;

// Convert duration to hours based on unit
export function convertToHours(value: number, unit: DurationUnit): number {
  switch (unit) {
    case 'hours':
      return value;
    case 'days':
      return value * 24;
    case 'months':
      return value * 24 * 30; // Approximate month as 30 days
    case 'years':
      return value * 24 * 365; // Approximate year as 365 days
    default:
      return value;
  }
}

// Calculate price based on custom duration
export function calculateCustomPrice(value: number, unit: DurationUnit): number {
  const hours = convertToHours(value, unit);
  return hours * BASE_RATE_PER_HOUR;
}

// Format duration for display
export function formatDuration(hours: number): string {
  if (hours < 24) {
    return `${hours} Hour${hours !== 1 ? 's' : ''}`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} Day${days !== 1 ? 's' : ''}`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} Month${months !== 1 ? 's' : ''}`;
  }
  const years = Math.floor(months / 12);
  return `${years} Year${years !== 1 ? 's' : ''}`;
}

// Format sponsor type for display
export function formatSponsorType(type: SponsorType): string {
  const labels: Record<SponsorType, string> = {
    paid: 'Paid',
    featured: 'Featured',
    promoted: 'Promoted',
  };
  return labels[type] || type;
}

// Get sponsor type badge color
export function getSponsorTypeColor(type: SponsorType): string {
  const colors: Record<SponsorType, string> = {
    paid: 'bg-blue-100 text-blue-800',
    featured: 'bg-purple-100 text-purple-800',
    promoted: 'bg-orange-100 text-orange-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
}

// Format payment status for display
export function formatPaymentStatus(status: PaymentStatus | string): string {
  const labels: Record<string, string> = {
    pending: 'Awaiting payment',
    paid: 'Paid',
    expired: 'Unpaid (expired)',
    completed: 'Paid',
    failed: 'Failed',
  };
  return labels[status] || status;
}

// Get payment status badge color
export function getPaymentStatusColor(status: PaymentStatus | string): string {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    paid: 'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
    expired: 'bg-gray-100 text-gray-600',
    failed: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

// Backend `paginatedResponse` envelope: { success, data: [...], meta: {page,limit,total,totalPages} }.
// We remap `meta` -> `pagination` so the existing UI (`pagination.totalPages`) keeps working.
function toPaginated(payload: any): PaginatedSponsoredSalons {
  const meta = payload?.meta || {};
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    pagination: {
      page: Number(meta.page) || 1,
      limit: Number(meta.limit) || 20,
      total: Number(meta.total) || 0,
      totalPages: Number(meta.totalPages) || 1,
    },
  };
}

export const sponsoredSalonsApi = {
  // Get all sponsored salons with pagination
  getAll: async (page: number = 1, limit: number = 20, status?: 'active' | 'expired'): Promise<PaginatedSponsoredSalons> => {
    const response = await apiClient.get('/admin/sponsored-salons', {
      params: { page, limit, status },
    });
    return toPaginated(response.data);
  },

  // Get active sponsored salons
  getActive: async (page: number = 1, limit: number = 20): Promise<PaginatedSponsoredSalons> => {
    const response = await apiClient.get('/admin/sponsored-salons', {
      params: { page, limit, status: 'active' },
    });
    return toPaginated(response.data);
  },

  // Create new sponsored salon
  create: async (data: CreateSponsoredSalonData): Promise<SponsoredSalon> => {
    const response = await apiClient.post('/admin/sponsored-salons', data);
    return response.data.data;
  },

  // Remove sponsored salon
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/sponsored-salons/${id}`);
  },

  // Get sponsorship packages
  getPackages: async (): Promise<SponsorshipPackage[]> => {
    const response = await apiClient.get('/admin/sponsorship-packages');
    return response.data.data || response.data;
  },

  // Search salons for selection
  searchSalons: async (query: string): Promise<SalonSearchResult[]> => {
    const response = await apiClient.get('/admin/salons', {
      params: { search: query, limit: 10 },
    });
    return response.data.data || [];
  },
};

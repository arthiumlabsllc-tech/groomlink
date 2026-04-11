import apiClient from './client';

export type SalonType = 'BARBERSHOP' | 'HAIR_SALON' | 'BEAUTY_SALON' | 'NAIL_SALON' | 'PEDICURE_SALON' | 'SPA';
export type SalonStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface Salon {
  id: string;
  businessName: string;
  description: string | null;
  type: SalonType;
  status: SalonStatus;
  phoneNumber: string;
  email: string | null;
  address: string;
  city: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  openingTime: string;
  closingTime: string;
  workingDays: string[];
  hasParking: boolean;
  hasWifi: boolean;
  hasAC: boolean;
  acceptsWalkIns: boolean;
  createdAt: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string | null;
    createdAt?: string;
  };
  documents?: {
    id: string;
    type: string;
    url: string;
  }[];
  _count?: {
    bookings: number;
    reviews: number;
    workers: number;
    services: number;
  };
}

export interface SalonDetails extends Salon {
  workers?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string | null;
    specialization: string | null;
    isActive: boolean;
  createdAt: string;
  _count?: {
    bookings: number;
  };
  }>;
  services?: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    duration: number;
    isActive: boolean;
    category: string;
  _count?: {
      bookings: number;
    };
  }>;
  recentBookings?: Array<{
    id: string;
    status: string;
    scheduledDate: string;
    scheduledTime: string;
    totalAmount: number;
    createdAt: string;
    customer: {
      id: string;
      firstName: string;
      lastName: string;
      phoneNumber: string;
    };
    worker?: {
      id: string;
      firstName: string;
      lastName: string;
    };
    services: Array<{
      name: string;
      price: number;
    }>;
  }>;
  reviewsSummary?: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  };
  totalRevenue?: number;
}

export interface CreateSalonData {
  businessName: string;
  type: SalonType;
  phoneNumber: string;
  email?: string;
  address: string;
  city: string;
  region: string;
  openingTime: string;
  closingTime: string;
  workingDays: string[];
  description?: string;
  ownerEmail?: string;
  latitude?: number;
  longitude?: number;
  hasParking?: boolean;
  hasWifi?: boolean;
  hasAC?: boolean;
  acceptsWalkIns?: boolean;
}

export interface PaginatedSalons {
  data: Salon[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const salonsApi = {
  // Get all salons with pagination
  getAll: async (page: number = 1, limit: number = 20, status?: string): Promise<PaginatedSalons> => {
    const response = await apiClient.get('/salons', {
      params: { page, limit, status },
    });
    return response.data;
  },

  // Get pending salons
  getPending: async (page: number = 1, limit: number = 20): Promise<PaginatedSalons> => {
    const response = await apiClient.get('/admin/salons/pending', {
      params: { page, limit },
    });
    return response.data;
  },

  // Get salon by ID
  getById: async (id: string): Promise<Salon> => {
    const response = await apiClient.get(`/salons/${id}`);
    return response.data.data;
  },

  // Approve salon
  approve: async (id: string): Promise<Salon> => {
    const response = await apiClient.post(`/admin/salons/${id}/approve`);
    return response.data.data;
  },

  // Reject salon
  reject: async (id: string, reason?: string): Promise<Salon> => {
    const response = await apiClient.post(`/admin/salons/${id}/reject`, { reason });
    return response.data.data;
  },

  // Suspend salon
  suspend: async (id: string, reason?: string): Promise<Salon> => {
    const response = await apiClient.post(`/salons/${id}/suspend`, { reason });
    return response.data.data;
  },

  // Get salon statistics
  getStats: async (id: string) => {
    const response = await apiClient.get(`/salons/${id}/stats`);
    return response.data.data;
  },

  // Create salon (admin)
  create: async (data: CreateSalonData): Promise<Salon> => {
    const response = await apiClient.post('/admin/salons', data);
    return response.data.data;
  },

  // Get salon details (admin - includes workers, services, bookings, reviews)
  getDetails: async (id: string): Promise<SalonDetails> => {
    const response = await apiClient.get(`/admin/salons/${id}`);
    return response.data.data;
  },

  // Reactivate suspended salon
  reactivate: async (id: string): Promise<Salon> => {
    const response = await apiClient.post(`/admin/salons/${id}/reactivate`);
    return response.data.data;
  },
};

import apiClient from './client';

export interface Salon {
  id: string;
  businessName: string;
  description: string | null;
  type: 'BARBERSHOP' | 'SALON' | 'SPA' | 'NAIL_SALON' | 'BEAUTY_PARLOR';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  phoneNumber: string;
  email: string | null;
  address: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
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
  };
  documents?: {
    id: string;
    type: string;
    url: string;
  }[];
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
};

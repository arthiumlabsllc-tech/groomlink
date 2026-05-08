import apiClient from './client';
import { Salon, Service, Worker } from '../types';

export interface SearchFilters {
  search?: string;
  type?: string;
  providerCategory?: string;
  city?: string;
  minRating?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  limit?: number;
  featured?: boolean;
  category?: string;
  homeService?: boolean;
}

export interface SalonSearchParams {
  query?: string;
}

export const salonApi = {
  // Search salons with filters
  searchSalons: async (filters: SearchFilters = {}): Promise<{ salons: Salon[]; total: number }> => {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.type) params.append('type', filters.type);
    if (filters.providerCategory) params.append('providerCategory', filters.providerCategory);
    if (filters.city) params.append('city', filters.city);
    if (filters.minRating) params.append('minRating', filters.minRating.toString());
    if (filters.lat) params.append('lat', filters.lat.toString());
    if (filters.lng) params.append('lng', filters.lng.toString());
    if (filters.radius) params.append('radius', filters.radius.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.featured !== undefined) params.append('featured', filters.featured.toString());
    if (filters.category) params.append('category', filters.category);
    if (filters.homeService) params.append('homeService', filters.homeService.toString());

    const response = await apiClient.get(`/salons?${params.toString()}`);
    return {
      salons: response.data.data,
      total: response.data.pagination?.total || response.data.data.length,
    };
  },

  // Get nearby salons
  getNearbySalons: async (lat: number, lng: number, radius: number = 10): Promise<Salon[]> => {
    const params = new URLSearchParams();
    params.append('lat', lat.toString());
    params.append('lng', lng.toString());
    params.append('radius', radius.toString());
    const response = await apiClient.get(`/salons/nearby?${params.toString()}`);
    return response.data.data || [];
  },

  // Get salon by ID
  getSalonById: async (id: string): Promise<Salon> => {
    try {
      const response = await apiClient.get(`/salons/${id}`);
      
      if (!response.data) {
        throw new Error('No data received from server');
      }
      
      const salonData = response.data.data || response.data;
      
      if (!salonData) {
        throw new Error('Salon not found');
      }
      
      return salonData;
    } catch (error: any) {
      console.error('[SalonAPI] Error fetching salon:', error);
      console.error('[SalonAPI] Error response:', error.response?.data);
      throw error;
    }
  },

  // Get salon staff
  getSalonStaff: async (salonId: string): Promise<Worker[]> => {
    const response = await apiClient.get(`/salons/${salonId}/staff`);
    return response.data.data.staff;
  },

  // Get salon services
  getSalonServices: async (salonId: string): Promise<Service[]> => {
    const response = await apiClient.get(`/salons/${salonId}/services`);
    return response.data.data.services;
  },

  // Get featured salons
  getFeaturedSalons: (limit?: number) => salonApi.searchSalons({ featured: true, limit: limit || 10 }),

  // Get salons for map view
  getSalonsForMap: async (lat?: number, lng?: number, radius?: number, category?: string, homeService?: boolean): Promise<Salon[]> => {
    const params = new URLSearchParams();
    if (lat) params.append('lat', lat.toString());
    if (lng) params.append('lng', lng.toString());
    if (radius) params.append('radius', radius.toString());
    if (category) params.append('category', category);
    if (homeService) params.append('homeService', homeService.toString());
    const response = await apiClient.get(`/salons/map?${params.toString()}`);
    return response.data.data;
  },
};

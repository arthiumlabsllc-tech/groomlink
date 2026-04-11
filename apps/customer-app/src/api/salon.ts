import apiClient from './client';
import { Salon, Service, Worker } from '../types';

export interface SearchFilters {
  search?: string;
  type?: string;
  city?: string;
  minRating?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  limit?: number;
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
    if (filters.city) params.append('city', filters.city);
    if (filters.minRating) params.append('minRating', filters.minRating.toString());
    if (filters.lat) params.append('lat', filters.lat.toString());
    if (filters.lng) params.append('lng', filters.lng.toString());
    if (filters.radius) params.append('radius', filters.radius.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

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
    const response = await apiClient.get(`/salons/${id}`);
    return response.data.data;
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

  // Get salons for map view
  getSalonsForMap: async (lat?: number, lng?: number, radius?: number): Promise<Salon[]> => {
    const params = new URLSearchParams();
    if (lat) params.append('lat', lat.toString());
    if (lng) params.append('lng', lng.toString());
    if (radius) params.append('radius', radius.toString());
    const response = await apiClient.get(`/salons/map?${params.toString()}`);
    return response.data.data;
  },
};

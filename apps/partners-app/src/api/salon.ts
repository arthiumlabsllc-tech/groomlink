import apiClient from './client';
import { Salon, DashboardStats, CompletionSettings } from '../types';

export interface CreateSalonData {
  businessName: string;
  type: string;
  phoneNumber: string;
  email?: string;
  address: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  openingTime: string;
  closingTime: string;
  workingDays: string[];
  description?: string;
}

export const salonApi = {
  // Create a new salon
  create: async (data: CreateSalonData): Promise<Salon> => {
    const response = await apiClient.post('/salons', data);
    return response.data.data;
  },

  // Get current user's salon
  getMySalon: async (): Promise<Salon | null> => {
    try {
      const response = await apiClient.get('/salons/my/list');
      // Return the first salon from the list
      return response.data.data?.[0] || null;
    } catch (error) {
      return null;
    }
  },

  // Get salon by ID
  getSalonById: async (id: string): Promise<Salon> => {
    const response = await apiClient.get(`/salons/${id}`);
    return response.data.data;
  },

  // Get salon stats
  getSalonStats: async (salonId: string): Promise<DashboardStats> => {
    const response = await apiClient.get(`/salons/${salonId}/stats`);
    return response.data.data;
  },

  // Update salon
  update: async (id: string, data: Partial<CreateSalonData>): Promise<Salon> => {
    const response = await apiClient.put(`/salons/${id}`, data);
    return response.data.data;
  },

  // Get completion settings
  getCompletionSettings: async (salonId: string): Promise<CompletionSettings> => {
    const response = await apiClient.get(`/salon/${salonId}/completion-settings`);
    return response.data.data;
  },

  // Update completion settings
  updateCompletionSettings: async (salonId: string, settings: Partial<CompletionSettings>): Promise<CompletionSettings> => {
    const response = await apiClient.put(`/salon/${salonId}/completion-settings`, settings);
    return response.data.data;
  },
};

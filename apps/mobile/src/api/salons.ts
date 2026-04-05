import apiClient from './client';
import { Salon, TimeSlot } from '../types';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const salonsApi = {
  getSalons: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    city?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    search?: string;
  }): Promise<PaginatedResponse<Salon>> => {
    const response = await apiClient.get('/salons', { params });
    return response.data;
  },

  getSalonById: async (id: string): Promise<Salon> => {
    const response = await apiClient.get(`/salons/${id}`);
    return response.data.data;
  },

  getAvailableSlots: async (
    salonId: string,
    date: string,
    workerId?: string
  ): Promise<TimeSlot[]> => {
    const response = await apiClient.get(`/bookings/slots/${salonId}`, {
      params: { date, workerId },
    });
    return response.data.data;
  },

  createSalon: async (data: Partial<Salon>): Promise<Salon> => {
    const response = await apiClient.post('/salons', data);
    return response.data.data;
  },
};

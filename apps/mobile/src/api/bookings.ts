import apiClient from './client';
import { Booking } from '../types';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CreateBookingData {
  salonId: string;
  workerId?: string;
  serviceId: string;
  date: string;
  startTime: string;
  customerNotes?: string;
}

export const bookingsApi = {
  create: async (data: CreateBookingData): Promise<Booking> => {
    const response = await apiClient.post('/bookings', data);
    return response.data.data;
  },

  createBooking: async (data: CreateBookingData): Promise<Booking> => {
    const response = await apiClient.post('/bookings', data);
    return response.data.data;
  },

  getMyBookings: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<Booking[]> => {
    const response = await apiClient.get('/bookings/my', { params });
    return response.data.data || response.data;
  },

  getBookingById: async (id: string): Promise<Booking> => {
    const response = await apiClient.get(`/bookings/${id}`);
    return response.data.data;
  },

  cancelBooking: async (id: string, reason?: string): Promise<Booking> => {
    const response = await apiClient.post(`/bookings/${id}/cancel`, { reason });
    return response.data.data;
  },

  confirmBooking: async (id: string): Promise<Booking> => {
    const response = await apiClient.post(`/bookings/${id}/confirm`);
    return response.data.data;
  },

  completeBooking: async (id: string): Promise<Booking> => {
    const response = await apiClient.post(`/bookings/${id}/complete`);
    return response.data.data;
  },
};

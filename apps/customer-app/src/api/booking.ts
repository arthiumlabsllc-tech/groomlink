import apiClient from './client';
import { Booking } from '../types';

export interface CreateBookingData {
  salonId: string;
  workerId?: string;
  serviceId: string;
  date: string;
  startTime: string;
  customerNotes?: string;
}

export interface AvailableSlot {
  time: string;
  available: boolean;
}

export const bookingApi = {
  // Create a new booking
  createBooking: async (data: CreateBookingData): Promise<Booking> => {
    const response = await apiClient.post('/bookings', data);
    return response.data.data;
  },

  // Get user's bookings
  getMyBookings: async (status?: string): Promise<Booking[]> => {
    const params = status ? `?status=${status}` : '';
    const response = await apiClient.get(`/bookings/my${params}`);
    return response.data.data;
  },

  // Get booking by ID
  getBookingById: async (id: string): Promise<Booking> => {
    const response = await apiClient.get(`/bookings/${id}`);
    return response.data.data;
  },

  // Get available time slots
  getAvailableSlots: async (salonId: string, date: string, workerId?: string): Promise<AvailableSlot[]> => {
    const params = new URLSearchParams();
    params.append('date', date);
    if (workerId) params.append('workerId', workerId);
    
    const response = await apiClient.get(`/bookings/slots/${salonId}?${params.toString()}`);
    return response.data.data;
  },

  // Cancel booking
  cancelBooking: async (id: string, reason?: string): Promise<Booking> => {
    const response = await apiClient.put(`/bookings/${id}/cancel`, { reason });
    return response.data.data;
  },

  // Reschedule booking
  rescheduleBooking: async (id: string, date: string, startTime: string): Promise<Booking> => {
    const response = await apiClient.put(`/bookings/${id}/reschedule`, { date, startTime });
    return response.data.data;
  },

  // Rate booking
  rateBooking: async (id: string, rating: number, comment?: string): Promise<void> => {
    await apiClient.post(`/bookings/${id}/rate`, { rating, comment });
  },
};

import apiClient from './client';
import { Booking, BookingStatus } from '../types';

export interface CheckinParams {
  qrData?: string;
  checkinCode?: string;
  bookingId?: string;
}

export interface CheckinResponse {
  booking: {
    id: string;
    reference: string;
    status: string;
    checkedIn: boolean;
    checkedInAt: string | null;
    checkinCode: string | null;
    queuePosition: number | null;
    customer: {
      id: string;
      firstName: string;
      lastName: string;
      phoneNumber: string | null;
    };
    service: {
      id: string;
      name: string;
      duration: number;
    };
  };
  queuePosition: number;
  message: string;
}

export interface SalonBookingsParams {
  salonId: string;
  status?: BookingStatus;
  page?: number;
  limit?: number;
}

export interface BookingsResponse {
  data: Booking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BookingDetail extends Booking {
  salon: {
    id: string;
    businessName: string;
    address: string;
    phoneNumber: string;
    logo: string | null;
  };
  payment: {
    status: string;
    provider: string;
  } | null;
  review: {
    id: string;
    rating: number;
    comment: string | null;
  } | null;
}

export const bookingsApi = {
  // Get bookings for a salon
  getSalonBookings: async (params: SalonBookingsParams): Promise<BookingsResponse> => {
    const { salonId, status, page = 1, limit = 20 } = params;
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    if (status) {
      queryParams.append('status', status);
    }
    const response = await apiClient.get(`/bookings/salon/${salonId}?${queryParams.toString()}`);
    return response.data;
  },

  // Get booking by ID
  getBookingById: async (id: string): Promise<BookingDetail> => {
    const response = await apiClient.get(`/bookings/${id}`);
    return response.data.data;
  },

  // Confirm a booking
  confirmBooking: async (id: string): Promise<Booking> => {
    const response = await apiClient.post(`/bookings/${id}/confirm`);
    return response.data.data;
  },

  // Complete a booking
  completeBooking: async (id: string): Promise<Booking> => {
    const response = await apiClient.post(`/bookings/${id}/complete`);
    return response.data.data;
  },

  // Cancel a booking
  cancelBooking: async (id: string, reason?: string): Promise<any> => {
    const response = await apiClient.post(`/bookings/${id}/cancel`, { reason });
    return response.data;
  },

  // Check-in by QR code or check-in code
  checkinByQR: async (params: CheckinParams): Promise<CheckinResponse> => {
    const response = await apiClient.post('/bookings/checkin-by-qr', params);
    return response.data.data;
  },

  // Check in a specific guest in a group booking
  checkInGuest: async (guestId: string): Promise<any> => {
    const response = await apiClient.put(`/bookings/guest/${guestId}/checkin`);
    return response.data.data;
  },

  // Mark a guest as no-show
  markGuestNoShow: async (guestId: string): Promise<any> => {
    const response = await apiClient.put(`/bookings/guest/${guestId}/no-show`);
    return response.data.data;
  },

  // Mark entire booking as no-show (customer-level)
  markNoShow: async (bookingId: string): Promise<any> => {
    const response = await apiClient.post(`/bookings/${bookingId}/no-show`);
    return response.data.data;
  },

  // One-Click Refund (provider initiates refund to customer's original payment method)
  oneClickRefund: async (bookingId: string): Promise<{
    success: boolean;
    refundAmount: number;
    refundMethod: string;
    message: string;
  }> => {
    const response = await apiClient.post(`/bookings/${bookingId}/refund`);
    return response.data.data;
  },
};

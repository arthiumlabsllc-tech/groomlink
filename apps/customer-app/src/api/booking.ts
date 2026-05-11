import apiClient from './client';
import { Booking, RefundPreview, NoShowStatus, QueuePositionResponse } from '../types';

export interface GuestData {
  guestName: string;
  guestPhone?: string;
  guestAgeGroup: 'child' | 'teen' | 'adult' | 'senior';
  serviceId: string;
  staffId?: string;
  specialInstructions?: string;
  isChild: boolean;
}

export interface CreateBookingData {
  salonId: string;
  workerId?: string;
  serviceId: string;
  date: string;
  startTime: string;
  customerNotes?: string;
  isGroupBooking?: boolean;
  totalPeople?: number;
  guests?: GuestData[];
  billingType?: 'combined' | 'separate';
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  remainingSpots?: number;
  totalSpots?: number;
  bookedSpots?: number;
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

  // Get refund preview for cancellation
  getRefundPreview: async (id: string): Promise<RefundPreview> => {
    const response = await apiClient.get(`/bookings/${id}/refund-preview`);
    return response.data.data;
  },

  // Dispute a no-show marking
  disputeNoShow: async (id: string, reason: string): Promise<void> => {
    await apiClient.post(`/bookings/${id}/dispute-no-show`, { reason });
  },

  // Get user's no-show status
  getNoShowStatus: async (): Promise<NoShowStatus> => {
    const response = await apiClient.get('/users/no-show-status');
    return response.data.data;
  },

  // Confirm service completion
  confirmCompletion: async (id: string): Promise<Booking> => {
    const response = await apiClient.post(`/bookings/${id}/confirm-completion`);
    return response.data.data;
  },

  // Raise a dispute for service completion
  raiseDispute: async (id: string, reason: string): Promise<Booking> => {
    const response = await apiClient.post(`/bookings/${id}/dispute`, { reason });
    return response.data.data;
  },

  // Get QR code for booking check-in
  getQRCode: async (id: string): Promise<{ qrCode: string; bookingRef: string }> => {
    const response = await apiClient.get(`/bookings/${id}/qr-code`);
    return response.data.data;
  },

  // Get queue position for booking
  getQueuePosition: async (id: string): Promise<QueuePositionResponse> => {
    const response = await apiClient.get(`/bookings/${id}/queue-position`);
    return response.data.data;
  },

  // Auto check-in via geofence
  autoCheckIn: async (bookingId: string, latitude: number, longitude: number): Promise<{
    booking: {
      id: string;
      reference: string;
      status: string;
      checkedIn: boolean;
      checkedInAt: string | null;
      queuePosition: number | null;
      salon: {
        id: string;
        businessName: string;
        address: string;
      };
      service: {
        id: string;
        name: string;
        duration: number;
      };
    };
    queuePosition: number;
    message: string;
  }> => {
    const response = await apiClient.post('/bookings/auto-checkin', {
      bookingId,
      latitude,
      longitude,
    });
    return response.data.data;
  },

  // Cancel a guest from a group booking (customer only)
  cancelGuest: async (guestId: string, reason?: string): Promise<any> => {
    const response = await apiClient.put(`/bookings/guest/${guestId}/cancel`, { reason });
    return response.data.data;
  },
};

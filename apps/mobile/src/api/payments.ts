import apiClient from './client';
import { Payment } from '../types';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PaymentResult {
  success: boolean;
  paymentId?: string;
  reference?: string;
  message: string;
}

export const paymentsApi = {
  initiatePayment: async (data: {
    bookingId: string;
    provider: string;
    phoneNumber?: string;
  }): Promise<PaymentResult> => {
    const response = await apiClient.post('/payments/initialize', data);
    return response.data.data;
  },

  initializePayment: async (data: {
    bookingId: string;
    provider: string;
    phoneNumber: string;
  }): Promise<PaymentResult> => {
    const response = await apiClient.post('/payments/initialize', data);
    return response.data.data;
  },

  verifyPayment: async (paymentId: string, reference: string): Promise<PaymentResult> => {
    const response = await apiClient.post('/payments/verify', { paymentId, reference });
    return response.data.data;
  },

  getPaymentHistory: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Payment>> => {
    const response = await apiClient.get('/payments/history', { params });
    return response.data;
  },

  getPaymentById: async (id: string): Promise<Payment> => {
    const response = await apiClient.get(`/payments/${id}`);
    return response.data.data;
  },
};

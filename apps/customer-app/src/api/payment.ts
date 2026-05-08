import apiClient from './client';

export type PaymentProvider = 'MTN_MOMO' | 'VODAFONE_CASH' | 'AIRTELTIGO_MONEY';

export interface PaymentInitializeResponse {
  success: boolean;
  reference: string;
  message: string;
  checkout_url?: string;
  access_code?: string;
}

export interface PaymentVerifyResponse {
  success: boolean;
  status: string;
  message?: string;
  bookingReference?: string;
  amountPaid?: number;
  serviceName?: string;
  bookingDate?: string;
  bookingTime?: string;
  salonName?: string;
}

export interface PaymentConfig {
  platformFeePercentage: number;
}

export const paymentApi = {
  initialize: async (data: {
    bookingId: string;
    provider: PaymentProvider;
    phoneNumber: string;
  }): Promise<PaymentInitializeResponse> => {
    const response = await apiClient.post('/payments/initialize', data);
    return response.data.data;
  },

  verify: async (data: {
    paymentId?: string;
    reference: string;
  }): Promise<PaymentVerifyResponse> => {
    const response = await apiClient.post('/payments/verify', data);
    return response.data.data;
  },

  getConfig: async (): Promise<PaymentConfig> => {
    const response = await apiClient.get('/payments/config');
    return response.data.data;
  },
};

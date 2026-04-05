import apiClient from './client';

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  provider: 'MTN_MOMO' | 'VODAFONE_CASH' | 'AIRTEL_TIGO';
  providerTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  booking?: {
    id: string;
    salon: {
      id: string;
      businessName: string;
    };
    customer: {
      id: string;
      firstName: string;
      lastName: string;
    };
    service: {
      id: string;
      name: string;
    };
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
}

export interface PaginatedTransactions {
  data: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const transactionsApi = {
  // Get all transactions with pagination
  getAll: async (
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<PaginatedTransactions> => {
    const response = await apiClient.get('/admin/transactions', {
      params: { page, limit, status },
    });
    return response.data;
  },

  // Get transaction by ID
  getById: async (id: string): Promise<Transaction> => {
    const response = await apiClient.get(`/admin/transactions/${id}`);
    return response.data.data;
  },

  // Refund transaction
  refund: async (id: string, reason?: string) => {
    const response = await apiClient.post(`/admin/transactions/${id}/refund`, { reason });
    return response.data.data;
  },

  // Get transaction statistics
  getStats: async (period: string = '30d') => {
    const response = await apiClient.get('/admin/transactions/stats', {
      params: { period },
    });
    return response.data.data;
  },
};

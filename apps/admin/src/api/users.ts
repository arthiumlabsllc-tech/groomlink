import apiClient from './client';

export interface User {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: 'CUSTOMER' | 'SALON_OWNER' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isVerified: boolean;
  createdAt: string;
  _count?: {
    bookings: number;
    salons: number;
  };
}

export interface PaginatedUsers {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const usersApi = {
  // Get all users with pagination
  getAll: async (
    page: number = 1,
    limit: number = 20,
    role?: string,
    status?: string
  ): Promise<PaginatedUsers> => {
    const response = await apiClient.get('/users', {
      params: { page, limit, role, status },
    });
    return response.data;
  },

  // Get user by ID
  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data.data;
  },

  // Block/suspend user
  block: async (id: string, reason?: string): Promise<User> => {
    const response = await apiClient.post(`/users/${id}/block`, { reason });
    return response.data.data;
  },

  // Unblock user
  unblock: async (id: string): Promise<User> => {
    const response = await apiClient.post(`/users/${id}/unblock`);
    return response.data.data;
  },

  // Get user bookings
  getUserBookings: async (id: string, page: number = 1, limit: number = 20) => {
    const response = await apiClient.get(`/users/${id}/bookings`, {
      params: { page, limit },
    });
    return response.data;
  },
};

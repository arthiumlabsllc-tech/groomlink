import apiClient from './client';

export type UserRole = 'CUSTOMER' | 'SALON_OWNER' | 'SUPPORT' | 'ADMIN' | 'SUPER_ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  hasSuspiciousActivity?: boolean;
  _count?: {
    bookings: number;
    salons: number;
  };
}

export interface UserDetails extends User {
  location?: {
    city: string | null;
    region: string | null;
  };
  banReason?: string | null;
  bannedAt?: string | null;
  bookings?: Array<{
    id: string;
    status: string;
    scheduledDate: string;
    scheduledTime: string;
    totalAmount: number;
    createdAt: string;
    salon: {
      id: string;
      businessName: string;
      city: string;
    };
    services: Array<{
      name: string;
      price: number;
    }>;
  }>;
  payments?: Array<{
    id: string;
    amount: number;
    provider: string;
    status: string;
    createdAt: string;
    booking?: {
      id: string;
      salon: {
        businessName: string;
      };
    };
  }>;
}

export interface UserActivity {
  id: string;
  action: string;
  ipAddress: string | null;
  device: string | null;
  isSuspicious: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface PaginatedActivities {
  data: UserActivity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
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

export interface CreateCustomerData {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
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

  // Create customer (admin)
  createCustomer: async (data: CreateCustomerData): Promise<User> => {
    const response = await apiClient.post('/admin/customers', data);
    return response.data.data;
  },

  // Get user details (admin - includes bookings, payments)
  getDetails: async (id: string): Promise<UserDetails> => {
    const response = await apiClient.get(`/admin/users/${id}`);
    return response.data.data;
  },

  // Get user activities
  getActivities: async (id: string, page: number = 1, limit: number = 20): Promise<PaginatedActivities> => {
    const response = await apiClient.get(`/admin/users/${id}/activities`, {
      params: { page, limit },
    });
    return response.data;
  },

  // Ban user (with reason)
  ban: async (id: string, reason: string): Promise<User> => {
    const response = await apiClient.post(`/admin/users/${id}/ban`, { reason });
    return response.data.data;
  },

  // Unban user
  unban: async (id: string): Promise<User> => {
    const response = await apiClient.post(`/admin/users/${id}/unban`);
    return response.data.data;
  },

  // Get suspicious activities
  getSuspiciousActivities: async (page: number = 1, limit: number = 20) => {
    const response = await apiClient.get('/admin/suspicious-activities', {
      params: { page, limit },
    });
    return response.data;
  },
};

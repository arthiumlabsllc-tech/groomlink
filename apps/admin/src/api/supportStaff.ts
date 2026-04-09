import apiClient from './client';

export interface SupportStaff {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: 'SUPPORT';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isVerified: boolean;
  createdAt: string;
}

export interface PaginatedSupportStaff {
  data: SupportStaff[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateSupportStaffData {
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  email: string;
}

export const supportStaffApi = {
  // Get all support staff
  getAll: async (
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedSupportStaff> => {
    const response = await apiClient.get('/users/support-staff', {
      params: { page, limit },
    });
    return response.data;
  },

  // Create support staff
  create: async (data: CreateSupportStaffData): Promise<SupportStaff> => {
    const response = await apiClient.post('/users/support-staff', data);
    return response.data.data;
  },
};

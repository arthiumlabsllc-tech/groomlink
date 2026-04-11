import apiClient from './client';

export interface Admin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  pages: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedAdmins {
  data: Admin[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateAdminData {
  email: string;
  firstName: string;
  lastName: string;
  pages: string[];
}

export interface UpdatePermissionsData {
  pages: string[];
}

export const adminManagementApi = {
  // Get all admins
  getAdmins: async (page: number = 1, limit: number = 50): Promise<PaginatedAdmins> => {
    const response = await apiClient.get(`/admin/admins?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Create new admin
  createAdmin: async (data: CreateAdminData): Promise<Admin> => {
    const response = await apiClient.post('/admin/admins', data);
    return response.data.data;
  },

  // Update admin permissions
  updatePermissions: async (id: string, pages: string[]): Promise<Admin> => {
    const response = await apiClient.put(`/admin/admins/${id}/permissions`, { pages });
    return response.data.data;
  },

  // Delete admin
  deleteAdmin: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/admins/${id}`);
  },
};

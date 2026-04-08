import apiClient from './client';
import { Service } from './services';

export interface StaffMember {
  id: string;
  fullName: string;
  phoneNumber?: string | null;
  email?: string | null;
  bio?: string | null;
  avatar?: string | null;
  specialty?: string | null;
  yearsOfExperience?: number | null;
  specialties?: string[];
  isActive: boolean;
  rating?: number;
  workerServices?: Array<{
    service: Service;
    priceOverride?: number | null;
  }>;
  _count?: {
    bookings: number;
    reviews: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStaffData {
  fullName: string;
  phoneNumber?: string;
  email?: string;
  bio?: string;
  specialties?: string[];
  yearsOfExperience?: number;
  avatar?: string;
}

export interface UpdateStaffData extends Partial<CreateStaffData> {
  isActive?: boolean;
}

export interface StaffServiceData {
  serviceId: string;
  priceOverride?: number;
}

export const staffApi = {
  // Get all staff for a salon
  getStaff: async (salonId: string): Promise<{ staff: StaffMember[] }> => {
    const response = await apiClient.get(`/salon-owner/${salonId}/staff`);
    return response.data.data;
  },

  // Create a new staff member
  createStaff: async (salonId: string, data: CreateStaffData): Promise<StaffMember> => {
    const response = await apiClient.post(`/salon-owner/${salonId}/staff`, data);
    return response.data.data;
  },

  // Update a staff member
  updateStaff: async (salonId: string, staffId: string, data: UpdateStaffData): Promise<StaffMember> => {
    const response = await apiClient.put(`/salon-owner/${salonId}/staff/${staffId}`, data);
    return response.data.data;
  },

  // Delete a staff member (soft delete - sets isActive to false)
  deleteStaff: async (salonId: string, staffId: string): Promise<void> => {
    await apiClient.delete(`/salon-owner/${salonId}/staff/${staffId}`);
  },

  // Assign service to staff member
  assignServiceToStaff: async (salonId: string, staffId: string, data: StaffServiceData): Promise<void> => {
    await apiClient.post(`/salon-owner/${salonId}/staff/${staffId}/services`, data);
  },

  // Remove service from staff member
  removeServiceFromStaff: async (salonId: string, staffId: string, serviceId: string): Promise<void> => {
    await apiClient.delete(`/salon-owner/${salonId}/staff/${staffId}/services/${serviceId}`);
  },
};

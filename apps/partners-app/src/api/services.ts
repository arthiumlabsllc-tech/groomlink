import apiClient from './client';

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  category: string;
  isActive: boolean;
  discountPrice?: number | null;
  promoLabel?: string | null;
  image?: string | null;
  workerServices?: Array<{
    worker: {
      id: string;
      fullName: string;
    };
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateServiceData {
  name: string;
  description?: string;
  price: number;
  duration: number;
  category: string;
  discountPrice?: number | null;
  promoLabel?: string | null;
  image?: string;
}

export interface UpdateServiceData extends Partial<CreateServiceData> {
  isActive?: boolean;
}

export const servicesApi = {
  // Get all services for a salon
  getServices: async (salonId: string): Promise<{ services: Service[] }> => {
    const response = await apiClient.get(`/salon-owner/${salonId}/services`);
    return response.data.data;
  },

  // Create a new service
  createService: async (salonId: string, data: CreateServiceData): Promise<Service> => {
    const response = await apiClient.post(`/salon-owner/${salonId}/services`, data);
    return response.data.data;
  },

  // Update a service
  updateService: async (salonId: string, serviceId: string, data: UpdateServiceData): Promise<Service> => {
    const response = await apiClient.put(`/salon-owner/${salonId}/services/${serviceId}`, data);
    return response.data.data;
  },

  // Delete a service (soft delete - sets isActive to false)
  deleteService: async (salonId: string, serviceId: string): Promise<void> => {
    await apiClient.delete(`/salon-owner/${salonId}/services/${serviceId}`);
  },

  // Toggle service active status
  toggleServiceStatus: async (salonId: string, serviceId: string, isActive: boolean): Promise<Service> => {
    const response = await apiClient.put(`/salon-owner/${salonId}/services/${serviceId}`, { isActive });
    return response.data.data;
  },
};

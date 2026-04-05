import apiClient from './client';

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponData {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  validFrom?: string;
  validUntil?: string;
  usageLimit?: number;
}

export interface PaginatedCoupons {
  data: Coupon[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const promotionsApi = {
  // Get all coupons
  getAll: async (page: number = 1, limit: number = 20, active?: boolean): Promise<PaginatedCoupons> => {
    const response = await apiClient.get('/admin/coupons', {
      params: { page, limit, active },
    });
    return response.data;
  },

  // Get coupon by ID
  getById: async (id: string): Promise<Coupon> => {
    const response = await apiClient.get(`/admin/coupons/${id}`);
    return response.data.data;
  },

  // Create coupon
  create: async (data: CreateCouponData): Promise<Coupon> => {
    const response = await apiClient.post('/admin/coupons', data);
    return response.data.data;
  },

  // Update coupon
  update: async (id: string, data: Partial<CreateCouponData>): Promise<Coupon> => {
    const response = await apiClient.put(`/admin/coupons/${id}`, data);
    return response.data.data;
  },

  // Delete coupon
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/coupons/${id}`);
  },

  // Send push notification
  sendPushNotification: async (title: string, message: string, target?: 'all' | 'customers' | 'owners') => {
    const response = await apiClient.post('/admin/notifications/push', {
      title,
      message,
      target,
    });
    return response.data.data;
  },
};

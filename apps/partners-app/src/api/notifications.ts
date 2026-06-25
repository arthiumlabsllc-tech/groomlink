import apiClient from './client';

export type NotificationType =
  | 'BOOKING_CREATED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_REMINDER'
  | 'BOOKING_COMPLETED'
  | 'BOOKING_REJECTED'
  | 'BOOKING_CHECKIN'
  | 'BOOKING_NO_SHOW'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'REVIEW'
  | 'PROMOTION'
  | 'SYSTEM';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const notificationApi = {
  getAll: async (page = 1, limit = 50): Promise<NotificationsResponse> => {
    const response = await apiClient.get(`/notifications?page=${page}&limit=${limit}`);
    return response.data.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data.data.unreadCount;
  },

  markAsRead: async (id: string): Promise<void> => {
    await apiClient.put(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<number> => {
    const response = await apiClient.put('/notifications/read-all');
    return response.data.data.count;
  },
};

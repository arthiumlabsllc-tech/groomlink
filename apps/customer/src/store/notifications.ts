import { create } from 'zustand';
import { notificationApi, NotificationResponse } from '../lib/api';

export type NotificationType = 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'BOOKING_REMINDER' | 'BOOKING_COMPLETED' | 'PAYMENT_RECEIVED' | 'REVIEW_REQUEST' | 'PROMOTION' | 'SYSTEM';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isDropdownOpen: boolean;
  hasMore: boolean;
  page: number;
  
  fetchNotifications: (page?: number, limit?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  toggleDropdown: () => void;
  closeDropdown: () => void;
  startPolling: () => () => void;
  reset: () => void;
}

const mapNotification = (n: NotificationResponse): Notification => ({
  id: n.id,
  type: n.type as NotificationType,
  title: n.title,
  message: n.message,
  data: n.data,
  isRead: n.isRead,
  createdAt: n.createdAt,
});

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isDropdownOpen: false,
  hasMore: true,
  page: 1,

  fetchNotifications: async (page = 1, limit = 20) => {
    try {
      set({ isLoading: true });
      const response = await notificationApi.getNotifications(page, limit);
      const notifications = response.notifications.map(mapNotification);
      
      set((state) => ({
        notifications: page === 1 ? notifications : [...state.notifications, ...notifications],
        unreadCount: response.unreadCount,
        hasMore: response.meta ? page < response.meta.totalPages : false,
        page,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { count } = await notificationApi.getUnreadCount();
      set({ unreadCount: count });
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  markAsRead: async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationApi.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },

  toggleDropdown: () => {
    set((state) => ({ isDropdownOpen: !state.isDropdownOpen }));
  },

  closeDropdown: () => {
    set({ isDropdownOpen: false });
  },

  startPolling: () => {
    // Fetch immediately
    get().fetchNotifications(1, 5);
    
    // Then poll every 30 seconds (just unread count for efficiency)
    const intervalId = setInterval(() => {
      get().fetchUnreadCount();
    }, 30000);

    return () => clearInterval(intervalId);
  },

  reset: () => {
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      isDropdownOpen: false,
      hasMore: true,
      page: 1,
    });
  },
}));

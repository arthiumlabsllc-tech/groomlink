import { create } from 'zustand';
import apiClient from '../lib/api';

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
  
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  toggleDropdown: () => void;
  closeDropdown: () => void;
  startPolling: () => () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isDropdownOpen: false,

  fetchNotifications: async () => {
    try {
      set({ isLoading: true });
      const res = await apiClient.get('/notifications');
      const { notifications, unreadCount } = res.data.data;
      set({ notifications, unreadCount, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
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

  toggleDropdown: () => {
    set((state) => ({ isDropdownOpen: !state.isDropdownOpen }));
  },

  closeDropdown: () => {
    set({ isDropdownOpen: false });
  },

  startPolling: () => {
    // Fetch immediately
    get().fetchNotifications();
    
    // Then poll every 30 seconds
    const intervalId = setInterval(() => {
      get().fetchNotifications();
    }, 30000);

    return () => clearInterval(intervalId);
  },
}));

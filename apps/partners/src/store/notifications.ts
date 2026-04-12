import { create } from 'zustand';
import { api } from '../lib/api';
import type { Notification } from '../lib/api';

export type { Notification };

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
      const response = await api.getNotifications();
      if (response.success) {
        const { notifications, unreadCount } = response.data;
        set({ notifications, unreadCount, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
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

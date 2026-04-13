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
    // Check for token before making API call to prevent race condition
    if (!api.getToken()) {
      console.log('Notifications: No auth token found - skipping fetch');
      return;
    }

    try {
      set({ isLoading: true });
      const response = await api.getNotifications();
      if (response.success && response.data) {
        // Ensure notifications is always an array and unreadCount is a number
        const notifications = Array.isArray(response.data.notifications) ? response.data.notifications : [];
        const unreadCount = typeof response.data.unreadCount === 'number' ? response.data.unreadCount : 0;
        set({ notifications, unreadCount, isLoading: false });
      } else {
        // If response is not successful or data is missing, reset to defaults
        set({ notifications: [], unreadCount: 0, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ notifications: [], unreadCount: 0, isLoading: false });
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
    // Check for token before starting polling
    if (!api.getToken()) {
      console.log('Notifications: No auth token found - not starting polling');
      // Return a no-op cleanup function
      return () => {};
    }

    // Fetch immediately
    get().fetchNotifications();

    // Then poll every 30 seconds
    const intervalId = setInterval(() => {
      // Check token on each poll in case user logged out
      if (api.getToken()) {
        get().fetchNotifications();
      }
    }, 30000);

    return () => clearInterval(intervalId);
  },
}));

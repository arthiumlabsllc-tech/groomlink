import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationType =
  | 'booking_new'
  | 'booking_confirmed'
  | 'booking_checkin'
  | 'booking_completed'
  | 'booking_cancelled'
  | 'booking_rejected'
  | 'booking_no_show'
  | 'slot_updated'
  | 'review_new'
  | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  serverId?: string;
  data?: {
    bookingId?: string;
    customerName?: string;
    serviceName?: string;
    amount?: number;
    reviewId?: string;
    [key: string]: any;
  };
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  serverUnreadCount: number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'timestamp'> & Partial<Pick<AppNotification, 'timestamp'>>) => void;
  setNotifications: (notifications: AppNotification[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  setServerUnreadCount: (count: number) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      serverUnreadCount: 0,

      addNotification: (notification) => {
        const newNotification: AppNotification = {
          ...notification,
          id: notification.serverId || `local-${Date.now()}`,
          timestamp: notification.timestamp ?? new Date().toISOString(),
          read: false,
        };

        set((state) => {
          // Deduplicate by serverId if present
          const existing = state.notifications.find(
            (n) => n.serverId && n.serverId === newNotification.serverId
          );
          if (existing) return state;

          const notifications = [newNotification, ...state.notifications];
          const trimmed = notifications.length > 200 ? notifications.slice(0, 200) : notifications;
          return {
            notifications: trimmed,
            unreadCount: trimmed.filter((n) => !n.read).length,
          };
        });
      },

      setNotifications: (notifications) => {
        set((state) => {
          // Merge server notifications with local-only ones (no serverId)
          const localOnly = state.notifications.filter((n) => !n.serverId);
          const serverIds = new Set(notifications.map((n) => n.serverId));
          const localNotOnServer = localOnly.filter((n) => !serverIds.has(n.id));
          const merged = [...notifications, ...localNotOnServer].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          const trimmed = merged.length > 200 ? merged.slice(0, 200) : merged;
          return {
            notifications: trimmed,
            unreadCount: trimmed.filter((n) => !n.read).length,
          };
        });
      },

      markAsRead: (id) => {
        set((state) => {
          const notifications = state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          );
          return {
            notifications,
            unreadCount: notifications.filter((n) => !n.read).length,
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
          serverUnreadCount: 0,
        }));
      },

      setServerUnreadCount: (count) => {
        set({ serverUnreadCount: count });
      },

      clearAll: () => {
        set({
          notifications: [],
          unreadCount: 0,
          serverUnreadCount: 0,
        });
      },
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

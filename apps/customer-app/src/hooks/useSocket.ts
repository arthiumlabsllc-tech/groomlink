import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { useNotificationStore } from '../store/notificationStore';

const SOCKET_URL = 'https://groomlinkgh.com';

interface UseSocketOptions {
  salonId?: string;
  userId?: string;
  onSlotUpdated?: (data: { salonId: string; date: string }) => void;
  onBookingConfirmed?: (data: { bookingId: string }) => void;
  onBookingRejected?: (data: { bookingId: string; reason?: string }) => void;
  onNotification?: (data: any) => void;
}

interface SocketEvents {
  'slot:updated': (data: { salonId: string; date: string }) => void;
  'booking:confirmed': (data: { bookingId: string }) => void;
  'booking:rejected': (data: { bookingId: string; reason?: string }) => void;
  'notification:created': (data: any) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return;

    try {
      const token = await SecureStore.getItemAsync('accessToken');
      
      socketRef.current = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
      });

      socketRef.current.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.log('Socket connection error:', error.message);
        setIsConnected(false);
      });

      // Join user-specific room for notifications
      if (options.userId) {
        socketRef.current.emit('join:user', options.userId);
      }

      // Join salon room if provided
      if (options.salonId) {
        socketRef.current.emit('join:salon', { salonId: options.salonId });
      }

      // Listen for notification events
      socketRef.current.on('notification:created', (notification) => {
        useNotificationStore.getState().addNotification(notification);

        // Fire a local system notification if the app is in foreground
        Notifications.scheduleNotificationAsync({
          content: {
            title: notification.title || 'New Notification',
            body: notification.message || '',
            data: notification.data || {},
            sound: true,
          },
          trigger: null,
        }).catch((e: any) => console.log('Failed to show local notification:', e));

        options.onNotification?.(notification);
      });

      // Set up event listeners
      if (options.onSlotUpdated) {
        socketRef.current.on('slot:updated', (data) => {
          setLastUpdate(new Date());
          options.onSlotUpdated?.(data);
        });
      }

      // Enhance booking events to also add to notification store
      if (options.onBookingConfirmed) {
        socketRef.current.on('booking:confirmed', (data) => {
          options.onBookingConfirmed?.(data);
        });
      }

      if (options.onBookingRejected) {
        socketRef.current.on('booking:rejected', (data) => {
          options.onBookingRejected?.(data);
        });
      }
    } catch (error) {
      console.error('Failed to connect socket:', error);
    }
  }, [options]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const joinSalonRoom = useCallback((salonId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join:salon', { salonId });
    }
  }, []);

  const leaveSalonRoom = useCallback((salonId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave:salon', { salonId });
    }
  }, []);

  const joinUserRoom = useCallback((userId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join:user', userId);
    }
  }, []);

  const leaveUserRoom = useCallback((userId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave:user', userId);
    }
  }, []);

  // Auto-connect on mount if salonId is provided
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Join salon room when salonId changes
  useEffect(() => {
    if (options.salonId && isConnected) {
      joinSalonRoom(options.salonId);
    }

    return () => {
      if (options.salonId) {
        leaveSalonRoom(options.salonId);
      }
    };
  }, [options.salonId, isConnected, joinSalonRoom, leaveSalonRoom]);

  return {
    isConnected,
    lastUpdate,
    connect,
    disconnect,
    joinSalonRoom,
    leaveSalonRoom,
    joinUserRoom,
    leaveUserRoom,
  };
}

export default useSocket;

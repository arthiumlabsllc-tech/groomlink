import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '../store/notificationStore';

// Socket server origin. Sockets connect directly to the API host because the
// Vercel-hosted landing domain cannot proxy WebSocket upgrades.
const SOCKET_URL = 'https://api.groomlinkgh.com';

interface UseSocketOptions {
  salonId?: string;
  userId?: string;
  onSlotUpdated?: (data: { salonId: string; date: string }) => void;
  onBookingConfirmed?: (data: { bookingId: string }) => void;
  onBookingRejected?: (data: { bookingId: string; reason?: string }) => void;
  onNotification?: (data: any) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  // Store callbacks in refs to avoid recreating the socket on every render
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  // Store salonId and userId as refs to track changes without triggering reconnect
  const salonIdRef = useRef(options.salonId);
  const userIdRef = useRef(options.userId);

  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return;

    try {
      const token = await SecureStore.getItemAsync('accessToken');
      
      socketRef.current = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);

        // Join rooms on connect/reconnect
        if (userIdRef.current && socketRef.current) {
          socketRef.current.emit('join:user', userIdRef.current);
        }
        if (salonIdRef.current && socketRef.current) {
          socketRef.current.emit('join:salon', { salonId: salonIdRef.current });
        }
      });

      socketRef.current.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.log('Socket connection error:', error.message);
        setIsConnected(false);
      });

      // Listen for notification events (backend notification service emits these)
      socketRef.current.on('notification:created', (notification) => {
        useNotificationStore.getState().addNotification(notification);
        callbacksRef.current.onNotification?.(notification);
      });

      // Set up event listeners using ref-based callbacks (stable references)
      socketRef.current.on('slot:updated', (data) => {
        setLastUpdate(new Date());
        callbacksRef.current.onSlotUpdated?.(data);
      });

      socketRef.current.on('booking:confirmed', (data) => {
        callbacksRef.current.onBookingConfirmed?.(data);
      });

      socketRef.current.on('booking:rejected', (data) => {
        callbacksRef.current.onBookingRejected?.(data);
      });

      // ── Booking lifecycle listeners ──────────────────────────────

      // Booking cancelled (emitted to user room by backend)
      socketRef.current.on('booking:cancelled', (data) => {
        queryClient.invalidateQueries({ queryKey: ['booking', data.bookingId] });
        queryClient.invalidateQueries({ queryKey: ['bookings'] });

        if (AppState.currentState === 'active') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Booking Cancelled',
              body: data.message || 'Your booking has been cancelled.',
              data: { type: 'booking_cancelled', bookingId: data.bookingId },
              sound: true,
            },
            trigger: null,
          }).catch((e: any) => console.log('Failed to show cancellation notification:', e));
        }
      });

      // Booking completed (emitted to salon room by backend)
      socketRef.current.on('booking:completed', (data) => {
        queryClient.invalidateQueries({ queryKey: ['booking', data.bookingId] });
        queryClient.invalidateQueries({ queryKey: ['bookings'] });

        if (AppState.currentState === 'active') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Service Completed',
              body: data.message || 'Your service has been completed. Please confirm and rate your experience.',
              data: { type: 'booking_completed', bookingId: data.bookingId },
              sound: true,
            },
            trigger: null,
          }).catch((e: any) => console.log('Failed to show completion notification:', e));
        }
      });

      // Booking check-in (emitted to salon and customer user rooms by backend)
      socketRef.current.on('booking:checkin', (data) => {
        queryClient.invalidateQueries({ queryKey: ['booking', data.bookingId] });
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        // The "Checked In" badge on the booking detail screen reads from
        // the queue-position query — refresh it too
        queryClient.invalidateQueries({ queryKey: ['queue-position', data.bookingId] });

        if (AppState.currentState === 'active') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Checked In',
              body: data.message || 'You have been checked in. Your service will begin shortly.',
              data: { type: 'booking_checkin', bookingId: data.bookingId },
              sound: true,
            },
            trigger: null,
          }).catch((e: any) => console.log('Failed to show check-in notification:', e));
        }
      });

      // Booking no-show (emitted to salon room by backend scheduler)
      socketRef.current.on('booking:noShow', (data) => {
        queryClient.invalidateQueries({ queryKey: ['booking', data.bookingId] });
        queryClient.invalidateQueries({ queryKey: ['bookings'] });

        if (AppState.currentState === 'active') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'No-Show Recorded',
              body: data.message || 'You were marked as a no-show. This affects your account standing.',
              data: { type: 'booking_no_show', bookingId: data.bookingId },
              sound: true,
            },
            trigger: null,
          }).catch((e: any) => console.log('Failed to show no-show notification:', e));
        }
      });

      // ── Completion reminder listeners ───────────────────────────

      // Completion reminder: gentle nudge to confirm service
      socketRef.current.on('booking:completion_reminder', (data) => {
        queryClient.invalidateQueries({ queryKey: ['booking', data.bookingId] });
        queryClient.invalidateQueries({ queryKey: ['bookings'] });

        if (AppState.currentState === 'active') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Service Completion Reminder',
              body: data.message || 'Please confirm your service completion.',
              data: { type: 'booking_completion_reminder', bookingId: data.bookingId },
              sound: true,
            },
            trigger: null,
          }).catch((e: any) => console.log('Failed to show completion reminder:', e));
        }
      });

      // Completion urgent: funds will auto-release soon
      socketRef.current.on('booking:completion_urgent', (data) => {
        queryClient.invalidateQueries({ queryKey: ['booking', data.bookingId] });
        queryClient.invalidateQueries({ queryKey: ['bookings'] });

        if (AppState.currentState === 'active') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'URGENT: Confirm Service',
              body: data.message || 'Confirm service completion or funds will be auto-released.',
              data: { type: 'booking_completion_urgent', bookingId: data.bookingId },
              sound: true,
            },
            trigger: null,
          }).catch((e: any) => console.log('Failed to show urgent completion notification:', e));
        }
      });

      // ── Appointment reminder listeners ─────────────────────────

      // Booking reminder: appointment reminder from backend
      socketRef.current.on('booking:reminder', (data) => {
        queryClient.invalidateQueries({ queryKey: ['booking', data.bookingId] });
        queryClient.invalidateQueries({ queryKey: ['bookings'] });

        if (AppState.currentState === 'active') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Appointment Reminder',
              body: data.message || 'You have an upcoming appointment.',
              data: { type: 'booking_reminder', bookingId: data.bookingId },
              sound: true,
            },
            trigger: null,
          }).catch((e: any) => console.log('Failed to show booking reminder:', e));
        }
      });

      // Upcoming reminder: 2-hour heads-up
      socketRef.current.on('reminder:upcoming', (data) => {
        queryClient.invalidateQueries({ queryKey: ['booking', data.bookingId] });
        queryClient.invalidateQueries({ queryKey: ['bookings'] });

        if (AppState.currentState === 'active') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Upcoming Appointment',
              body: data.message || 'Your appointment is coming up in 2 hours.',
              data: { type: 'reminder_upcoming', bookingId: data.bookingId },
              sound: true,
            },
            trigger: null,
          }).catch((e: any) => console.log('Failed to show upcoming reminder:', e));
        }
      });
    } catch (error) {
      console.error('Failed to connect socket:', error);
    }
  }, []); // No dependencies - connect is stable

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

  // Connect on mount, disconnect on unmount (runs only once)
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Handle salonId changes - join/leave rooms without reconnecting
  useEffect(() => {
    const prevSalonId = salonIdRef.current;
    salonIdRef.current = options.salonId;

    if (isConnected && socketRef.current?.connected) {
      // Leave old room
      if (prevSalonId && prevSalonId !== options.salonId) {
        leaveSalonRoom(prevSalonId);
      }
      // Join new room
      if (options.salonId && options.salonId !== prevSalonId) {
        joinSalonRoom(options.salonId);
      }
    }
  }, [options.salonId, isConnected, joinSalonRoom, leaveSalonRoom]);

  // Handle userId changes
  useEffect(() => {
    userIdRef.current = options.userId;
    if (options.userId && isConnected && socketRef.current?.connected) {
      joinUserRoom(options.userId);
    }
  }, [options.userId, isConnected, joinUserRoom]);

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

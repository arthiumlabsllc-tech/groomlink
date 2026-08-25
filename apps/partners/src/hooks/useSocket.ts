/**
 * Socket.io hook for real-time notifications
 * Handles connection to the API server and event listeners for booking events
 */
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../lib/api';
import { useNotificationSound } from './useNotificationSound';

// Socket event types
export interface BookingNewEvent {
  booking: {
    id: string;
    customer: {
      firstName: string;
      lastName: string;
    };
    service: {
      name: string;
    };
    startTime: string;
    date: string;
  };
}

export interface BookingCheckinEvent {
  bookingId: string;
  customerName: string;
  serviceName: string;
  queuePosition: number;
}

export interface BookingCompletedEvent {
  bookingId: string;
  customerName: string;
  serviceName: string;
  totalAmount: string;
}

export interface SocketEvents {
  onBookingNew?: (data: BookingNewEvent) => void;
  onBookingCheckin?: (data: BookingCheckinEvent) => void;
  onBookingCompleted?: (data: BookingCompletedEvent) => void;
  onQueueJoined?: (data: any) => void;
  onQueueCompleted?: (data: any) => void;
  onQueueUpdated?: (data: any) => void;
}

interface UseSocketOptions extends SocketEvents {
  salonId: string | null;
  enabled?: boolean;
  showBrowserNotifications?: boolean;
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('Browser notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Show a browser notification
 */
export function showBrowserNotification(title: string, options: NotificationOptions = {}) {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/logo-black.png',
      badge: '/logo-black.png',
      requireInteraction: false,
      ...options,
    });

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    return notification;
  }
  return null;
}

/**
 * Socket.io hook for real-time updates
 */
export function useSocket({
  salonId,
  enabled = true,
  showBrowserNotifications = true,
  onBookingNew,
  onBookingCheckin,
  onBookingCompleted,
  onQueueJoined,
  onQueueCompleted,
  onQueueUpdated,
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const { playBookingSound, playCheckinSound, playCompletionSound } = useNotificationSound();
  const notificationPermissionRequested = useRef(false);

  // Request notification permission on mount
  useEffect(() => {
    if (showBrowserNotifications && !notificationPermissionRequested.current) {
      notificationPermissionRequested.current = true;
      requestNotificationPermission();
    }
  }, [showBrowserNotifications]);

  // Connect to socket
  useEffect(() => {
    if (!enabled || !salonId) {
      return;
    }

    const token = localStorage.getItem('auth_token');
    
    // Create socket connection
    const socket = io(API_BASE_URL.replace('/api', ''), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      // Join the salon room
      socket.emit('join:salon', salonId);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Booking events
    socket.on('booking:new', (data: BookingNewEvent) => {
      console.log('New booking received:', data);
      
      // Play sound
      playBookingSound();
      
      // Show browser notification
      if (showBrowserNotifications) {
        const customerName = `${data.booking.customer.firstName} ${data.booking.customer.lastName}`;
        showBrowserNotification('New Booking!', {
          body: `${customerName} booked ${data.booking.service.name}`,
          tag: `booking-new-${data.booking.id}`,
        });
      }
      
      // Call custom handler
      onBookingNew?.(data);
    });

    socket.on('booking:checkin', (data: BookingCheckinEvent) => {
      console.log('Customer checked in:', data);
      
      // Play sound
      playCheckinSound();
      
      // Show browser notification
      if (showBrowserNotifications) {
        showBrowserNotification('Customer Checked In', {
          body: `${data.customerName} checked in for ${data.serviceName}. Queue position: ${data.queuePosition}`,
          tag: `booking-checkin-${data.bookingId}`,
        });
      }
      
      // Call custom handler
      onBookingCheckin?.(data);
    });

    socket.on('booking:completed', (data: BookingCompletedEvent) => {
      console.log('Booking completed:', data);
      
      // Play sound
      playCompletionSound();
      
      // Show browser notification
      if (showBrowserNotifications) {
        showBrowserNotification('Service Completed', {
          body: `${data.customerName} - ${data.serviceName} completed. Amount: GHS ${data.totalAmount}`,
          tag: `booking-completed-${data.bookingId}`,
        });
      }
      
      // Call custom handler
      onBookingCompleted?.(data);
    });

    // Queue events
    socket.on('queue:joined', (data: any) => {
      console.log('Queue joined:', data);
      onQueueJoined?.(data);
    });

    socket.on('queue:completed', (data: any) => {
      console.log('Queue completed:', data);
      onQueueCompleted?.(data);
    });

    socket.on('queue:updated', (data: any) => {
      console.log('Queue updated:', data);
      onQueueUpdated?.(data);
    });

    // Cleanup on unmount
    return () => {
      if (socket.connected) {
        socket.emit('leave:salon', salonId);
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [
    salonId,
    enabled,
    showBrowserNotifications,
    playBookingSound,
    playCheckinSound,
    playCompletionSound,
    onBookingNew,
    onBookingCheckin,
    onBookingCompleted,
    onQueueJoined,
    onQueueCompleted,
    onQueueUpdated,
  ]);

  // Return socket instance and utility functions
  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false,
    emit,
    disconnect,
    requestNotificationPermission,
    showBrowserNotification,
  };
}

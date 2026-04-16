/**
 * Socket.io hook for real-time notifications in mobile app
 * Handles connection to the API server and event listeners for booking events
 */
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { useNotificationSound } from './useNotificationSound';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = 'https://groomlinkgh.com';

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
}

/**
 * Socket.io hook for real-time updates on mobile
 */
export function useSocket({
  salonId,
  enabled = true,
  onBookingNew,
  onBookingCheckin,
  onBookingCompleted,
  onQueueJoined,
  onQueueCompleted,
  onQueueUpdated,
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const { playBookingSound, playCheckinSound, playCompletionSound } = useNotificationSound();

  // Connect to socket
  useEffect(() => {
    if (!enabled || !salonId) {
      return;
    }

    let isMounted = true;

    const connectSocket = async () => {
      try {
        const token = await SecureStore.getItemAsync('accessToken');
        
        if (!token) {
          console.log('No auth token found, skipping socket connection');
          return;
        }

        // Create socket connection
        const socket = io(API_BASE_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });

        if (!isMounted) return;
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
          
          // Call custom handler
          onBookingNew?.(data);
        });

        socket.on('booking:checkin', (data: BookingCheckinEvent) => {
          console.log('Customer checked in:', data);
          
          // Play sound
          playCheckinSound();
          
          // Call custom handler
          onBookingCheckin?.(data);
        });

        socket.on('booking:completed', (data: BookingCompletedEvent) => {
          console.log('Booking completed:', data);
          
          // Play sound
          playCompletionSound();
          
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
      } catch (error) {
        console.error('Failed to connect socket:', error);
      }
    };

    connectSocket();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.emit('leave:salon', salonId);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [
    salonId,
    enabled,
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
  };
}

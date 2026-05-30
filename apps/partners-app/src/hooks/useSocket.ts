/**
 * Socket.io hook for real-time notifications in mobile app
 * Handles connection to the API server and event listeners for booking events
 * Uses useRef pattern to prevent infinite reconnection loops.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

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
 * Socket.io hook for real-time updates on mobile.
 * Callbacks are stored in refs so the socket won't reconnect when they change.
 */
export function useSocket(options: UseSocketOptions) {
  const { salonId, enabled = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Store callbacks in refs so socket listeners always use the latest
  // without triggering reconnections.
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  // Track salonId changes for room management without reconnecting
  const salonIdRef = useRef(salonId);

  // Stable connect function - no dependencies that change per render
  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return;

    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        console.log('No auth token found, skipping socket connection');
        return;
      }

      const socket = io(API_BASE_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        setIsConnected(true);
        // Join salon room on connect/reconnect
        const currentSalonId = salonIdRef.current;
        if (currentSalonId) {
          socket.emit('join:salon', currentSalonId);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
      });

      // Booking events - use callbacksRef.current for always-latest handlers
      socket.on('booking:new', (data: BookingNewEvent) => {
        console.log('New booking received:', data);
        callbacksRef.current.onBookingNew?.(data);
      });

      socket.on('booking:checkin', (data: BookingCheckinEvent) => {
        console.log('Customer checked in:', data);
        callbacksRef.current.onBookingCheckin?.(data);
      });

      socket.on('booking:completed', (data: BookingCompletedEvent) => {
        console.log('Booking completed:', data);
        callbacksRef.current.onBookingCompleted?.(data);
      });

      // Queue events
      socket.on('queue:joined', (data: any) => {
        console.log('Queue joined:', data);
        callbacksRef.current.onQueueJoined?.(data);
      });

      socket.on('queue:completed', (data: any) => {
        console.log('Queue completed:', data);
        callbacksRef.current.onQueueCompleted?.(data);
      });

      socket.on('queue:updated', (data: any) => {
        console.log('Queue updated:', data);
        callbacksRef.current.onQueueUpdated?.(data);
      });
    } catch (error) {
      console.error('Failed to connect socket:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      const currentSalonId = salonIdRef.current;
      if (currentSalonId) {
        socketRef.current.emit('leave:salon', currentSalonId);
      }
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Connect on mount when enabled, disconnect on unmount
  useEffect(() => {
    if (!enabled || !salonId) {
      // If was connected but now disabled, disconnect
      if (socketRef.current) {
        disconnect();
      }
      return;
    }

    connect();

    return () => {
      disconnect();
    };
  }, [enabled, !!salonId, connect, disconnect]);

  // Handle salonId changes - join/leave rooms without reconnecting
  useEffect(() => {
    const prevSalonId = salonIdRef.current;
    salonIdRef.current = salonId;

    if (!isConnected || !socketRef.current?.connected) return;

    // Leave old room
    if (prevSalonId && prevSalonId !== salonId) {
      socketRef.current.emit('leave:salon', prevSalonId);
    }
    // Join new room
    if (salonId && salonId !== prevSalonId) {
      socketRef.current.emit('join:salon', salonId);
    }
  }, [salonId, isConnected]);

  // Utility emit function
  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    emit,
    disconnect,
  };
}

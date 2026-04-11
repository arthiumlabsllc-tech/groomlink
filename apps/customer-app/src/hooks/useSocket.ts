import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const SOCKET_URL = 'https://groomlinkgh.com';

interface UseSocketOptions {
  salonId?: string;
  onSlotUpdated?: (data: { salonId: string; date: string }) => void;
  onBookingConfirmed?: (data: { bookingId: string }) => void;
  onBookingRejected?: (data: { bookingId: string; reason?: string }) => void;
}

interface SocketEvents {
  'slot:updated': (data: { salonId: string; date: string }) => void;
  'booking:confirmed': (data: { bookingId: string }) => void;
  'booking:rejected': (data: { bookingId: string; reason?: string }) => void;
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

      // Set up event listeners
      if (options.onSlotUpdated) {
        socketRef.current.on('slot:updated', (data) => {
          setLastUpdate(new Date());
          options.onSlotUpdated?.(data);
        });
      }

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
  };
}

export default useSocket;

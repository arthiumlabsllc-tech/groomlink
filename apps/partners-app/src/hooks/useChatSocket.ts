import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

// Socket server origin. Sockets connect directly to the API host because the
// Vercel-hosted landing domain cannot proxy WebSocket upgrades.
const SOCKET_URL = 'https://api.groomlinkgh.com';

interface UseChatSocketOptions {
  ticketId: string | null;
  userId?: string;
  onMessageReceived?: (message: any) => void;
  onTicketCreated?: (ticket: any) => void;
}

export function useChatSocket(options: UseChatSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

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
        console.log('Chat socket connected');
        setIsConnected(true);

        if (optionsRef.current.userId && socketRef.current) {
          socketRef.current.emit('join:user', optionsRef.current.userId);
        }

        if (optionsRef.current.ticketId && socketRef.current) {
          socketRef.current.emit('join:ticket', optionsRef.current.ticketId);
        }
      });

      socketRef.current.on('disconnect', () => {
        console.log('Chat socket disconnected');
        setIsConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.log('Chat socket connection error:', error.message);
        setIsConnected(false);
      });

      socketRef.current.on('chat:message:new', (payload: { ticketId: string; message: any }) => {
        console.log('New message received:', payload);
        optionsRef.current.onMessageReceived?.(payload.message);
      });

      socketRef.current.on('chat:ticket:created', (payload: any) => {
        console.log('New ticket created:', payload);
        optionsRef.current.onTicketCreated?.(payload);
      });
    } catch (error) {
      console.error('Failed to connect chat socket:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const joinTicketRoom = useCallback((ticketId: string) => {
    if (socketRef.current?.connected) {
      const currentTicket = optionsRef.current.ticketId;
      if (currentTicket) {
        socketRef.current.emit('leave:ticket', currentTicket);
      }
      socketRef.current.emit('join:ticket', ticketId);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  useEffect(() => {
    if (options.ticketId && isConnected && socketRef.current?.connected) {
      joinTicketRoom(options.ticketId);
    }
  }, [options.ticketId, isConnected, joinTicketRoom]);

  return {
    isConnected,
    connect,
    disconnect,
    joinTicketRoom,
  };
}

export default useChatSocket;

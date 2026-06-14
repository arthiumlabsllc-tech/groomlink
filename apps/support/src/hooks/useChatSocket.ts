import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface ChatSocketHandlers {
  onTicketCreated?: (payload: any) => void;
  onMessageNew?: (payload: { ticketId: string; message: any }) => void;
  onTyping?: (payload: { ticketId: string; userId: string; isTyping: boolean; userName?: string }) => void;
}

/**
 * Connects to the API Socket.io server, joins the global "support" room and
 * (optionally) a per-ticket room. Cleans up automatically on unmount or when
 * the ticketId changes.
 */
export function useChatSocket(
  apiBaseUrl: string,
  ticketId: string | null,
  handlers: ChatSocketHandlers,
) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Establish the connection once per apiBaseUrl
  useEffect(() => {
    // Strip trailing /api so we connect to the socket origin
    const origin = apiBaseUrl.replace(/\/api\/?$/, '') || window.location.origin;
    const socket = io(origin, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:support');
    });

    socket.on('chat:ticket:created', (payload: any) => {
      handlersRef.current.onTicketCreated?.(payload);
    });

    socket.on('chat:message:new', (payload: any) => {
      handlersRef.current.onMessageNew?.(payload);
    });

    socket.on('chat:typing', (payload: { ticketId: string; userId: string; isTyping: boolean; userName?: string }) => {
      handlersRef.current.onTyping?.(payload);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [apiBaseUrl]);

  // Join / leave the per-ticket room when the open thread changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    if (ticketId) {
      const join = () => socket.emit('join:ticket', ticketId);
      if (socket.connected) {
        join();
      } else {
        socket.once('connect', join);
      }
    }
    return () => {
      if (ticketId && socket.connected) {
        socket.emit('leave:ticket', ticketId);
      }
    };
  }, [ticketId]);

  // Return socket ref so caller can emit typing events
  return socketRef;
}

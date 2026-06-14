import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatApi, ChatMessage, ChatTicket } from '../api/chat';
import { useChatSocket } from './useChatSocket';
import { useAuthStore } from '../store/authStore';

interface SavedSession {
  ticketId: string;
}

const SESSION_STORAGE_KEY = 'chat_session_v1';

export function useChat() {
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SavedSession | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTicket, setActiveTicket] = useState<ChatTicket | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const saved = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.ticketId) {
            setSession(parsed);
            setHasSession(true);
            loadTicketMessages(parsed.ticketId);
          }
        }
      } catch (err) {
        console.error('Failed to load chat session:', err);
      }
    };
    loadSession();
  }, []);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const response = await chatApi.getUnreadCount();
        if (response.success) {
          setUnreadCount(response.data.count || 0);
        }
      } catch (err) {
        console.error('Failed to load unread count:', err);
      }
    };
    if (user) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const { isConnected } = useChatSocket({
    ticketId: session?.ticketId || null,
    userId: user?.id,
    onMessageReceived: (message: ChatMessage) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      if (!open) {
        setUnreadCount((prev) => prev + 1);
      }
    },
    onTicketCreated: (ticket: any) => {
      console.log('New ticket created:', ticket);
    },
  });

  const loadTicketMessages = useCallback(async (ticketId: string) => {
    try {
      const response = await chatApi.getTicket(ticketId);
      if (response.success && Array.isArray(response.data.messages)) {
        setMessages(response.data.messages);
        setActiveTicket(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load ticket messages:', err);
      setError('Failed to load conversation history');
    }
  }, []);

  useEffect(() => {
    if (open) {
      setUnreadCount(0);
      if (session?.ticketId) {
        chatApi.markAsRead(session.ticketId).catch(() => {});
      }
    }
  }, [open, session]);

  const saveSession = async (newSession: SavedSession) => {
    try {
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    } catch (err) {
      console.error('Failed to save session:', err);
    }
  };

  const clearSession = async () => {
    try {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear session:', err);
    }
  };

  const startConversation = async (subject: string, message: string) => {
    if (!message.trim() || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await chatApi.createTicket({
        subject: subject.slice(0, 60),
        initialMessage: message.trim(),
      });

      if (response.success) {
        const newSession: SavedSession = {
          ticketId: response.data.id,
        };
        saveSession(newSession);
        setSession(newSession);
        setHasSession(true);
        
        if (Array.isArray(response.data.messages)) {
          setMessages(response.data.messages);
        }
        
        setDraft('');
      }
    } catch (err: any) {
      setError(err?.message || 'Could not start chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!session || !draft.trim() || loading) return;
    
    setLoading(true);
    setError(null);
    const content = draft.trim();
    setDraft('');
    
    try {
      const response = await chatApi.sendMessage(session.ticketId, content);
      
      if (response.success) {
        const sentMessage: ChatMessage = {
          id: response.data.id || `tmp-${Date.now()}`,
          content,
          isFromUser: true,
          createdAt: response.data.createdAt || new Date().toISOString(),
        };
        
        setMessages((prev) => {
          if (prev.find((m) => m.id === sentMessage.id)) return prev;
          return [...prev, sentMessage];
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Send failed.');
      setDraft(content);
    } finally {
      setLoading(false);
    }
  };

  const endChat = () => {
    clearSession();
    setSession(null);
    setHasSession(false);
    setMessages([]);
    setActiveTicket(null);
    setOpen(false);
  };

  const toggleOpen = () => {
    setOpen((prev) => !prev);
  };

  return {
    open,
    setOpen,
    toggleOpen,
    messages,
    draft,
    setDraft,
    loading,
    error,
    unreadCount,
    hasSession,
    activeTicket,
    isConnected,
    startConversation,
    sendMessage,
    endChat,
    loadTicketMessages,
  };
}

export default useChat;

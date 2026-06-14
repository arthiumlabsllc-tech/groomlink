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
  const messagesEndRef = useRef<null>(null);

  // Load saved session from storage
  useEffect(() => {
    const loadSession = async () => {
      try {
        const saved = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.ticketId) {
            setSession(parsed);
            setHasSession(true);
            // Load existing messages
            loadTicketMessages(parsed.ticketId);
          }
        }
      } catch (err) {
        console.error('Failed to load chat session:', err);
      }
    };
    loadSession();
  }, []);

  // Load unread count
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
      // Refresh every 30 seconds
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Socket connection for real-time messages
  const { isConnected } = useChatSocket({
    ticketId: session?.ticketId || null,
    userId: user?.id,
    onMessageReceived: (message: ChatMessage) => {
      // Append message if it belongs to current session
      setMessages((prev) => {
        if (prev.find((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      
      // Update unread count if chat is not open
      if (!open) {
        setUnreadCount((prev) => prev + 1);
      }
    },
    onTicketCreated: (ticket: any) => {
      console.log('New ticket created:', ticket);
    },
  });

  // Load ticket messages
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

  // Scroll to bottom when messages change
  useEffect(() => {
    if (open && messages.length > 0) {
      // React Native ScrollView will handle scrolling
      // This is just a placeholder for future scroll logic
    }
  }, [messages, open]);

  // Reset unread count when opening chat
  useEffect(() => {
    if (open) {
      setUnreadCount(0);
      if (session?.ticketId) {
        chatApi.markAsRead(session.ticketId).catch(() => {});
      }
    }
  }, [open, session]);

  // Save session to storage
  const saveSession = async (newSession: SavedSession) => {
    try {
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    } catch (err) {
      console.error('Failed to save session:', err);
    }
  };

  // Clear session from storage
  const clearSession = async () => {
    try {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear session:', err);
    }
  };

  // Start new conversation
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

  // Send message
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
      setDraft(content); // Restore draft on failure
    } finally {
      setLoading(false);
    }
  };

  // End chat (clear session)
  const endChat = () => {
    clearSession();
    setSession(null);
    setHasSession(false);
    setMessages([]);
    setActiveTicket(null);
    setOpen(false);
  };

  // Toggle chat open/close
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
    messagesEndRef,
  };
}

export default useChat;

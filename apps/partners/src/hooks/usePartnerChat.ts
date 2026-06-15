import React, { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

// ============================================================
// GroomLink Chat Widget Hook (Partners - salon owners/staff)
// ============================================================
// Hook that manages chat session for logged-in partners.
// - Uses authenticated API endpoints (/api/me/support/tickets)
// - Tags conversations with source: PARTNERS_WEB
// - Persists active ticketId in localStorage
// - Plays notification sound when agent replies

const API_BASE =
  import.meta.env?.VITE_API_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://groomlinkgh.com/api');

const STORAGE_KEY = 'groomlink_chat_partners';

// Notification sound utility
let audioContext: AudioContext | null = null;
function playNotificationSound() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    console.warn('Notification sound failed:', e);
  }
}

function initAudio() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Audio init failed:', e);
    }
  }
}

interface ChatMessage {
  id: string;
  content: string;
  isFromUser: boolean;
  createdAt: string;
}

interface SavedSession {
  ticketId: string;
}

function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}

function saveSession(s: SavedSession) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota errors */
  }
}

function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export interface UsePartnerChatReturn {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  messages: ChatMessage[];
  draft: string;
  setDraft: (v: string) => void;
  loading: boolean;
  error: string | null;
  unread: number;
  hasSession: boolean;
  startConversation: (subject: string, message: string) => Promise<void>;
  sendMessage: () => Promise<void>;
  endChat: () => void;
  loadExistingTicket: (ticketId: string) => Promise<void>;
}

export function usePartnerChat(): UsePartnerChatReturn {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SavedSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [hasSession, setHasSession] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Restore prior session on mount
  useEffect(() => {
    const s = loadSession();
    if (s) {
      setSession(s);
      setHasSession(true);
    }
    // Initialize audio on first user interaction
    const init = () => {
      initAudio();
      document.removeEventListener('click', init);
    };
    document.addEventListener('click', init);
  }, []);

  // Poll for messages while session exists
  useEffect(() => {
    if (!session) return;

    const token = api.getToken();
    if (!token) return;

    let cancelled = false;
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_BASE}/me/support/tickets/${session.ticketId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          clearSession();
          if (!cancelled) {
            setSession(null);
            setHasSession(false);
            setMessages([]);
          }
          return;
        }
        const json = await res.json();
        if (!cancelled && json.success && Array.isArray(json.data?.messages)) {
          const newMsgs: ChatMessage[] = json.data.messages;
          setMessages((prev) => {
            // Play sound and bump unread if new agent messages arrived
            if (newMsgs.length > prev.length) {
              const added = newMsgs.slice(prev.length).filter((m) => !m.isFromUser);
              if (added.length > 0) {
                playNotificationSound();
                if (!open) {
                  setUnread((u) => u + added.length);
                }
              }
            }
            return newMsgs;
          });
        }
      } catch {
        /* network blip - silent retry */
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, open ? 3000 : 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session, open]);

  // Scroll to bottom
  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Reset unread when opening
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const startConversation = async (subject: string, message: string) => {
    const token = api.getToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/me/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: subject.slice(0, 60),
          initialMessage: message.slice(0, 500),
          source: 'PARTNERS_WEB',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error?.message || 'Could not start chat');
      }
      const newSession: SavedSession = {
        ticketId: json.data.id,
      };
      saveSession(newSession);
      setSession(newSession);
      setHasSession(true);
      if (Array.isArray(json.data.messages)) {
        setMessages(json.data.messages);
      }
      setDraft('');
    } catch (err: any) {
      setError(err?.message || 'Could not start chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!session || !draft.trim()) return;
    const token = api.getToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    const content = draft.trim();
    setDraft('');
    try {
      const res = await fetch(`${API_BASE}/me/support/tickets/${session.ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error?.message || 'Send failed');
      }
      const sent: ChatMessage = {
        id: json.data?.id || `tmp-${Date.now()}`,
        content,
        isFromUser: true,
        createdAt: json.data?.createdAt || new Date().toISOString(),
      };
      setMessages((prev) => (prev.find((m) => m.id === sent.id) ? prev : [...prev, sent]));
      // Trigger an immediate poll to pick up the AI response
      const pToken = api.getToken();
      if (pToken) {
        setTimeout(() => {
          fetch(`${API_BASE}/me/support/tickets/${session.ticketId}`, {
            headers: { Authorization: `Bearer ${pToken}` },
          }).then(r => r.json()).then(j => {
            if (j.success && Array.isArray(j.data?.messages)) {
              setMessages(j.data.messages);
            }
          }).catch(() => {});
        }, 500);
      }
    } catch (err: any) {
      setError(err?.message || 'Send failed.');
      setDraft(content);
    } finally {
      setLoading(false);
    }
  };

  const endChat = () => {
    if (!confirm('End this conversation? You can always start a new one.')) return;
    clearSession();
    setSession(null);
    setHasSession(false);
    setMessages([]);
    setOpen(false);
  };

  const loadExistingTicket = async (ticketId: string) => {
    const token = api.getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/me/support/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.messages)) {
        const newSession: SavedSession = { ticketId };
        saveSession(newSession);
        setSession(newSession);
        setHasSession(true);
        setMessages(json.data.messages);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  return {
    open,
    setOpen,
    messages,
    draft,
    setDraft,
    loading,
    error,
    unread,
    hasSession,
    startConversation,
    sendMessage,
    endChat,
    loadExistingTicket,
  };
}

import { useEffect, useRef, useState } from 'react';

// ============================================================
// GroomLink Chat Widget (Landing - guest visitors)
// ============================================================
// Floating chat bubble that lets anonymous visitors talk to support.
// - First message collects name + optional email and creates a guest ticket.
// - Token + ticketId persisted in localStorage so refreshes resume the chat.
// - Polls /api/guest/support/tickets/:id every 3s while open.

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://groomlinkgh.com/api');

const STORAGE_KEY = 'groomlink_chat_landing';

interface ChatMessage {
  id: string;
  content: string;
  isFromUser: boolean;
  createdAt: string;
}

interface SavedSession {
  ticketId: string;
  token: string;
  guestName?: string;
  guestEmail?: string;
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

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SavedSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Restore prior session on mount
  useEffect(() => {
    const s = loadSession();
    if (s) {
      setSession(s);
      setName(s.guestName || '');
      setEmail(s.guestEmail || '');
    }
  }, []);

  // Poll for new messages while session exists
  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    const fetchMessages = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/guest/support/tickets/${session.ticketId}`,
          { headers: { Authorization: `Bearer ${session.token}` } },
        );
        if (res.status === 401 || res.status === 403) {
          // Token expired or invalid - clear session
          clearSession();
          if (!cancelled) {
            setSession(null);
            setMessages([]);
          }
          return;
        }
        const json = await res.json();
        if (!cancelled && json.success && Array.isArray(json.data?.messages)) {
          const newMsgs: ChatMessage[] = json.data.messages;
          setMessages((prev) => {
            // Bump unread count if new agent messages arrived while closed
            if (!open && newMsgs.length > prev.length) {
              const added = newMsgs.slice(prev.length).filter((m) => !m.isFromUser).length;
              if (added > 0) setUnread((u) => u + added);
            }
            return newMsgs;
          });
        }
      } catch {
        /* network blip - silent retry next tick */
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, open ? 3000 : 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session, open]);

  // Scroll to bottom when messages change & open
  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Reset unread when opening
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const startConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !name.trim() || !email.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/guest/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: name.trim(),
          guestEmail: email.trim(),
          subject: draft.trim().slice(0, 60),
          message: draft.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error?.message || 'Could not start chat');
      }
      const newSession: SavedSession = {
        ticketId: json.data.ticket.id,
        token: json.data.guestToken,
        guestName: name.trim(),
        guestEmail: email.trim(),
      };
      saveSession(newSession);
      setSession(newSession);
      // Seed the message list with the initial message that came back
      if (Array.isArray(json.data.ticket.messages)) {
        setMessages(json.data.ticket.messages);
      }
      setDraft('');
    } catch (err: any) {
      setError(err?.message || 'Could not start chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !draft.trim() || loading) return;
    setLoading(true);
    setError(null);
    const content = draft.trim();
    setDraft('');
    try {
      const res = await fetch(
        `${API_BASE}/guest/support/tickets/${session.ticketId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({ content }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error?.message || 'Send failed');
      }
      // Optimistically append
      const sent: ChatMessage = {
        id: json.data?.id || `tmp-${Date.now()}`,
        content,
        isFromUser: true,
        createdAt: json.data?.createdAt || new Date().toISOString(),
      };
      setMessages((prev) =>
        prev.find((m) => m.id === sent.id) ? prev : [...prev, sent],
      );
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
    setMessages([]);
    setOpen(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#006B3F] hover:bg-[#005232] text-white shadow-2xl flex items-center justify-center transition-all hover:scale-105 md:bottom-8 md:right-8"
        aria-label={open ? 'Close support chat' : 'Open support chat'}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
        {unread > 0 && !open && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center border-2 border-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 w-[calc(100%-2rem)] max-w-sm md:right-8 md:bottom-28 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200" style={{ height: '520px', maxHeight: '80vh' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#006B3F] to-[#004d2d] text-white px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">GroomLink Support</p>
              <p className="text-xs opacity-80">We typically reply in a few minutes</p>
            </div>
            {session && (
              <button
                onClick={endChat}
                className="text-xs underline opacity-80 hover:opacity-100"
              >
                End chat
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto bg-gray-50 px-3 py-3 space-y-2">
            {!session ? (
              <div className="text-center text-sm text-gray-500 mt-6">
                <p className="mb-2">👋 Hi there! How can we help you today?</p>
                <p className="text-xs text-gray-400">
                  Tell us your name and we'll connect you with our team.
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-sm text-gray-500 mt-6">Loading…</div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.isFromUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                      m.isFromUser
                        ? 'bg-[#006B3F] text-white rounded-br-sm'
                        : 'bg-white text-gray-900 rounded-bl-sm shadow-sm border border-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border-t border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Composer */}
          {!session ? (
            <form onSubmit={startConversation} className="border-t border-gray-200 p-3 space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name *"
                required
                maxLength={80}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder="Email *"
                maxLength={120}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30"
              />
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="How can we help?"
                rows={2}
                required
                maxLength={1500}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30"
              />
              <button
                type="submit"
                disabled={loading || !draft.trim() || !name.trim() || !email.trim()}
                className="w-full bg-[#006B3F] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#005232] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Connecting…' : 'Start chat'}
              </button>
            </form>
          ) : (
            <form onSubmit={sendMessage} className="border-t border-gray-200 p-3 flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e as any);
                  }
                }}
                placeholder="Type a message…"
                rows={1}
                maxLength={1500}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30"
              />
              <button
                type="submit"
                disabled={loading || !draft.trim()}
                className="bg-[#006B3F] text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-[#005232] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Send"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}

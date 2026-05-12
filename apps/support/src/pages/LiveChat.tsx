import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Icon from '../components/Icon';
import { api, API_BASE_URL } from '../api';
import { useChatSocket } from '../hooks/useChatSocket';
import { cn } from '../lib';
import { playNotificationSound, initNotificationSound } from '../utils/notificationSound';

interface ChatMessage {
  id: string;
  content: string;
  isFromUser: boolean;
  createdAt: string;
  sender?: { firstName?: string; lastName?: string } | null;
}

interface ChatThread {
  id: string;
  subject: string;
  status: string;
  source: string;
  unreadByAgent: number;
  unreadByUser: number;
  lastMessageAt: string;
  createdAt: string;
  guestName?: string | null;
  guestEmail?: string | null;
  user?: { id: string; firstName: string; lastName: string; email: string } | null;
  lastMessage?: { content: string; isFromUser: boolean; createdAt: string } | null;
}

const sourceLabel: Record<string, string> = {
  LANDING: 'Landing (guest)',
  CUSTOMER_WEB: 'Customer web',
  CUSTOMER_APP: 'Customer app',
  PARTNERS_WEB: 'Partners web',
  PARTNERS_APP: 'Partners app',
  OTHER: 'Other',
};

function formatThreadName(t: ChatThread): string {
  if (t.user) return `${t.user.firstName} ${t.user.lastName}`.trim();
  if (t.guestName) return t.guestName;
  if (t.guestEmail) return t.guestEmail;
  return 'Anonymous visitor';
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function LiveChat() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loadingList, setLoadingList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize notification sound on first user interaction
  useEffect(() => {
    initNotificationSound();
  }, []);

  const loadThreads = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await api.getLiveChatThreads({
        source: sourceFilter,
        status: statusFilter,
        q: search,
      });
      if (res.success) setThreads(res.data);
    } catch (e) {
      console.error('Failed to load threads', e);
    } finally {
      setLoadingList(false);
    }
  }, [sourceFilter, statusFilter, search]);

  const loadThread = useCallback(async (id: string) => {
    try {
      const res = await api.getTicketById(id);
      if (res.success) {
        setActiveTicket(res.data);
        setMessages(res.data.messages || []);
        await api.markThreadRead(id);
        setThreads((prev) =>
          prev.map((t) => (t.id === id ? { ...t, unreadByAgent: 0 } : t)),
        );
      }
    } catch (e) {
      console.error('Failed to load thread', e);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (activeId) loadThread(activeId);
  }, [activeId, loadThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useChatSocket(API_BASE_URL, activeId, {
    onTicketCreated: () => {
      // Play notification sound for new chat
      playNotificationSound();
      loadThreads();
    },
    onMessageNew: ({ ticketId, message }) => {
      // Play notification sound if message is from user and agent is not viewing this thread
      if (message.isFromUser && ticketId !== activeId) {
        playNotificationSound();
      }
      
      // Append to the open thread
      if (ticketId === activeId) {
        setMessages((prev) =>
          prev.find((m) => m.id === message.id) ? prev : [...prev, message],
        );
        // Auto mark-read since the agent is looking at it
        api.markThreadRead(ticketId).catch(() => {});
      }
      // Bubble it to the top of the sidebar list and bump unread counter
      setThreads((prev) => {
        const existing = prev.find((t) => t.id === ticketId);
        if (!existing) {
          loadThreads();
          return prev;
        }
        const updated: ChatThread = {
          ...existing,
          lastMessageAt: message.createdAt,
          unreadByAgent:
            ticketId === activeId
              ? 0
              : message.isFromUser
                ? existing.unreadByAgent + 1
                : existing.unreadByAgent,
          lastMessage: {
            content: message.content,
            isFromUser: message.isFromUser,
            createdAt: message.createdAt,
          },
        };
        return [updated, ...prev.filter((t) => t.id !== ticketId)];
      });
    },
  });

  const handleSend = async () => {
    if (!activeId || !reply.trim() || sending) return;
    setSending(true);
    try {
      const res = await api.sendTicketMessage(activeId, reply.trim());
      if (res.success) {
        setMessages((prev) =>
          prev.find((m) => m.id === res.data.id) ? prev : [...prev, res.data as ChatMessage],
        );
        setReply('');
      }
    } catch (e) {
      console.error('Send failed', e);
    } finally {
      setSending(false);
    }
  };

  const filteredThreads = useMemo(() => threads, [threads]);

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6">
      {/* Sidebar - thread list */}
      <aside className="w-80 lg:w-96 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Live Chat</h2>
            <button
              onClick={loadThreads}
              className="text-gray-500 hover:text-ghana-green transition-colors"
              aria-label="Refresh"
            >
              <Icon name="refresh" size={18} />
            </button>
          </div>
          <div className="relative">
            <Icon
              name="search"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ghana-green/30"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5"
            >
              <option value="ALL">All sources</option>
              <option value="LANDING">Landing</option>
              <option value="CUSTOMER_WEB">Customer web</option>
              <option value="CUSTOMER_APP">Customer app</option>
              <option value="PARTNERS_WEB">Partners web</option>
              <option value="PARTNERS_APP">Partners app</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5"
            >
              <option value="ALL">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList && filteredThreads.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">Loading…</div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No conversations yet.
            </div>
          ) : (
            filteredThreads.map((t) => {
              const isActive = t.id === activeId;
              const hasUnread = t.unreadByAgent > 0;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors',
                    isActive && 'bg-ghana-green/5 border-l-4 border-l-ghana-green',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            'truncate text-sm',
                            hasUnread ? 'font-semibold text-gray-900' : 'text-gray-800',
                          )}
                        >
                          {formatThreadName(t)}
                        </p>
                        {hasUnread && (
                          <span className="flex-shrink-0 bg-ghana-green text-white text-[10px] px-1.5 py-0.5 rounded-full">
                            {t.unreadByAgent}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {sourceLabel[t.source] || t.source} · {t.subject}
                      </p>
                      {t.lastMessage && (
                        <p className="text-xs text-gray-600 mt-1 truncate">
                          {t.lastMessage.isFromUser ? '' : 'You: '}
                          {t.lastMessage.content}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {formatTime(t.lastMessageAt)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main thread view */}
      <section className="flex-1 flex flex-col bg-gray-50">
        {!activeId || !activeTicket ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <Icon name="chat" size={48} className="mb-3 text-gray-300" />
            <p className="text-sm">Select a conversation to start replying.</p>
          </div>
        ) : (
          <>
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {activeTicket.user
                    ? `${activeTicket.user.firstName} ${activeTicket.user.lastName}`
                    : activeTicket.guestName || activeTicket.guestEmail || 'Anonymous visitor'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {activeTicket.subject} ·{' '}
                  <span className="capitalize">{activeTicket.status?.replace('_', ' ').toLowerCase()}</span>
                </p>
              </div>
              {activeTicket.user?.email || activeTicket.guestEmail ? (
                <span className="text-xs text-gray-500">
                  {activeTicket.user?.email || activeTicket.guestEmail}
                </span>
              ) : null}
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn('flex', m.isFromUser ? 'justify-start' : 'justify-end')}
                >
                  <div
                    className={cn(
                      'max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm',
                      m.isFromUser
                        ? 'bg-white text-gray-900 rounded-bl-sm'
                        : 'bg-ghana-green text-white rounded-br-sm',
                    )}
                  >
                    <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                    <p
                      className={cn(
                        'text-[10px] mt-1',
                        m.isFromUser ? 'text-gray-400' : 'text-white/70',
                      )}
                    >
                      {formatTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t border-gray-200 px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a reply… (Enter to send, Shift+Enter for newline)"
                  rows={2}
                  className="flex-1 resize-none px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ghana-green/30"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !reply.trim()}
                  className="bg-ghana-green text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-support-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

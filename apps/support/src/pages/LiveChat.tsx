import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Icon from '../components/Icon';
import { api, API_BASE_URL } from '../api';
import { useChatSocket } from '../hooks/useChatSocket';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib';
import { playNotificationSound, initNotificationSound, fireDesktopNotification } from '../utils/notificationSound';
import { QUICK_REPLIES } from '../utils/quickReplies';

// ── Interfaces ──────────────────────────────────────────────
interface ChatMessage {
  id: string;
  content: string;
  isFromUser: boolean;
  createdAt: string;
  readAt?: string | null;
  sender?: { id?: string; firstName?: string; lastName?: string; avatar?: string | null } | null;
}

interface ChatThread {
  id: string;
  subject: string;
  status: string;
  priority?: string;
  source: string;
  unreadByAgent: number;
  unreadByUser: number;
  lastMessageAt: string;
  createdAt: string;
  guestName?: string | null;
  guestEmail?: string | null;
  user?: { id: string; firstName: string; lastName: string; email: string; phoneNumber?: string } | null;
  lastMessage?: { content: string; isFromUser: boolean; createdAt: string } | null;
}

interface AgentInfo {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

// ── Helpers ─────────────────────────────────────────────────
const sourceLabel: Record<string, string> = {
  LANDING: 'Landing (guest)',
  CUSTOMER_WEB: 'Customer web',
  CUSTOMER_APP: 'Customer app',
  PARTNERS_WEB: 'Partners web',
  PARTNERS_APP: 'Partners app',
  OTHER: 'Other',
};

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
const DEPARTMENTS = ['General', 'Billing', 'Technical', 'Escalations'];

function formatThreadName(t: ChatThread): string {
  if (t.user) return `${t.user.firstName} ${t.user.lastName}`.trim();
  if (t.guestName) return t.guestName;
  if (t.guestEmail) return t.guestEmail;
  return 'Anonymous visitor';
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getDateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function statusColor(status: string): string {
  switch (status) {
    case 'OPEN': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    case 'IN_PROGRESS': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
    case 'RESOLVED': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    case 'CLOSED': return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  }
}

function priorityDot(priority?: string): string {
  switch (priority) {
    case 'HIGH': return 'bg-red-500';
    case 'MEDIUM': return 'bg-yellow-400';
    case 'LOW': return 'bg-gray-400';
    default: return 'bg-gray-300 dark:bg-gray-600';
  }
}

// ── Main Component ──────────────────────────────────────────
export default function LiveChat() {
  const { user: agent } = useAuth();
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

  // UI state
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showAssignDrop, setShowAssignDrop] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [customerTyping, setCustomerTyping] = useState(false);

  // Agent status
  const [agentStatus, setAgentStatus] = useState<'ONLINE' | 'AWAY' | 'OFFLINE'>('ONLINE');
  const [showStatusDrop, setShowStatusDrop] = useState(false);

  // Transfer form
  const [transferAgent, setTransferAgent] = useState('');
  const [transferDept, setTransferDept] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferring, setTransferring] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const threadListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { initNotificationSound(); }, []);

  // Load agent list once
  useEffect(() => {
    api.getUsers(1, 50, 'SUPPORT_AGENT').then(res => {
      if (res.success) setAgents(res.data.map((u: any) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email })));
    }).catch(() => {});
    // Load agent status
    api.getAgentProfile().then(res => {
      if (res.success && res.data.settings?.status) setAgentStatus(res.data.settings.status);
    }).catch(() => {});
  }, []);

  // ── Data loading ──────────────────────────────────────────
  const loadThreads = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await api.getLiveChatThreads({ source: sourceFilter, status: statusFilter, q: search });
      if (res.success) setThreads(res.data);
    } catch (e) { console.error('Failed to load threads', e); }
    finally { setLoadingList(false); }
  }, [sourceFilter, statusFilter, search]);

  const loadThread = useCallback(async (id: string) => {
    try {
      const res = await api.getTicketById(id);
      if (res.success) {
        setActiveTicket(res.data);
        setMessages(res.data.messages || []);
        await api.markThreadRead(id);
        setThreads(prev => prev.map(t => t.id === id ? { ...t, unreadByAgent: 0 } : t));
      }
    } catch (e) { console.error('Failed to load thread', e); }
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => { if (activeId) loadThread(activeId); }, [activeId, loadThread]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Socket ────────────────────────────────────────────────
  const socketRef = useChatSocket(API_BASE_URL, activeId, {
    onTicketCreated: () => {
      playNotificationSound();
      fireDesktopNotification('New Live Chat', 'A new support conversation has been started.');
      loadThreads();
    },
    onMessageNew: ({ ticketId, message }) => {
      if (message.isFromUser && ticketId !== activeId) {
        playNotificationSound();
        const thread = threads.find(t => t.id === ticketId);
        const senderName = thread ? formatThreadName(thread) : 'Customer';
        fireDesktopNotification(`New message from ${senderName}`, message.content?.substring(0, 100) || 'New message');
      }
      if (ticketId === activeId) {
        setMessages(prev => prev.find(m => m.id === message.id) ? prev : [...prev, message]);
        api.markThreadRead(ticketId).catch(() => {});
        // Customer sent a message, stop their typing indicator
        if (message.isFromUser) setCustomerTyping(false);
      }
      setThreads(prev => {
        const existing = prev.find(t => t.id === ticketId);
        if (!existing) { loadThreads(); return prev; }
        const updated: ChatThread = {
          ...existing,
          lastMessageAt: message.createdAt,
          unreadByAgent: ticketId === activeId ? 0 : message.isFromUser ? existing.unreadByAgent + 1 : existing.unreadByAgent,
          lastMessage: { content: message.content, isFromUser: message.isFromUser, createdAt: message.createdAt },
        };
        return [updated, ...prev.filter(t => t.id !== ticketId)];
      });
    },
    onTyping: ({ ticketId, isTyping }) => {
      if (ticketId === activeId) setCustomerTyping(isTyping);
    },
  });

  // ── Typing indicator (agent side) ─────────────────────────
  const emitTyping = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !activeId) return;
    socket.emit('typing:start', { ticketId: activeId, userName: agent ? `${agent.firstName} ${agent.lastName}` : 'Agent' });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { ticketId: activeId });
    }, 3000);
  }, [activeId, agent, socketRef]);

  // ── Actions ───────────────────────────────────────────────
  const handleSend = async () => {
    if (!activeId || !reply.trim() || sending) return;
    setSending(true);
    try {
      const res = await api.sendTicketMessage(activeId, reply.trim());
      if (res.success) {
        setMessages(prev => prev.find(m => m.id === res.data.id) ? prev : [...prev, res.data as ChatMessage]);
        setReply('');
        if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
        // Stop typing
        socketRef.current?.emit('typing:stop', { ticketId: activeId });
      }
    } catch (e) { console.error('Send failed', e); }
    finally { setSending(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!activeId) return;
    try {
      await api.updateTicketStatus(activeId, newStatus);
      setActiveTicket((prev: any) => prev ? { ...prev, status: newStatus } : prev);
      setThreads(prev => prev.map(t => t.id === activeId ? { ...t, status: newStatus } : t));
    } catch (e) { console.error('Status update failed', e); }
  };

  const handleAssign = async (agentId?: string) => {
    if (!activeId) return;
    try {
      await api.assignTicket(activeId, agentId);
      const assigned = agents.find(a => a.id === agentId);
      setActiveTicket((prev: any) => prev ? { ...prev, assignedTo: assigned ? { id: assigned.id, firstName: assigned.firstName, lastName: assigned.lastName } : null } : prev);
      setShowAssignDrop(false);
    } catch (e) { console.error('Assign failed', e); }
  };

  const handleTransfer = async () => {
    if (!activeId || (!transferAgent && !transferDept)) return;
    setTransferring(true);
    try {
      await api.transferChat(activeId, { toAgentId: transferAgent || undefined, department: transferDept || undefined, reason: transferReason || undefined });
      setShowTransferModal(false);
      setTransferAgent(''); setTransferDept(''); setTransferReason('');
      loadThread(activeId);
    } catch (e) { console.error('Transfer failed', e); }
    finally { setTransferring(false); }
  };

  const handleAgentStatusChange = async (status: 'ONLINE' | 'AWAY' | 'OFFLINE') => {
    setAgentStatus(status);
    setShowStatusDrop(false);
    try { await api.updateAgentStatus({ status }); } catch (e) { console.error('Status change failed', e); }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReply(e.target.value);
    emitTyping();
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeId && document.activeElement?.tagName !== 'TEXTAREA') {
        setActiveId(null); setShowInfoPanel(false);
      }
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        const idx = threads.findIndex(t => t.id === activeId);
        const next = e.key === 'ArrowUp' ? Math.max(0, idx - 1) : Math.min(threads.length - 1, idx + 1);
        if (threads[next]) setActiveId(threads[next].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeId, threads]);

  // Computed
  const totalUnread = useMemo(() => threads.reduce((s, t) => s + t.unreadByAgent, 0), [threads]);

  // Date-grouped messages
  const groupedMessages = useMemo(() => {
    const groups: { label: string; messages: ChatMessage[] }[] = [];
    let lastLabel = '';
    for (const m of messages) {
      const label = getDateLabel(m.createdAt);
      if (label !== lastLabel) { groups.push({ label, messages: [m] }); lastLabel = label; }
      else { groups[groups.length - 1].messages.push(m); }
    }
    return groups;
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-80 lg:w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Live Chat</h2>
              {threads.length > 0 && (
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">{threads.length}</span>
              )}
              {totalUnread > 0 && (
                <span className="text-xs bg-ghana-green text-white px-2 py-0.5 rounded-full font-medium">{totalUnread} new</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Agent status */}
              <div className="relative">
                <button onClick={() => setShowStatusDrop(!showStatusDrop)} className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Agent status">
                  <span className={cn('w-2 h-2 rounded-full', agentStatus === 'ONLINE' ? 'bg-green-500' : agentStatus === 'AWAY' ? 'bg-yellow-500' : 'bg-gray-400')} />
                  <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{agentStatus.toLowerCase()}</span>
                </button>
                {showStatusDrop && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1">
                    {(['ONLINE', 'AWAY', 'OFFLINE'] as const).map(s => (
                      <button key={s} onClick={() => handleAgentStatusChange(s)} className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2', agentStatus === s && 'font-semibold')}>
                        <span className={cn('w-2 h-2 rounded-full', s === 'ONLINE' ? 'bg-green-500' : s === 'AWAY' ? 'bg-yellow-500' : 'bg-gray-400')} />
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={loadThreads} className="text-gray-500 dark:text-gray-400 hover:text-ghana-green transition-colors" aria-label="Refresh">
                <Icon name="refresh" size={18} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations…" className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-ghana-green/30 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
          </div>
          <div className="flex gap-2">
            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 dark:text-white">
              <option value="ALL">All sources</option>
              <option value="LANDING">Landing</option>
              <option value="CUSTOMER_WEB">Customer web</option>
              <option value="CUSTOMER_APP">Customer app</option>
              <option value="PARTNERS_WEB">Partners web</option>
              <option value="PARTNERS_APP">Partners app</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 dark:text-white">
              <option value="ALL">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>
        {/* Thread list */}
        <div ref={threadListRef} className="flex-1 overflow-y-auto">
          {loadingList && threads.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          ) : threads.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">No conversations yet.</div>
          ) : (
            threads.map(t => {
              const isActive = t.id === activeId;
              const hasUnread = t.unreadByAgent > 0;
              const name = formatThreadName(t);
              return (
                <button key={t.id} onClick={() => setActiveId(t.id)} className={cn(
                  'w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                  isActive && 'bg-ghana-green/5 dark:bg-ghana-green/10 border-l-4 border-l-ghana-green',
                )}>
                  <div className="flex items-start gap-3">
                    {/* Avatar initial */}
                    <div className={cn('w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold text-white',
                      hasUnread ? 'bg-ghana-green' : 'bg-gray-400 dark:bg-gray-600'
                    )}>{getInitials(name)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className={cn('truncate text-sm flex-1', hasUnread ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-300')}>{name}</p>
                        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', priorityDot(t.priority))} title={t.priority || 'Medium'} />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{sourceLabel[t.source] || t.source} · {t.subject}</p>
                      {t.lastMessage && (
                        <p className={cn('text-xs mt-1 truncate', hasUnread ? 'font-medium text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400')}>
                          {t.lastMessage.isFromUser ? '' : 'You: '}{t.lastMessage.content}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{formatRelativeTime(t.lastMessageAt)}</span>
                      {hasUnread && (
                        <span className="bg-ghana-green text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">{t.unreadByAgent}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Main chat area ──────────────────────────────────── */}
      <section className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 min-w-0">
        {!activeId || !activeTicket ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 px-8">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Icon name="forum" size={40} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-base font-medium text-gray-500 dark:text-gray-400 mb-1">Select a conversation</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center max-w-xs">Choose a thread from the sidebar to start replying.</p>
            <div className="mt-6 text-xs text-gray-400 dark:text-gray-500 space-y-1 text-center">
              <p><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">↑↓</kbd> Navigate threads</p>
              <p><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">Esc</kbd> Deselect thread</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header with action toolbar */}
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-ghana-green flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {getInitials(activeTicket.user ? `${activeTicket.user.firstName} ${activeTicket.user.lastName}` : activeTicket.guestName || activeTicket.guestEmail || '?')}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {activeTicket.user ? `${activeTicket.user.firstName} ${activeTicket.user.lastName}` : activeTicket.guestName || activeTicket.guestEmail || 'Anonymous visitor'}
                    </h3>
                    {activeTicket.user?.email || activeTicket.guestEmail ? (
                      <span className="text-xs text-gray-500 dark:text-gray-400">{activeTicket.user?.email || activeTicket.guestEmail}</span>
                    ) : null}
                  </div>
                </div>
                {/* Action buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Status dropdown */}
                  <div className="relative">
                    <select value={activeTicket.status} onChange={e => handleStatusChange(e.target.value)} className={cn('text-xs rounded-full px-3 py-1 font-medium cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-ghana-green/30 appearance-none pr-6', statusColor(activeTicket.status))} style={{ backgroundImage: 'none' }}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  {/* Assign */}
                  <div className="relative">
                    <button onClick={() => setShowAssignDrop(!showAssignDrop)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors" title="Assign to agent">
                      <Icon name="person_add" size={18} />
                    </button>
                    {showAssignDrop && (
                      <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1 max-h-60 overflow-y-auto">
                        <button onClick={() => handleAssign(undefined)} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500">Unassign</button>
                        {agents.map(a => (
                          <button key={a.id} onClick={() => handleAssign(a.id)} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white">
                            {a.firstName} {a.lastName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Transfer */}
                  <button onClick={() => setShowTransferModal(true)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors" title="Transfer chat">
                    <Icon name="swap_horiz" size={18} />
                  </button>
                  {/* Info panel toggle */}
                  <button onClick={() => setShowInfoPanel(!showInfoPanel)} className={cn('p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors', showInfoPanel ? 'text-ghana-green' : 'text-gray-500 dark:text-gray-400')} title="Customer info">
                    <Icon name="info" size={18} />
                  </button>
                </div>
              </div>
              {activeTicket.assignedTo && (
                <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Assigned to <span className="font-medium text-gray-700 dark:text-gray-300">{activeTicket.assignedTo.firstName} {activeTicket.assignedTo.lastName}</span>
                </div>
              )}
            </header>

            <div className="flex flex-1 min-h-0">
              {/* Messages area */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 overflow-y-auto p-6 space-y-1">
                  {groupedMessages.map((group, gi) => (
                    <div key={gi}>
                      {/* Date divider */}
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium px-2">{group.label}</span>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                      </div>
                      {group.messages.map(m => {
                        const isAgent = !m.isFromUser;
                        const senderName = m.sender ? `${m.sender.firstName || ''} ${m.sender.lastName || ''}`.trim() : (isAgent ? 'Agent' : 'Customer');
                        return (
                          <div key={m.id} className={cn('flex gap-2 mb-3', isAgent ? 'justify-end' : 'justify-start')}>
                            {/* User avatar (left) */}
                            {m.isFromUser && (
                              <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0 mt-0.5">
                                {getInitials(senderName)}
                              </div>
                            )}
                            <div className={cn('max-w-[65%]', isAgent && 'items-end')}>
                              {isAgent && m.sender && (
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5 text-right">{senderName}</p>
                              )}
                              <div className={cn(
                                'px-4 py-2.5 rounded-2xl shadow-sm',
                                isAgent
                                  ? 'bg-ghana-green text-white rounded-br-sm'
                                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm border border-gray-200 dark:border-gray-700',
                              )}>
                                <p className="whitespace-pre-wrap text-sm break-words">{m.content}</p>
                              </div>
                              <div className={cn('flex items-center gap-1 mt-0.5', isAgent ? 'justify-end' : 'justify-start')}>
                                <span className={cn('text-[10px]', isAgent ? 'text-gray-400 dark:text-gray-500' : 'text-gray-400 dark:text-gray-500')}>{formatTime(m.createdAt)}</span>
                                {/* Read receipt for agent messages */}
                                {isAgent && (
                                  <Icon name={m.readAt ? 'done_all' : 'done'} size={12} className={cn(m.readAt ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500')} />
                                )}
                              </div>
                            </div>
                            {/* Agent avatar (right) */}
                            {isAgent && (
                              <div className="w-7 h-7 rounded-full bg-ghana-green flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0 mt-0.5 overflow-hidden">
                                {m.sender?.avatar ? (
                                  <img src={m.sender.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  getInitials(senderName)
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {/* Typing indicator */}
                  {customerTyping && (
                    <div className="flex gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">
                        {getInitials(activeTicket.user ? `${activeTicket.user.firstName} ${activeTicket.user.lastName}` : activeTicket.guestName || '?')}
                      </div>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply area */}
                <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                  <div className="flex items-end gap-2">
                    {/* Quick replies */}
                    <div className="relative">
                      <button onClick={() => setShowQuickReplies(!showQuickReplies)} className={cn('p-2 rounded-lg transition-colors', showQuickReplies ? 'bg-ghana-green/10 text-ghana-green' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800')} title="Quick replies">
                        <Icon name="bolt" size={20} />
                      </button>
                      {showQuickReplies && (
                        <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1 max-h-60 overflow-y-auto">
                          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Quick Replies</div>
                          {QUICK_REPLIES.map((qr, i) => (
                            <button key={i} onClick={() => { setReply(qr.text); setShowQuickReplies(false); textareaRef.current?.focus(); }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white">
                              <span className="font-medium">{qr.label}</span>
                              <span className="block text-gray-400 dark:text-gray-500 truncate mt-0.5">{qr.text}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Textarea */}
                    <div className="flex-1 relative">
                      <textarea ref={textareaRef} value={reply} onChange={handleTextareaChange}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSend(); }
                        }}
                        placeholder="Type a reply… (Enter to send, Shift+Enter for newline)"
                        rows={1}
                        className="w-full resize-none px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-ghana-green/30 dark:bg-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 overflow-y-auto"
                        style={{ maxHeight: 140 }}
                      />
                      {reply.length > 0 && (
                        <span className="absolute right-2 bottom-2 text-[10px] text-gray-400 dark:text-gray-500">{reply.length}</span>
                      )}
                    </div>
                    {/* Send button */}
                    <button onClick={handleSend} disabled={sending || !reply.trim()} className="bg-ghana-green text-white p-2.5 rounded-xl hover:bg-support-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
                      {sending ? (
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      ) : (
                        <Icon name="send" size={20} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Info Panel (Task 2) ─────────────────────────── */}
              {showInfoPanel && (
                <aside className="w-72 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto flex-shrink-0">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Customer Info</h4>
                      <button onClick={() => setShowInfoPanel(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><Icon name="close" size={16} /></button>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-ghana-green flex items-center justify-center text-white text-lg font-semibold mb-2">
                        {getInitials(activeTicket.user ? `${activeTicket.user.firstName} ${activeTicket.user.lastName}` : activeTicket.guestName || activeTicket.guestEmail || '?')}
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {activeTicket.user ? `${activeTicket.user.firstName} ${activeTicket.user.lastName}` : activeTicket.guestName || 'Guest Visitor'}
                      </p>
                      {activeTicket.user?.email || activeTicket.guestEmail ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{activeTicket.user?.email || activeTicket.guestEmail}</p>
                      ) : null}
                      {activeTicket.user?.phoneNumber && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{activeTicket.user.phoneNumber}</p>
                      )}
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <InfoRow label="Source" value={sourceLabel[activeTicket.source] || activeTicket.source} />
                    <InfoRow label="Subject" value={activeTicket.subject} />
                    {activeTicket.category && <InfoRow label="Category" value={activeTicket.category} />}
                    <InfoRow label="Priority">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                        activeTicket.priority === 'HIGH' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                        activeTicket.priority === 'LOW' ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' :
                        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                      )}>{activeTicket.priority}</span>
                    </InfoRow>
                    <InfoRow label="Status">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statusColor(activeTicket.status))}>{activeTicket.status?.replace('_', ' ')}</span>
                    </InfoRow>
                    {activeTicket.assignedTo && (
                      <InfoRow label="Assigned" value={`${activeTicket.assignedTo.firstName} ${activeTicket.assignedTo.lastName}`} />
                    )}
                    <InfoRow label="Created" value={new Date(activeTicket.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} />
                    <InfoRow label="Last message" value={formatRelativeTime(activeTicket.lastMessageAt || activeTicket.updatedAt || activeTicket.createdAt)} />
                    <InfoRow label="Messages" value={String(messages.length)} />
                  </div>
                </aside>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── Transfer Modal (Task 1) ──────────────────────────── */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowTransferModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Transfer Conversation</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Agent</label>
                <select value={transferAgent} onChange={e => setTransferAgent(e.target.value)} className="w-full text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 dark:text-white">
                  <option value="">Select agent (optional)</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Department</label>
                <select value={transferDept} onChange={e => setTransferDept(e.target.value)} className="w-full text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 dark:text-white">
                  <option value="">Select department (optional)</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Reason</label>
                <textarea value={transferReason} onChange={e => setTransferReason(e.target.value)} rows={2} className="w-full text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 dark:text-white resize-none" placeholder="Optional reason for transfer…" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowTransferModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleTransfer} disabled={transferring || (!transferAgent && !transferDept)} className="px-4 py-2 text-sm bg-ghana-green text-white rounded-lg hover:bg-support-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {transferring ? 'Transferring…' : 'Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small helper component ──────────────────────────────────
function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{label}</span>
      {children || <span className="text-xs text-gray-900 dark:text-white text-right truncate">{value}</span>}
    </div>
  );
}

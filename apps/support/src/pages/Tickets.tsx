import { useState, useEffect } from 'react';
import { User, Clock, CheckCircle, AlertCircle, Send, X, ChevronLeft, MessageCircle } from 'lucide-react';
import { api } from '../api';
import { formatDateTime, getStatusColor, cn } from '../lib';

interface TicketData {
  id: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  category: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  messages?: {
    id: string;
    content: string;
    createdAt: string;
    sender: {
      firstName: string;
      lastName: string;
    };
  }[];
}

const statusTabs = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    LOW: 'bg-ghana-green/10 text-ghana-green border border-ghana-green/20',
    MEDIUM: 'bg-ghana-yellow/10 text-yellow-700 border border-ghana-yellow/30',
    HIGH: 'bg-ghana-red/10 text-ghana-red border border-ghana-red/20',
  };
  return colors[priority] || 'bg-gray-100 text-gray-700 border border-gray-200';
};

const getPriorityDot = (priority: string): string => {
  const colors: Record<string, string> = {
    LOW: 'bg-ghana-green',
    MEDIUM: 'bg-ghana-yellow',
    HIGH: 'bg-ghana-red',
  };
  return colors[priority] || 'bg-gray-400';
};

export default function Tickets() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const response = await api.getTickets(page, 20, selectedStatus || undefined);
      setTickets(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [page, selectedStatus]);

  const handleTicketClick = (ticket: TicketData) => {
    setSelectedTicket(ticket);
    setShowDetailView(true);
  };

  const handleBackToList = () => {
    setShowDetailView(false);
    setSelectedTicket(null);
  };

  // Mobile detail view
  if (showDetailView && selectedTicket) {
    return (
      <div className="space-y-4">
        {/* Mobile Back Button */}
        <button 
          onClick={handleBackToList}
          className="md:hidden flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to tickets
        </button>

        {/* Ticket Detail Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-ghana-green/5 to-transparent">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', getStatusColor(selectedTicket.status))}>
                    {selectedTicket.status}
                  </span>
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', getPriorityColor(selectedTicket.priority))}>
                    {selectedTicket.priority}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 font-heading">{selectedTicket.subject}</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedTicket.category}</p>
              </div>
              <button
                onClick={() => setShowDetailView(false)}
                className="hidden md:block p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* User info */}
          <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-ghana-green to-support-700 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {selectedTicket.user.firstName?.charAt(0)}{selectedTicket.user.lastName?.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {selectedTicket.user.firstName} {selectedTicket.user.lastName}
                </p>
                <p className="text-sm text-gray-500">{selectedTicket.user.phoneNumber}</p>
              </div>
              <div className="ml-auto text-sm text-gray-400">
                {formatDateTime(selectedTicket.createdAt)}
              </div>
            </div>
          </div>

          {/* Messages Thread */}
          <div className="p-5 space-y-4 max-h-[50vh] overflow-y-auto">
            {/* Original message */}
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="bg-gray-100 rounded-2xl rounded-tl-none p-4">
                  <p className="text-gray-700">{selectedTicket.description}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1 ml-1">{formatDateTime(selectedTicket.createdAt)}</p>
              </div>
            </div>

            {/* Conversation messages */}
            {selectedTicket.messages?.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                <div className="w-8 h-8 bg-ghana-green rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-xs">
                    {msg.sender.firstName?.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="bg-support-50 rounded-2xl rounded-tl-none p-4 border border-support-100">
                    <p className="text-gray-700">{msg.content}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 ml-1">
                    {msg.sender.firstName} • {formatDateTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply input */}
          <div className="p-5 border-t border-gray-100 bg-gray-50/30">
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your reply..."
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ghana-green focus:border-ghana-green transition-all"
              />
              <button className="bg-ghana-green text-white px-5 py-3 rounded-xl font-medium hover:bg-support-700 active:bg-support-800 transition-all flex items-center gap-2 shadow-md shadow-ghana-green/20">
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-ghana-green text-white rounded-lg font-medium hover:bg-support-700 transition-all text-sm">
                <CheckCircle className="w-4 h-4" />
                Resolve
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-ghana-yellow text-ghana-dark rounded-lg font-semibold hover:bg-yellow-400 transition-all text-sm">
                <AlertCircle className="w-4 h-4" />
                Escalate
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all text-sm">
                Close Ticket
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Support Tickets</h1>
        <p className="text-gray-500 mt-1">Manage customer support tickets.</p>
      </div>

      {/* Status Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
        <div className="flex flex-wrap gap-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedStatus(tab.value)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                selectedStatus === tab.value
                  ? "bg-ghana-green text-white shadow-md shadow-ghana-green/20"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ghana-green"></div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No tickets found</h3>
          <p className="text-gray-500">There are no support tickets matching your criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="p-5 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => handleTicketClick(ticket)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  {/* Priority dot */}
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <div className={cn('w-3 h-3 rounded-full', getPriorityDot(ticket.priority))}></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">{ticket.subject}</h3>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(ticket.status))}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ticket.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {ticket.user.firstName?.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium text-gray-700">{ticket.user.firstName} {ticket.user.lastName}</span>
                      </div>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDateTime(ticket.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="hidden sm:flex flex-col items-end gap-2">
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', getPriorityColor(ticket.priority))}>
                    {ticket.priority}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

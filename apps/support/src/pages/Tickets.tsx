import { useState, useEffect } from 'react';
import { Ticket, User, Clock, CheckCircle, AlertCircle } from 'lucide-react';
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

export default function Tickets() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
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

  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      LOW: 'bg-gray-100 text-gray-700',
      MEDIUM: 'bg-yellow-100 text-yellow-700',
      HIGH: 'bg-red-100 text-red-700',
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <p className="text-gray-500 mt-1">Manage customer support tickets.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-support-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-support-500"></div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No tickets found</h3>
          <p className="text-gray-500">There are no support tickets matching your criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                setSelectedTicket(ticket);
                setShowDetailModal(true);
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-support-100 rounded-lg flex items-center justify-center mt-1">
                    <Ticket className="w-5 h-5 text-support-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{ticket.subject}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ticket.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {ticket.user.firstName} {ticket.user.lastName}
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDateTime(ticket.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(ticket.status))}>
                    {ticket.status}
                  </span>
                  <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getPriorityColor(ticket.priority))}>
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
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedTicket.subject}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(selectedTicket.status))}>
                      {selectedTicket.status}
                    </span>
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getPriorityColor(selectedTicket.priority))}>
                      {selectedTicket.priority}
                    </span>
                    <span className="text-sm text-gray-500">{selectedTicket.category}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* User info */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {selectedTicket.user.firstName} {selectedTicket.user.lastName} • {selectedTicket.user.phoneNumber}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Original message */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">{selectedTicket.description}</p>
                <p className="text-xs text-gray-400 mt-2">{formatDateTime(selectedTicket.createdAt)}</p>
              </div>

              {/* Conversation */}
              {selectedTicket.messages?.map((msg) => (
                <div key={msg.id} className="border-l-2 border-support-500 pl-4">
                  <p className="text-gray-700">{msg.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {msg.sender.firstName} • {formatDateTime(msg.createdAt)}
                  </p>
                </div>
              ))}
            </div>

            {/* Reply input */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your reply..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-support-500 focus:border-transparent"
                />
                <button className="btn-primary">
                  Send
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn-secondary text-sm py-1.5">
                  <CheckCircle className="w-4 h-4 mr-1 inline" />
                  Mark Resolved
                </button>
                <button className="btn-secondary text-sm py-1.5">
                  <AlertCircle className="w-4 h-4 mr-1 inline" />
                  Escalate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

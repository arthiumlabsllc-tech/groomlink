import { useState } from 'react';
import { MessageCircle, CheckCircle, Clock, AlertCircle, Send, Loader2 } from 'lucide-react';
import { useTickets, useTicket, useUpdateTicketStatus, useSendTicketMessage } from '../hooks';
import { formatDate, getStatusColor } from '../lib/utils';

export function Support() {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const { data: ticketsData, isLoading } = useTickets(1, 20, 'OPEN');
  const { data: selectedTicket } = useTicket(selectedTicketId || '');
  const updateStatus = useUpdateTicketStatus();
  const sendMessage = useSendTicketMessage();

  const tickets = ticketsData?.data || [];
  const openCount = tickets.filter(t => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter(t => t.status === 'IN_PROGRESS').length;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !message.trim()) return;
    
    await sendMessage.mutateAsync({ id: selectedTicketId, content: message });
    setMessage('');
  };

  const handleResolve = async () => {
    if (!selectedTicketId) return;
    await updateStatus.mutateAsync({ id: selectedTicketId, status: 'RESOLVED' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-[#CE1126]" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Support Queue</h1>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg shadow-sm">
            <span className="text-sm text-red-600">Open:</span>
            <span className="text-lg font-semibold text-red-600">{openCount}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-lg shadow-sm">
            <span className="text-sm text-yellow-600">In Progress:</span>
            <span className="text-lg font-semibold text-yellow-600">{inProgressCount}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Active Tickets</h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                  selectedTicketId === ticket.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{ticket.subject}</p>
                    <p className="text-sm text-gray-500 mt-1">{ticket.user.firstName} {ticket.user.lastName}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs capitalize ${getStatusColor(ticket.priority)}`}>
                    {ticket.priority.toLowerCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-400">{formatDate(ticket.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm flex flex-col h-[600px]">
          {selectedTicketId && selectedTicket ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{selectedTicket.subject}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedTicket.user.firstName} {selectedTicket.user.lastName}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedTicket.status !== 'RESOLVED' && (
                    <button 
                      onClick={handleResolve}
                      disabled={updateStatus.isPending}
                      className="px-3 py-1 text-sm text-green-600 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50"
                    >
                      <CheckCircle size={16} className="inline mr-1" />
                      Resolve
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600 font-medium">Original Issue:</p>
                  <p className="text-sm text-gray-800">{selectedTicket.description}</p>
                </div>
                
                {selectedTicket.messages?.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex gap-3 ${msg.isFromUser ? '' : 'justify-end'}`}
                  >
                    {msg.isFromUser ? (
                      <>
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                          {msg.sender.firstName[0]}
                        </div>
                        <div className="bg-gray-100 rounded-lg p-3 max-w-[70%]">
                          <p className="text-sm text-gray-800">{msg.content}</p>
                          <span className="text-xs text-gray-400 mt-1">{formatDate(msg.createdAt)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="bg-blue-500 text-white rounded-lg p-3 max-w-[70%]">
                        <p className="text-sm">{msg.content}</p>
                        <span className="text-xs text-blue-200 mt-1">{formatDate(msg.createdAt)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Input */}
              {selectedTicket.status !== 'RESOLVED' && (
                <div className="p-4 border-t border-gray-100">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button 
                      type="submit"
                      disabled={sendMessage.isPending || !message.trim()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                      <Send size={20} />
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageCircle size={48} className="mx-auto mb-4" />
                <p>Select a ticket to view conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

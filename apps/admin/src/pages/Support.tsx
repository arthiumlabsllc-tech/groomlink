import { useState } from 'react';
import { MessageCircle, CheckCircle, Clock, Send, Loader2, ArrowLeft, User, Headphones } from 'lucide-react';
import { useTickets, useTicket, useUpdateTicketStatus, useSendTicketMessage } from '../hooks';
import { formatDate } from '../lib/utils';

export function Support() {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [showChat, setShowChat] = useState(false);

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
    setSelectedTicketId(null);
    setShowChat(false);
  };

  const getPriorityStyle = (priority: string) => {
    const styles: Record<string, { dot: string; bg: string; text: string }> = {
      URGENT: { dot: 'bg-[#CE1126]', bg: 'bg-[#CE1126]/10', text: 'text-[#CE1126]' },
      HIGH: { dot: 'bg-[#CE1126]', bg: 'bg-[#CE1126]/10', text: 'text-[#CE1126]' },
      MEDIUM: { dot: 'bg-[#FCD116]', bg: 'bg-[#FCD116]/20', text: 'text-[#B8960F]' },
      LOW: { dot: 'bg-[#006B3F]', bg: 'bg-[#006B3F]/10', text: 'text-[#006B3F]' },
    };
    return styles[priority] || styles.MEDIUM;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      OPEN: { bg: 'bg-[#CE1126]/10', text: 'text-[#CE1126]' },
      IN_PROGRESS: { bg: 'bg-[#FCD116]/20', text: 'text-[#B8960F]' },
      RESOLVED: { bg: 'bg-[#006B3F]/10', text: 'text-[#006B3F]' },
    };
    const style = styles[status] || styles.OPEN;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {status.replace('_', ' ').toLowerCase()}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="relative">
          <Loader2 className="animate-spin text-[#006B3F]" size={48} />
          <div className="absolute inset-0 animate-ping">
            <Loader2 className="text-[#FCD116] opacity-20" size={48} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Support Queue</h1>
          <p className="text-sm text-gray-500 mt-1">Manage customer support tickets</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#CE1126]/10 rounded-xl border border-[#CE1126]/20">
            <span className="w-2 h-2 rounded-full bg-[#CE1126]"></span>
            <span className="text-sm text-[#CE1126]">Open:</span>
            <span className="text-lg font-bold text-[#CE1126]">{openCount}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-[#FCD116]/10 rounded-xl border border-[#FCD116]/20">
            <span className="w-2 h-2 rounded-full bg-[#FCD116]"></span>
            <span className="text-sm text-[#B8960F]">In Progress:</span>
            <span className="text-lg font-bold text-[#B8960F]">{inProgressCount}</span>
          </div>
        </div>
      </div>

      {/* Desktop 3-Panel Layout */}
      <div className="hidden lg:grid grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Headphones size={18} className="text-[#006B3F]" />
              Active Tickets
            </h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {tickets.map((ticket) => {
              const priorityStyle = getPriorityStyle(ticket.priority);
              return (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-all duration-200 ${
                    selectedTicketId === ticket.id ? 'bg-[#006B3F]/5 border-l-4 border-[#006B3F]' : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{ticket.subject}</p>
                      <p className="text-sm text-gray-500 mt-1">{ticket.user.firstName} {ticket.user.lastName}</p>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${priorityStyle.bg} ${priorityStyle.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`}></span>
                      {ticket.priority.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-400">{formatDate(ticket.createdAt)}</span>
                    {getStatusBadge(ticket.status)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
          {selectedTicketId && selectedTicket ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#006B3F] to-[#006B3F]/70 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedTicket.user.firstName[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{selectedTicket.subject}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedTicket.user.firstName} {selectedTicket.user.lastName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(selectedTicket.status)}
                  {selectedTicket.status !== 'RESOLVED' && (
                    <button 
                      onClick={handleResolve}
                      disabled={updateStatus.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 transition-colors font-medium text-sm shadow-md shadow-[#006B3F]/20"
                    >
                      <CheckCircle size={16} />
                      Resolve
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/30">
                <div className="bg-[#FCD116]/10 border border-[#FCD116]/20 rounded-xl p-4">
                  <p className="text-sm text-[#B8960F] font-medium mb-1">Original Issue:</p>
                  <p className="text-sm text-gray-700">{selectedTicket.description}</p>
                </div>
                
                {selectedTicket.messages?.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex gap-3 ${msg.isFromUser ? '' : 'justify-end'}`}
                  >
                    {msg.isFromUser ? (
                      <>
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                          {msg.sender.firstName[0]}
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-4 max-w-[70%] shadow-sm">
                          <p className="text-sm text-gray-800">{msg.content}</p>
                          <span className="text-xs text-gray-400 mt-2 block">{formatDate(msg.createdAt)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="bg-[#006B3F] text-white rounded-2xl rounded-tr-none p-4 max-w-[70%] shadow-md">
                        <p className="text-sm">{msg.content}</p>
                        <span className="text-xs text-[#FCD116] mt-2 block">{formatDate(msg.createdAt)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Input */}
              {selectedTicket.status !== 'RESOLVED' && (
                <div className="p-4 border-t border-gray-100 bg-white">
                  <form onSubmit={handleSendMessage} className="flex gap-3">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors"
                    />
                    <button 
                      type="submit"
                      disabled={sendMessage.isPending || !message.trim()}
                      className="px-5 py-3 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 transition-colors shadow-md shadow-[#006B3F]/20"
                    >
                      <Send size={20} />
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50/30">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle size={32} className="text-gray-300" />
                </div>
                <p className="font-medium text-gray-500">Select a ticket</p>
                <p className="text-sm text-gray-400 mt-1">Choose a ticket from the list to view the conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        {!showChat ? (
          /* Mobile Ticket List */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Headphones size={18} className="text-[#006B3F]" />
                Active Tickets
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {tickets.map((ticket) => {
                const priorityStyle = getPriorityStyle(ticket.priority);
                return (
                  <button
                    key={ticket.id}
                    onClick={() => {
                      setSelectedTicketId(ticket.id);
                      setShowChat(true);
                    }}
                    className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800">{ticket.subject}</p>
                        <p className="text-sm text-gray-500 mt-1">{ticket.user.firstName} {ticket.user.lastName}</p>
                      </div>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${priorityStyle.bg} ${priorityStyle.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`}></span>
                        {ticket.priority.toLowerCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock size={14} className="text-gray-400" />
                      <span className="text-xs text-gray-400">{formatDate(ticket.createdAt)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Mobile Chat View */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-220px)]">
            {/* Mobile Chat Header */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
              <button
                onClick={() => {
                  setShowChat(false);
                  setSelectedTicketId(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 truncate">{selectedTicket?.subject}</h3>
                <p className="text-sm text-gray-500 truncate">
                  {selectedTicket?.user.firstName} {selectedTicket?.user.lastName}
                </p>
              </div>
              {selectedTicket?.status !== 'RESOLVED' && (
                <button 
                  onClick={handleResolve}
                  disabled={updateStatus.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 transition-colors font-medium text-sm"
                >
                  <CheckCircle size={14} />
                  Resolve
                </button>
              )}
            </div>

            {/* Mobile Messages */}
            {selectedTicket && (
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/30">
                <div className="bg-[#FCD116]/10 border border-[#FCD116]/20 rounded-xl p-3">
                  <p className="text-xs text-[#B8960F] font-medium mb-1">Original Issue:</p>
                  <p className="text-sm text-gray-700">{selectedTicket.description}</p>
                </div>
                
                {selectedTicket.messages?.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex gap-2 ${msg.isFromUser ? '' : 'justify-end'}`}
                  >
                    {msg.isFromUser ? (
                      <>
                        <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {msg.sender.firstName[0]}
                        </div>
                        <div className="bg-white border border-gray-100 rounded-xl rounded-tl-none p-3 max-w-[80%] shadow-sm">
                          <p className="text-sm text-gray-800">{msg.content}</p>
                          <span className="text-xs text-gray-400 mt-1 block">{formatDate(msg.createdAt)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="bg-[#006B3F] text-white rounded-xl rounded-tr-none p-3 max-w-[80%] shadow-md">
                        <p className="text-sm">{msg.content}</p>
                        <span className="text-xs text-[#FCD116] mt-1 block">{formatDate(msg.createdAt)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Mobile Input */}
            {selectedTicket?.status !== 'RESOLVED' && (
              <div className="p-4 border-t border-gray-100 bg-white">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors text-sm"
                  />
                  <button 
                    type="submit"
                    disabled={sendMessage.isPending || !message.trim()}
                    className="px-4 py-3 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

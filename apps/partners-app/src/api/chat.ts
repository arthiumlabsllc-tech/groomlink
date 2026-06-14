import apiClient from './client';

export interface ChatMessage {
  id: string;
  content: string;
  isFromUser: boolean;
  createdAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
}

export interface ChatTicket {
  id: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  source: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  unreadByUser: number;
}

export interface CreateChatTicketInput {
  subject: string;
  initialMessage: string;
  category?: string;
}

export const chatApi = {
  // Create a new support ticket/chat
  createTicket: async (data: CreateChatTicketInput) => {
    const response = await apiClient.post('/me/support/tickets', data);
    return response.data;
  },

  // Get partner's chat tickets
  getTickets: async (page = 1, limit = 20, status?: string) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (status) params.append('status', status);
    
    const response = await apiClient.get(`/me/support/tickets?${params.toString()}`);
    return response.data;
  },

  // Get single ticket with messages
  getTicket: async (ticketId: string) => {
    const response = await apiClient.get(`/me/support/tickets/${ticketId}`);
    return response.data;
  },

  // Send message in a ticket
  sendMessage: async (ticketId: string, content: string) => {
    const response = await apiClient.post(`/me/support/tickets/${ticketId}/messages`, {
      content,
    });
    return response.data;
  },

  // Mark ticket as read
  markAsRead: async (ticketId: string) => {
    const response = await apiClient.post(`/support/chat/threads/${ticketId}/read`, {});
    return response.data;
  },

  // Get unread count
  getUnreadCount: async () => {
    const response = await apiClient.get('/me/support/tickets/unread-count');
    return response.data;
  },
};

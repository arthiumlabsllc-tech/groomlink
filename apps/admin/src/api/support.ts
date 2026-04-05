import apiClient from './client';

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  messages: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  content: string;
  isFromUser: boolean;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface PaginatedTickets {
  data: SupportTicket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const supportApi = {
  // Get all support tickets
  getAll: async (
    page: number = 1,
    limit: number = 20,
    status?: string,
    priority?: string
  ): Promise<PaginatedTickets> => {
    const response = await apiClient.get('/admin/support/tickets', {
      params: { page, limit, status, priority },
    });
    return response.data;
  },

  // Get ticket by ID
  getById: async (id: string): Promise<SupportTicket> => {
    const response = await apiClient.get(`/admin/support/tickets/${id}`);
    return response.data.data;
  },

  // Update ticket status
  updateStatus: async (id: string, status: string): Promise<SupportTicket> => {
    const response = await apiClient.put(`/admin/support/tickets/${id}/status`, { status });
    return response.data.data;
  },

  // Send message to ticket
  sendMessage: async (id: string, content: string): Promise<SupportMessage> => {
    const response = await apiClient.post(`/admin/support/tickets/${id}/messages`, { content });
    return response.data.data;
  },

  // Get ticket messages
  getMessages: async (id: string) => {
    const response = await apiClient.get(`/admin/support/tickets/${id}/messages`);
    return response.data;
  },
};

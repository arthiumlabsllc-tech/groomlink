import apiClient from './client';

export interface WaitlistEntry {
  id: string;
  salonId: string;
  salonName: string;
  serviceName?: string;
  notes?: string;
  position: number;
  estimatedWait: number;
  status: 'WAITING' | 'NOTIFIED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
}

export interface JoinWaitlistData {
  salonId: string;
  serviceId?: string;
  notes?: string;
}

export const waitlistApi = {
  // Join a salon's waitlist
  join: async (data: JoinWaitlistData): Promise<WaitlistEntry> => {
    const response = await apiClient.post('/waitlist/join', data);
    return response.data.data;
  },

  // Get user's active waitlist entries
  getMyWaitlist: async (): Promise<WaitlistEntry[]> => {
    const response = await apiClient.get('/waitlist/my');
    return response.data.data || [];
  },

  // Cancel a waitlist entry
  cancel: async (id: string): Promise<void> => {
    await apiClient.delete(`/waitlist/${id}`);
  },
};

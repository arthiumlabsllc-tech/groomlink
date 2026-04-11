import apiClient from './client';

export interface QueueEntry {
  id: string;
  salonId: string;
  customerId: string;
  serviceId: string | null;
  workerId: string | null;
  notes: string | null;
  status: 'WAITING' | 'IN_SERVICE' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  position: number;
  joinedAt: string;
  service?: {
    id: string;
    name: string;
    duration: number;
  } | null;
  worker?: {
    id: string;
    fullName: string;
  } | null;
}

export interface QueueStatus {
  entries: QueueEntry[];
  totalWaiting: number;
  averageWait: number;
}

export interface MyQueuePosition {
  position: number;
  estimatedWait: number;
  status: 'WAITING' | 'IN_SERVICE' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  queueId: string;
}

export interface JoinQueueData {
  salonId: string;
  serviceId?: string;
  workerId?: string;
  notes?: string;
}

export const queueApi = {
  getSalonQueue: async (salonId: string): Promise<QueueStatus> => {
    const response = await apiClient.get(`/queue/salon/${salonId}`);
    return response.data.data;
  },

  joinQueue: async (data: JoinQueueData): Promise<QueueEntry> => {
    const response = await apiClient.post('/queue/join', data);
    return response.data.data;
  },

  leaveQueue: async (queueId: string): Promise<void> => {
    const response = await apiClient.delete(`/queue/${queueId}/leave`);
    return response.data.data;
  },

  getMyPosition: async (salonId: string): Promise<MyQueuePosition | null> => {
    try {
      const response = await apiClient.get(`/queue/my-position/${salonId}`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
};

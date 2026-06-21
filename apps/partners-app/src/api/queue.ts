import apiClient from './client';

export interface QueueCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface QueueService {
  id: string;
  name: string;
  duration: number;
  price: string;
}

export interface QueueWorker {
  id: string;
  fullName: string;
}

export type QueueStatus = 'WAITING' | 'CALLED' | 'IN_SERVICE' | 'COMPLETED' | 'SKIPPED';

export interface QueueEntry {
  id: string;
  customerId: string;
  customer: QueueCustomer;
  serviceId?: string;
  service?: QueueService;
  workerId?: string;
  worker?: QueueWorker;
  position: number;
  status: QueueStatus;
  estimatedWait: number;
  isHomeService?: boolean;
  joinedAt: string;
  calledAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface QueueStatusResponse {
  entries: QueueEntry[];
  totalWaiting: number;
  averageWait: number;
  currentlyServing?: QueueEntry;
}

export const queueApi = {
  // Get queue status for a salon
  getQueue: async (salonId: string): Promise<QueueStatusResponse> => {
    const response = await apiClient.get(`/queue/salon/${salonId}`);
    return response.data.data;
  },

  // Call next customer
  callNext: async (queueId: string): Promise<QueueEntry> => {
    const response = await apiClient.post(`/queue/${queueId}/call-next`);
    return response.data.data;
  },

  // Start service
  startService: async (queueId: string): Promise<QueueEntry> => {
    const response = await apiClient.post(`/queue/${queueId}/start`);
    return response.data.data;
  },

  // Complete service
  completeService: async (queueId: string): Promise<QueueEntry> => {
    const response = await apiClient.post(`/queue/${queueId}/complete`);
    return response.data.data;
  },

  // Skip customer
  skipCustomer: async (queueId: string): Promise<QueueEntry> => {
    const response = await apiClient.post(`/queue/${queueId}/skip`);
    return response.data.data;
  },
};

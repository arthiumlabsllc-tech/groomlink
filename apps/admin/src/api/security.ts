import apiClient from './client';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityEvent {
  id: string;
  eventType: string;
  severity: Severity;
  source: string;
  ipAddress: string | null;
  userId: string | null;
  userEmail: string | null;
  userAgent: string | null;
  endpoint: string | null;
  method: string | null;
  message: string;
  details: any;
  resolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
}

export interface SecurityStats {
  last24h: number;
  last7d: number;
  unresolved: number;
  bySeverity24h: Record<Severity, number>;
  topEventTypes7d: Array<{ eventType: string; count: number }>;
}

export interface SecurityEventList {
  items: SecurityEvent[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ListFilters {
  page?: number;
  pageSize?: number;
  severity?: Severity | '';
  eventType?: string;
  resolved?: boolean | undefined;
  ip?: string;
}

export const securityApi = {
  getStats: async (): Promise<SecurityStats> => {
    const res = await apiClient.get('/admin/security/stats');
    return res.data.data;
  },

  listEvents: async (filters: ListFilters = {}): Promise<SecurityEventList> => {
    const params: Record<string, string> = {};
    if (filters.page) params.page = String(filters.page);
    if (filters.pageSize) params.pageSize = String(filters.pageSize);
    if (filters.severity) params.severity = filters.severity;
    if (filters.eventType) params.eventType = filters.eventType;
    if (typeof filters.resolved === 'boolean') params.resolved = String(filters.resolved);
    if (filters.ip) params.ip = filters.ip;

    const res = await apiClient.get('/admin/security/events', { params });
    return res.data.data;
  },

  resolve: async (id: string): Promise<SecurityEvent> => {
    const res = await apiClient.patch(`/admin/security/events/${id}/resolve`);
    return res.data.data;
  },

  reopen: async (id: string): Promise<SecurityEvent> => {
    const res = await apiClient.patch(`/admin/security/events/${id}/reopen`);
    return res.data.data;
  },
};

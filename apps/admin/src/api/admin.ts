import apiClient from './client';

// ============ Policies ============

export interface PlatformPolicy {
  id: string;
  policyName: string;
  policyValue: string;
  description: string | null;
  updatedAt: string;
}

export const policiesApi = {
  getAll: async (): Promise<PlatformPolicy[]> => {
    const response = await apiClient.get('/admin/policies');
    return response.data.data;
  },

  update: async (id: string, policyValue: string): Promise<PlatformPolicy> => {
    const response = await apiClient.put(`/admin/policies/${id}`, { policyValue });
    return response.data.data;
  },
};

// ============ Escrow ============

export interface EscrowAccount {
  id: string;
  amountHeld: number | string; // Decimal from Prisma, can be string or number
  platformFee: number | string;
  providerAmount: number | string;
  status: string; // 'held', 'released', 'refunded', 'disputed'
  createdAt: string;
  releasedAt: string | null;
  refundedAt: string | null;
  booking: {
    id: string;
    customer?: {
      id: string;
      firstName: string | null;
      lastName: string | null;
    };
    salon?: {
      id: string;
      businessName: string;
    };
    service?: {
      id: string;
      name: string;
    };
  };
}

export interface PaginatedEscrow {
  data: EscrowAccount[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const escrowApi = {
  getAll: async (page: number = 1, limit: number = 20): Promise<PaginatedEscrow> => {
    const response = await apiClient.get('/admin/escrow', {
      params: { page, limit },
    });
    return response.data;
  },
};

// ============ Cancellations ============

export interface CancellationRecord {
  id: string;
  cancelledBy: 'CUSTOMER' | 'PROVIDER';
  reason: string | null;
  refundPercentage: number;
  refundAmount: number | null;
  providerAmount: number | null;
  createdAt: string;
  booking: {
    id: string;
    customer: {
      id: string;
      firstName: string | null;
      lastName: string | null;
    };
    salon: {
      id: string;
      businessName: string;
    };
    service: {
      id: string;
      name: string;
    };
  };
}

export interface PaginatedCancellations {
  data: CancellationRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const cancellationsApi = {
  getAll: async (page: number = 1, limit: number = 20): Promise<PaginatedCancellations> => {
    const response = await apiClient.get('/admin/cancellations', {
      params: { page, limit },
    });
    return response.data;
  },
};

// ============ No-Shows ============

export interface NoShowRecord {
  id: string;
  markedAt: string;
  disputed: boolean;
  disputeReason: string | null;
  resolution: string | null;
  upheld: boolean | null;
  resolvedAt: string | null;
  booking?: {
    id: string;
    customer?: {
      id: string;
      firstName: string | null;
      lastName: string | null;
    } | null;
    salon?: {
      id: string;
      businessName: string;
    } | null;
    service?: {
      id: string;
      name: string;
    } | null;
  } | null;
  markedBy?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  } | null;
}

export interface PaginatedNoShows {
  data: NoShowRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const noShowsApi = {
  getAll: async (page: number = 1, limit: number = 20): Promise<PaginatedNoShows> => {
    const response = await apiClient.get('/admin/no-shows', {
      params: { page, limit },
    });
    return response.data;
  },

  resolve: async (id: string, resolution: string, upheld: boolean): Promise<NoShowRecord> => {
    const response = await apiClient.put(`/admin/no-shows/${id}/resolve`, { resolution, upheld });
    return response.data.data;
  },
};

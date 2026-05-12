// Use relative URL in development (Vite proxy handles it), production URL in production
export const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'https://groomlinkgh.com/api');

export interface SalonData {
  id: string;
  businessName: string;
  description?: string;
  type: string;
  providerCategory: string;
  status: string;
  address: string;
  city: string;
  region: string;
  phoneNumber: string;
  email?: string;
  logo?: string;
  rating?: number;
  createdAt: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email?: string;
  };
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  role: string;
  status: string;
  isVerified?: boolean;
  createdAt: string;
  lastLoginAt?: string;
  salons?: { id: string; businessName: string; status: string; providerCategory: string }[];
}

interface ImpersonationResponse {
  message: string;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  user: User;
  impersonationLogId: string;
}

interface SearchResult {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('impersonation_log_id');
      localStorage.removeItem('impersonating_user');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async requestEmailOTP(email: string) {
    return this.request<{ success: boolean; message: string }>('/auth/otp/email/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyEmailOTP(email: string, code: string) {
    const response = await this.request<{
      success: boolean;
      data: {
        tokens: { accessToken: string; refreshToken: string };
        user: User;
        isNewUser: boolean;
      }
    }>('/auth/otp/email/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });

    if (response.success && response.data.tokens?.accessToken) {
      this.setToken(response.data.tokens.accessToken);
    }
    return response;
  }

  logout() {
    this.setToken(null);
  }

  isAuthenticated() {
    return !!this.token;
  }

  // Impersonation
  async startImpersonation(targetUserId: string, reason?: string) {
    const response = await this.request<{ success: boolean; data: ImpersonationResponse }>('/impersonation/start', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, reason }),
    });
    
    if (response.success) {
      const { tokens, user, impersonationLogId } = response.data;
      // Save original token BEFORE overwriting so we can restore on endImpersonation
      const originalToken = this.token;
      if (!localStorage.getItem('original_auth_token')) {
        localStorage.setItem('original_auth_token', originalToken || '');
      }
      // Update the API client token so subsequent requests use the impersonation token
      this.token = tokens.accessToken;
      localStorage.setItem('auth_token', tokens.accessToken);
      localStorage.setItem('impersonation_log_id', impersonationLogId);
      localStorage.setItem('impersonating_user', JSON.stringify(user));
    }
    return response;
  }

  async endImpersonation(logId: string) {
    return this.request<{ success: boolean }>('/impersonation/end', {
      method: 'POST',
      body: JSON.stringify({ logId }),
    });
  }

  // User Search - uses support/users endpoint for full access (except SUPER_ADMIN)
  async searchUsers(query: string, role?: string, page: number = 1, limit: number = 20): Promise<SearchResult> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (query.trim()) params.append('search', query);
    if (role) params.append('role', role);
    
    const response = await this.request<{ success: boolean; data: User[]; pagination: SearchResult['pagination'] }>(
      `/support/users?${params}`
    );
    
    return {
      users: response.data,
      pagination: response.pagination,
    };
  }

  // Get user dashboards
  async getUserDashboards(userId: string) {
    return this.request<{ 
      success: boolean; 
      data: {
        user: User;
        dashboards: { name: string; url: string; role: string }[];
      } 
    }>(`/impersonation/dashboards/${userId}`);
  }

  // Users list - uses support/users endpoint for full access
  async getUsers(page: number = 1, limit: number = 20, role?: string, search?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (role) params.append('role', role);
    if (search) params.append('search', search);
    
    return this.request<{ 
      success: boolean; 
      data: User[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/support/users?${params}`);
  }

  // Salons - uses support/salons endpoint to see ALL statuses (SUPPORT+ role)
  async getSalons(page: number = 1, limit: number = 20, status?: string, search?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    
    return this.request<{ 
      success: boolean; 
      data: SalonData[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/support/salons?${params}`);
  }

  // Support tickets - uses support/tickets endpoints (SUPPORT+ role)
  async getTickets(page: number = 1, limit: number = 20, status?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    
    return this.request<{ 
      success: boolean; 
      data: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/support/tickets?${params}`);
  }

  async getTicketById(id: string) {
    return this.request<{ 
      success: boolean; 
      data: {
        id: string;
        subject: string;
        description: string;
        status: string;
        priority: string;
        category: string;
        createdAt: string;
        updatedAt: string;
        user: { id: string; firstName: string; lastName: string; phoneNumber: string };
        assignedTo?: { id: string; firstName: string; lastName: string } | null;
        messages: { id: string; content: string; isFromUser: boolean; createdAt: string; sender: { firstName: string; lastName: string } }[];
      };
    }>(`/support/tickets/${id}`);
  }

  async updateTicketStatus(id: string, status: string) {
    return this.request<{ 
      success: boolean; 
      data: any;
    }>(`/support/tickets/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async sendTicketMessage(id: string, content: string) {
    return this.request<{ 
      success: boolean; 
      data: {
        id: string;
        content: string;
        isFromUser: boolean;
        createdAt: string;
        sender: { firstName: string; lastName: string };
      };
    }>(`/support/tickets/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // Live chat (live conversation list + read tracking)
  async getLiveChatThreads(params: { source?: string; status?: string; q?: string } = {}) {
    const search = new URLSearchParams();
    if (params.source) search.append('source', params.source);
    if (params.status) search.append('status', params.status);
    if (params.q) search.append('q', params.q);
    return this.request<{
      success: boolean;
      data: Array<{
        id: string;
        subject: string;
        status: string;
        source: string;
        unreadByAgent: number;
        unreadByUser: number;
        lastMessageAt: string;
        createdAt: string;
        guestName?: string | null;
        guestEmail?: string | null;
        user?: { id: string; firstName: string; lastName: string; email: string } | null;
        lastMessage?: { content: string; isFromUser: boolean; createdAt: string } | null;
      }>;
    }>(`/support/chat/threads${search.toString() ? `?${search}` : ''}`);
  }

  async markThreadRead(id: string) {
    return this.request<{ success: boolean }>(`/support/chat/threads/${id}/read`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // Dashboard stats - uses support/stats endpoint (SUPPORT+ role)
  async getStats() {
    return this.request<{ 
      success: boolean; 
      data: {
        totalUsers: number;
        totalSalons: number;
        activeBookings: number;
        openTickets: number;
        todaySignups: number;
        pendingSalons: number;
      };
    }>('/support/stats');
  }

  // Customer management
  async createCustomer(data: { email: string; firstName: string; lastName: string; phoneNumber?: string }) {
    return this.request<{ 
      success: boolean; 
      data: User;
    }>('/support/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRecentCustomers(page: number = 1, limit: number = 10) {
    const params = new URLSearchParams({ 
      page: String(page), 
      limit: String(limit),
      role: 'CUSTOMER' 
    });
    
    return this.request<{ 
      success: boolean; 
      data: User[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>(`/users?${params}`);
  }
}

export const api = new ApiClient();
export default api;

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://groomlinkgh.com/api';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  role: string;
  status: string;
  createdAt: string;
  salons?: { id: string; businessName: string }[];
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

  // User Search
  async searchUsers(query: string, role?: string, page: number = 1, limit: number = 20): Promise<SearchResult> {
    const params = new URLSearchParams({ query, page: String(page), limit: String(limit) });
    if (role) params.append('role', role);
    
    const response = await this.request<{ success: boolean; data: User[]; meta: SearchResult['pagination'] }>(
      `/impersonation/search?${params}`
    );
    
    return {
      users: response.data,
      pagination: response.meta,
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

  // Users list
  async getUsers(page: number = 1, limit: number = 20) {
    return this.request<{ 
      success: boolean; 
      data: User[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>(`/users?page=${page}&limit=${limit}`);
  }

  // Salons
  async getSalons(page: number = 1, limit: number = 20, status?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    
    return this.request<{ 
      success: boolean; 
      data: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/salons?${params}`);
  }

  // Support tickets
  async getTickets(page: number = 1, limit: number = 20, status?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    
    return this.request<{ 
      success: boolean; 
      data: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/support/tickets?${params}`);
  }

  // Dashboard stats
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
    }>('/admin/stats');
  }
}

export const api = new ApiClient();
export default api;

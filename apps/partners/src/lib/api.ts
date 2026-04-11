// API Configuration for Partners Dashboard
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://groomlinkgh.com/api';

// Types
export interface Salon {
  id: string;
  businessName: string;
  description?: string;
  type: string;
  status: string;
  phoneNumber: string;
  email?: string;
  address: string;
  city: string;
  region: string;
  rating: number;
  reviewCount: number;
  services: Service[];
  workers: Worker[];
  operatingHours?: Record<string, string>;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  category: string;
  duration: number;
  price: string;
  isActive: boolean;
}

export interface Worker {
  id: string;
  fullName: string;
  phoneNumber?: string;
  email?: string;
  bio?: string;
  specialties: string[];
  rating: number;
  isActive: boolean;
}

export interface Booking {
  id: string;
  customerId: string;
  customer: { firstName: string; lastName: string; phoneNumber: string };
  salonId: string;
  serviceId: string;
  service: { name: string; price: string };
  workerId?: string;
  worker?: { fullName: string };
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  totalAmount: string;
  notes?: string;
}

export interface DashboardStats {
  todayBookings: number;
  todayRevenue: number;
  pendingBookings: number;
  completedBookings: number;
  weeklyBookings: number;
  weeklyRevenue: number;
  newCustomers: number;
  averageRating: number;
}

export interface QueueEntry {
  id: string;
  customerId: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  serviceId?: string;
  service?: {
    id: string;
    name: string;
    duration: number;
    price: string;
  };
  workerId?: string;
  worker?: {
    id: string;
    fullName: string;
  };
  position: number;
  status: 'WAITING' | 'CALLED' | 'IN_SERVICE' | 'COMPLETED' | 'SKIPPED';
  estimatedWait: number;
  joinedAt: string;
  calledAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface QueueStatus {
  entries: QueueEntry[];
  totalWaiting: number;
  averageWait: number;
  currentlyServing?: QueueEntry;
}

// API Client
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    } else {
      console.warn('No auth token found in localStorage');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      console.error(`API Error [${response.status}]:`, error);
      
      // If 401, clear the token as it's invalid
      if (response.status === 401) {
        this.setToken(null);
      }
      
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async login(phoneNumber: string, password: string) {
    const response = await this.request<{ success: boolean; data: { token: string; user: { id: string; role: string } } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, password }),
    });
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }
    return response;
  }

  async requestEmailOTP(email: string) {
    return this.request<{ success: boolean; message: string }>('/auth/otp/email/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyEmailOTP(email: string, code: string) {
    const response = await this.request<{ success: boolean; data: { tokens: { accessToken: string; refreshToken: string }; user: { id: string; role: string; firstName: string; lastName: string }; isNewUser: boolean } }>('/auth/otp/email/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    if (response.success && response.data.tokens?.accessToken) {
      this.setToken(response.data.tokens.accessToken);
      // Log user role for debugging
      console.log('User logged in with role:', response.data.user?.role);
    }
    return response;
  }

  async getCurrentUser() {
    return this.request<{ success: boolean; data: { id: string; role: string; email: string; phoneNumber: string; firstName: string; lastName: string } }>('/users/profile');
  }

  // Salon
  async getMySalon() {
    try {
      // The backend returns paginated results from /salons/my/list
      const response = await this.request<{ success: boolean; data: Salon[]; pagination: { total: number } }>('/salons/my/list');
      // Return the first salon (salon owners typically have one salon)
      if (response.success && response.data && response.data.length > 0) {
        return { success: true, data: response.data[0] };
      }
      return { success: false, data: null };
    } catch (error) {
      console.error('Error fetching salon:', error);
      throw error;
    }
  }

  async updateSalon(id: string, data: Partial<Salon>) {
    return this.request<{ success: boolean; data: Salon }>(`/salons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Services
  async getServices(salonId: string) {
    return this.request<{ success: boolean; data: Service[] }>(`/services?salonId=${salonId}`);
  }

  async createService(data: Partial<Service>) {
    return this.request<{ success: boolean; data: Service }>('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateService(id: string, data: Partial<Service>) {
    return this.request<{ success: boolean; data: Service }>(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteService(id: string) {
    return this.request<{ success: boolean }>(`/services/${id}`, {
      method: 'DELETE',
    });
  }

  // Workers
  async getWorkers(salonId: string) {
    return this.request<{ success: boolean; data: Worker[] }>(`/workers?salonId=${salonId}`);
  }

  async createWorker(data: Partial<Worker>) {
    return this.request<{ success: boolean; data: Worker }>('/workers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWorker(id: string, data: Partial<Worker>) {
    return this.request<{ success: boolean; data: Worker }>(`/workers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWorker(id: string) {
    return this.request<{ success: boolean }>(`/workers/${id}`, {
      method: 'DELETE',
    });
  }

  // Bookings
  async getBookings(salonId: string, date?: string) {
    const params = new URLSearchParams({ salonId });
    if (date) params.append('date', date);
    return this.request<{ success: boolean; data: Booking[] }>(`/bookings?${params}`);
  }

  async updateBookingStatus(id: string, status: string) {
    return this.request<{ success: boolean; data: Booking }>(`/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Dashboard
  async getDashboardStats() {
    return this.request<{ success: boolean; data: DashboardStats }>('/dashboard/stats');
  }

  // Reviews
  async getReviews(salonId: string) {
    return this.request<{ success: boolean; data: { reviews: { id: string; rating: number; comment: string; customer: { firstName: string }; createdAt: string }[] } }>(`/reviews?salonId=${salonId}`);
  }

  async replyToReview(reviewId: string, reply: string) {
    return this.request<{ success: boolean }>(`/reviews/${reviewId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply }),
    });
  }

  // Queue Management
  async getQueue(salonId: string) {
    return this.request<{ success: boolean; data: QueueStatus }>(`/queue/salon/${salonId}`);
  }

  async callNext(queueId: string) {
    return this.request<{ success: boolean; data: QueueEntry }>(`/queue/${queueId}/call-next`, {
      method: 'POST',
    });
  }

  async startService(queueId: string) {
    return this.request<{ success: boolean; data: QueueEntry }>(`/queue/${queueId}/start`, {
      method: 'POST',
    });
  }

  async completeService(queueId: string) {
    return this.request<{ success: boolean; data: QueueEntry }>(`/queue/${queueId}/complete`, {
      method: 'POST',
    });
  }

  async skipCustomer(queueId: string) {
    return this.request<{ success: boolean; data: QueueEntry }>(`/queue/${queueId}/skip`, {
      method: 'POST',
    });
  }

  logout() {
    this.setToken(null);
  }

  isAuthenticated() {
    return !!this.token;
  }
}

export const api = new ApiClient();

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://groomlinkgh.com/api';

// Types
export interface Booking {
  id: string;
  reference: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  date: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  discountAmount: number | null;
  finalAmount: number;
  customerNotes: string | null;
  createdAt: string;
  salon: {
    id: string;
    businessName: string;
    address: string;
    logo: string | null;
    phoneNumber?: string;
  };
  service: {
    id: string;
    name: string;
    duration: number;
    price?: number;
  };
  worker: {
    id: string;
    fullName: string;
    avatar: string | null;
  } | null;
  payment: {
    status: string;
    provider: string;
  } | null;
  review?: {
    id: string;
    rating: number;
  } | null;
}

export interface CreateBookingData {
  salonId: string;
  serviceId: string;
  workerId?: string;
  date: string;
  startTime: string;
  customerNotes?: string;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('customer_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('customer_token');
      localStorage.removeItem('customer_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Booking API functions
export const bookingApi = {
  getMyBookings: async (status?: string): Promise<Booking[]> => {
    const params = status ? { status } : {};
    const response = await apiClient.get('/bookings/my', { params });
    return response.data.data;
  },

  getBookingById: async (id: string): Promise<Booking> => {
    const response = await apiClient.get(`/bookings/${id}`);
    return response.data.data;
  },

  createBooking: async (data: CreateBookingData): Promise<Booking> => {
    const response = await apiClient.post('/bookings', data);
    return response.data.data;
  },

  cancelBooking: async (id: string, reason?: string): Promise<Booking> => {
    const response = await apiClient.put(`/bookings/${id}/cancel`, { reason });
    return response.data.data;
  },

  getAvailableSlots: async (salonId: string, date: string, workerId?: string): Promise<AvailableSlot[]> => {
    const params = new URLSearchParams();
    params.append('date', date);
    if (workerId) params.append('workerId', workerId);
    const response = await apiClient.get(`/bookings/slots/${salonId}?${params.toString()}`);
    return response.data.data;
  },
};

export default apiClient;

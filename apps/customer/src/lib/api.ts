import axios from 'axios';

// Use relative URL in development (Vite proxy handles it), production URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'https://groomlinkgh.com/api');

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

export interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  duration: number;
  price: string;
  isActive: boolean;
}

export interface Worker {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  email: string | null;
  bio: string | null;
  specialties: string[];
  rating: number;
  reviewCount: number;
  isActive: boolean;
  avatar: string | null;
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

// Salon types
export interface NearbySalon {
  id: string;
  businessName: string;
  description: string | null;
  type: string;
  status: string;
  phoneNumber: string;
  email: string | null;
  address: string;
  city: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  logo: string | null;
  coverImage: string | null;
  images: string[];
  openingTime: string | null;
  closingTime: string | null;
  workingDays: string[];
  hasParking: boolean;
  hasWifi: boolean;
  hasAC: boolean;
  acceptsWalkIns: boolean;
  rating: number;
  reviewCount: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  distance: number; // Distance in km from the search location
}

export interface NearbySalonsResponse {
  success: boolean;
  data: NearbySalon[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Map salon data type
export interface MapSalon {
  id: string;
  businessName: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  reviewCount: number;
  openingTime: string | null;
  closingTime: string | null;
  workingDays: string[];
  city: string;
  address: string;
  phoneNumber: string;
  isOpen?: boolean;
  distance?: number;
}

// Salon API functions
export const salonApi = {
  getSalonServices: async (salonId: string): Promise<{ services: Service[] }> => {
    const response = await apiClient.get(`/salons/${salonId}/services`);
    return response.data.data;
  },

  getSalonStaff: async (salonId: string): Promise<{ staff: Worker[] }> => {
    const response = await apiClient.get(`/salons/${salonId}/staff`);
    return response.data.data;
  },

  getNearbySalons: async (
    lat: number,
    lng: number,
    radius: number = 10,
    page: number = 1,
    limit: number = 12
  ): Promise<NearbySalonsResponse> => {
    const params = new URLSearchParams();
    params.append('lat', lat.toString());
    params.append('lng', lng.toString());
    params.append('radius', radius.toString());
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    const response = await apiClient.get(`/salons/nearby?${params.toString()}`);
    return response.data;
  },

  getSalonsForMap: async (
    lat?: number,
    lng?: number,
    radius: number = 10
  ): Promise<{ success: boolean; data: MapSalon[] }> => {
    const params = new URLSearchParams();
    if (lat !== undefined) params.append('lat', lat.toString());
    if (lng !== undefined) params.append('lng', lng.toString());
    params.append('radius', radius.toString());
    const response = await apiClient.get(`/salons/map?${params.toString()}`);
    return response.data;
  },
};

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

  getAvailableSlots: async (salonId: string, date: string, workerId?: string, serviceDuration?: number): Promise<AvailableSlot[]> => {
    const params = new URLSearchParams();
    params.append('date', date);
    if (workerId) params.append('workerId', workerId);
    if (serviceDuration) params.append('duration', serviceDuration.toString());
    const response = await apiClient.get(`/bookings/slots/${salonId}?${params.toString()}`);
    return response.data.data;
  },
};

// Payment types
export interface PaymentInitializeResponse {
  authorization_url: string;
  reference: string;
}

export interface PaymentVerifyResponse {
  success: boolean;
  status: string;
  message?: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  provider: 'MTN_MOMO' | 'VODAFONE_CASH' | 'AIRTELTIGO_MONEY' | 'CASH';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  reference: string | null;
  phoneNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

// Payment API functions
export const paymentApi = {
  initialize: async (data: { bookingId: string; provider: string; phoneNumber: string }): Promise<PaymentInitializeResponse> => {
    const response = await apiClient.post('/payments/initialize', data);
    return response.data.data;
  },
  verify: async (data: { paymentId: string; reference: string }): Promise<PaymentVerifyResponse> => {
    const response = await apiClient.post('/payments/verify', data);
    return response.data.data;
  },
  getPayment: async (id: string): Promise<Payment> => {
    const response = await apiClient.get(`/payments/${id}`);
    return response.data.data;
  },
};

// Queue types
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

// Queue API functions
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
    const response = await apiClient.get(`/queue/my-position/${salonId}`);
    return response.data.data;
  },
};

export default apiClient;

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
    latitude?: number | null;
    longitude?: number | null;
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
  // Group booking fields
  isGroupBooking?: boolean;
  totalPeople?: number;
  groupBookingRef?: string;
  billingType?: 'combined' | 'separate';
  guests?: Array<{
    id: string;
    guestName: string;
    guestPhone?: string;
    guestAgeGroup?: string;
    isChild?: boolean;
    specialInstructions?: string;
    checkedIn?: boolean;
    service: { id: string; name: string; price: number | string; duration?: number };
    staff?: { id: string; fullName: string };
  }>;
  // Escrow fields
  escrow?: {
    id: string;
    status: string;
    amountHeld: number | string;
    platformFee: number | string;
    providerAmount: number | string;
  };
  // Policy fields
  refundEligible?: boolean;
  refundPercentage?: number;
  cancellationDeadline?: string;
  noShowFlag?: boolean;
  providerCancelled?: boolean;
  // Service completion fields
  serviceCompleted?: boolean;
  serviceCompletedAt?: string;
  completionMethod?: 'MANUAL' | 'QR_CODE' | 'AUTO' | 'CUSTOMER_CONFIRMED';
  customerConfirmed?: boolean;
  disputeRaised?: boolean;
  disputeReason?: string;
  autoCompleteDeadline?: string;
  // Check-in and queue fields
  checkedIn?: boolean;
  checkedInAt?: string;
  checkinCode?: string;
  queuePosition?: number;
}

export interface CreateBookingData {
  salonId: string;
  serviceId: string;
  workerId?: string;
  date: string;
  startTime: string;
  customerNotes?: string;
  isGroupBooking?: boolean;
  totalPeople?: number;
  guests?: BookingGuest[];
  billingType?: 'individual' | 'combined';
}

export interface BookingGuest {
  guestName: string;
  guestPhone?: string;
  guestAgeGroup?: 'child' | 'teen' | 'adult' | 'senior';
  serviceId: string;
  staffId?: string;
  priceAmount?: number;
  specialInstructions?: string;
  isChild?: boolean;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  remainingSpots?: number;
  totalSpots?: number;
  bookedSpots?: number;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  duration: number;
  price: string;
  discountPrice?: string | null;
  promoLabel?: string | null;
  isActive: boolean;
  offersHomeService?: boolean;
  homeServiceFee?: string | null;
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
  const tempToken = localStorage.getItem('customer_temp_token');
  
  // Use real token if available, otherwise use temp token for registration flow
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (tempToken) {
    config.headers.Authorization = `Bearer ${tempToken}`;
  }
  return config;
});

// Response interceptor - handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const isAuthEndpoint = requestUrl.includes('/auth/');
      const hasTempToken = localStorage.getItem('customer_temp_token');
      
      // Don't clear tokens during registration flow (has temp token) or for auth endpoints
      if (!isAuthEndpoint && !hasTempToken) {
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_user');
        window.location.href = '/login';
      }
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
  isSponsored?: boolean; // Sponsored salon flag
  providerCategory?: string;
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
  isSponsored?: boolean;
}

// Review types
export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customer: {
    firstName: string;
    lastName: string;
    avatar: string | null;
    city?: string | null;
  };
  service?: {
    id: string;
    name: string;
  } | null;
  worker?: {
    id: string;
    fullName: string;
  } | null;
}

export interface ReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  limit: number;
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

  getSalonReviews: async (
    salonId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ReviewsResponse> => {
    const response = await apiClient.get(`/salons/${salonId}/reviews?page=${page}&limit=${limit}`);
    return response.data.data;
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
    const response = await apiClient.post(`/bookings/${id}/cancel`, { reason });
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

  rateBooking: async (bookingId: string, data: { rating: number; comment?: string }): Promise<{ id: string; rating: number; comment: string | null }> => {
    const response = await apiClient.post(`/bookings/${bookingId}/rate`, data);
    return response.data.data;
  },

  checkCapacity: async (salonId: string, date: string, startTime: string, totalPeople: number, staffId?: string): Promise<{ available: boolean; remainingSpots: number }> => {
    const response = await apiClient.post('/bookings/check-capacity', { salonId, date, startTime, totalPeople, staffId });
    return response.data.data;
  },

  getGroupBooking: async (groupRef: string): Promise<Booking[]> => {
    const response = await apiClient.get(`/bookings/group/${groupRef}`);
    return response.data.data;
  },

  getRefundPreview: async (bookingId: string): Promise<RefundPreview> => {
    const response = await apiClient.get(`/bookings/${bookingId}/refund-preview`);
    return response.data.data;
  },

  rescheduleBooking: async (bookingId: string, date: string, time: string, staffId?: string): Promise<Booking> => {
    const response = await apiClient.put(`/bookings/${bookingId}/reschedule`, { date, time, staffId });
    return response.data.data;
  },

  getNoShowStatus: async (): Promise<NoShowStatus> => {
    const response = await apiClient.get('/users/no-show-status');
    return response.data.data;
  },

  disputeNoShow: async (bookingId: string, reason: string): Promise<any> => {
    const response = await apiClient.post(`/bookings/${bookingId}/dispute-no-show`, { reason });
    return response.data.data;
  },

  confirmCompletion: async (bookingId: string): Promise<Booking> => {
    const response = await apiClient.post(`/bookings/${bookingId}/confirm-completion`);
    return response.data.data;
  },

  raiseDispute: async (bookingId: string, reason: string): Promise<Booking> => {
    const response = await apiClient.post(`/bookings/${bookingId}/dispute`, { reason });
    return response.data.data;
  },

  getQRCode: async (bookingId: string): Promise<{ qrCodeDataUrl: string; checkinCode?: string }> => {
    const response = await apiClient.get(`/bookings/${bookingId}/qr-code`);
    return response.data.data;
  },

  getQueuePosition: async (bookingId: string): Promise<QueuePositionResponse> => {
    const response = await apiClient.get(`/bookings/${bookingId}/queue-position`);
    return response.data.data;
  },

  autoCheckIn: async (bookingId: string, latitude: number, longitude: number): Promise<{
    booking: {
      id: string;
      reference: string;
      status: string;
      checkedIn: boolean;
      checkedInAt: string | null;
      queuePosition: number | null;
      salon: {
        id: string;
        businessName: string;
        address: string;
      };
      service: {
        id: string;
        name: string;
        duration: number;
      };
    };
    queuePosition: number;
    message: string;
  }> => {
    const response = await apiClient.post('/bookings/auto-checkin', {
      bookingId,
      latitude,
      longitude,
    });
    return response.data.data;
  },
};

// Payment types
export interface PaymentInitializeResponse {
  success: boolean;
  reference: string;
  message: string;
  checkout_url?: string;
  access_code?: string;
}

export interface PaymentVerifyResponse {
  success: boolean;
  status: string;
  message?: string;
  data?: {
    amountPaid?: number;
    serviceAmount?: number;
    platformFee?: number;
    bookingReference?: string;
    salonName?: string;
    serviceName?: string;
    isGroupBooking?: boolean;
    totalPeople?: number;
    [key: string]: any;
  };
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
  verify: async (data: { paymentId?: string; reference: string }): Promise<PaymentVerifyResponse> => {
    const response = await apiClient.post('/payments/verify', data);
    return response.data.data;
  },
  getPayment: async (id: string): Promise<Payment> => {
    const response = await apiClient.get(`/payments/${id}`);
    return response.data.data;
  },
  getConfig: async (): Promise<{ platformBookingFee: number; commissionPercentage: number }> => {
    const response = await apiClient.get('/payments/config');
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

// Favorite types
export interface Favorite {
  id: string;
  salonId: string;
  salon: {
    id: string;
    businessName: string;
    address: string;
    city: string;
    logo: string | null;
    images: string[];
    rating: number;
    reviewCount: number;
    type: string;
    isOpen?: boolean;
    isSponsored?: boolean;
  };
  createdAt: string;
}

// Refund preview type
export interface RefundPreview {
  refundPercentage: number;
  refundAmount: number;
  providerAmount: number;
  platformFee: number;
  hoursUntilBooking: number;
  tier: string;
}

// No-show status type
export interface NoShowStatus {
  restricted: boolean;
  reason?: string;
  restrictedUntil?: string;
  noShowCount: number;
}

// Queue position response type
export interface QueuePositionResponse {
  queuePosition: number | null;
  checkedIn: boolean;
  checkedInAt?: string;
  estimatedWaitMinutes?: number;
  peopleAhead?: number;
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

// Favorites API functions
export const favoritesApi = {
  getFavorites: async (): Promise<Favorite[]> => {
    const response = await apiClient.get('/users/favorites');
    return response.data.data;
  },

  addFavorite: async (salonId: string): Promise<Favorite> => {
    const response = await apiClient.post('/users/favorites', { salonId });
    return response.data.data;
  },

  removeFavorite: async (favoriteId: string): Promise<void> => {
    await apiClient.delete(`/users/favorites/${favoriteId}`);
  },

  checkIsFavorite: async (salonId: string): Promise<{ isFavorited: boolean; favoriteId?: string }> => {
    try {
      const response = await apiClient.get(`/users/favorites/check/${salonId}`);
      return response.data.data;
    } catch (error: any) {
      // Handle 404 or other errors gracefully - treat as not favorited
      if (error.response?.status === 404 || error.response?.status === 401) {
        return { isFavorited: false, favoriteId: undefined };
      }
      // For other errors, still return not favorited to prevent crashes
      return { isFavorited: false, favoriteId: undefined };
    }
  },
};

// Notification types
export interface NotificationData {
  bookingId?: string;
  salonId?: string;
  paymentId?: string;
  [key: string]: any;
}

export interface NotificationResponse {
  id: string;
  type: 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'BOOKING_REMINDER' | 'BOOKING_COMPLETED' | 'PAYMENT_RECEIVED' | 'REVIEW_REQUEST' | 'PROMOTION' | 'SYSTEM';
  title: string;
  message: string;
  data: NotificationData | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsListResponse {
  notifications: NotificationResponse[];
  unreadCount: number;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Notification API functions
export const notificationApi = {
  getNotifications: async (page = 1, limit = 20): Promise<NotificationsListResponse> => {
    const response = await apiClient.get(`/notifications?page=${page}&limit=${limit}`);
    return response.data.data;
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data.data;
  },

  markAsRead: async (id: string): Promise<void> => {
    await apiClient.put(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.put('/notifications/read-all');
  },
};

// Waitlist types
export interface WaitlistEntry {
  id: string;
  salonId: string;
  staffId: string | null;
  date: string;
  timeSlot: string;
  status: 'WAITING' | 'NOTIFIED' | 'CONVERTED' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
  salon?: {
    id: string;
    businessName: string;
  };
  staff?: {
    id: string;
    fullName: string;
  } | null;
}

export interface JoinWaitlistData {
  salonId: string;
  staffId?: string;
  date: string;
  timeSlot: string;
}

// Waitlist API functions
export const waitlistApi = {
  joinWaitlist: async (data: JoinWaitlistData): Promise<WaitlistEntry> => {
    const response = await apiClient.post('/waitlist/join', data);
    return response.data.data;
  },

  leaveWaitlist: async (waitlistId: string): Promise<void> => {
    await apiClient.delete(`/waitlist/${waitlistId}`);
  },

  getMyWaitlist: async (): Promise<WaitlistEntry[]> => {
    const response = await apiClient.get('/waitlist/my');
    return response.data.data;
  },
};

export default apiClient;

// API Configuration for Partners Dashboard
// Use relative URL in development (Vite proxy handles it), production URL in production
export const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'https://my.groomlinkgh.com/api');

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
  logo?: string | null;
  coverImage?: string | null;
  images?: string[];
  hasParking?: boolean;
  hasWifi?: boolean;
  hasAC?: boolean;
  acceptsWalkIns?: boolean;
  maxConcurrentClients?: number;
  totalChairs?: number;
  bufferTimeMinutes?: number;
  operatingModel?: 'APPOINTMENTS_ONLY' | 'WALK_INS_ALLOWED';
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  category: string;
  duration: number;
  price: string;
  discountPrice?: string | null;
  promoLabel?: string | null;
  isActive: boolean;
}

export interface CreateServicePayload {
  name: string;
  description?: string;
  category: string;
  duration: number;
  price: number;
  discountPrice?: number | null;
  promoLabel?: string | null;
  image?: string;
}

export interface UpdateServicePayload {
  name?: string;
  description?: string;
  category?: string;
  duration?: number;
  price?: number;
  discountPrice?: number | null;
  promoLabel?: string | null;
  image?: string;
  isActive?: boolean;
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
  customer: { firstName: string; lastName: string; phoneNumber: string; email?: string };
  salonId: string;
  serviceId: string;
  service: { name: string; price: string; duration?: number };
  workerId?: string;
  worker?: { fullName: string };
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  totalAmount: string;
  notes?: string;
  paymentStatus?: 'PENDING' | 'HELD_IN_ESCROW' | 'RELEASED' | 'REFUNDED' | 'PENALTY_APPLIED';
  cancelledBy?: 'CUSTOMER' | 'PROVIDER' | 'SYSTEM';
  cancellationReason?: string;
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
  refundEligible?: boolean;
  cancellationDeadline?: string;
  noShowFlag?: boolean;
  // Service completion fields
  serviceCompleted?: boolean;
  serviceCompletedAt?: string;
  completionMethod?: 'MANUAL' | 'QR' | 'AUTO' | 'CUSTOMER';
  customerConfirmed?: boolean;
  disputeRaised?: boolean;
  // Check-in fields
  checkedIn?: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  checkinCode?: string;
  queuePosition?: number;
}

export interface CompletionSettings {
  autoCompletionHours: number;
  requiresCustomerConfirmation: boolean;
  completionReminderEnabled: boolean;
  qrCheckinEnabled: boolean;
}

export interface EarningsSummary {
  escrowHeld: number;
  releasedThisMonth: number;
  pendingPenalties: number;
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

export type NotificationType = 
  | 'BOOKING_CONFIRMED' 
  | 'BOOKING_CANCELLED' 
  | 'BOOKING_REMINDER' 
  | 'BOOKING_COMPLETED' 
  | 'PAYMENT_RECEIVED' 
  | 'PAYMENT_FAILED'
  | 'CHECKIN'
  | 'REVIEW'
  | 'PROMOTION' 
  | 'SYSTEM';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

export interface KycSubmission {
  id: string;
  salonId: string;
  businessType: string;
  ownerLegalName: string;
  businessRegName?: string;
  tinNumber?: string;
  registrationNumber?: string;
  governmentIdUrl?: string;
  selfieWithIdUrl?: string;
  storefrontVideoUrl?: string;
  interiorVideoUrl?: string;
  businessCertUrl?: string;
  proofOfAddressUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  submittedAt: string;
  updatedAt: string;
}

export interface PayoutAccount {
  id: string;
  payoutType: string | null;
  bankCode: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  momoProvider: string | null;
  momoNumber: string | null;
  paystackRecipientCode: string | null;
  isVerified: boolean;
}

export interface SetupPayoutAccountPayload {
  payoutType: 'bank' | 'mobile_money';
  bankCode?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  momoProvider?: 'mtn' | 'vodafone' | 'airteltigo';
  momoNumber?: string;
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Always read token fresh from localStorage to avoid stale closure issues
    const token = localStorage.getItem('auth_token');
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('No auth token found in localStorage');
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An error occurred' }));
        console.error(`API Error [${response.status}]:`, errorData);

        // Extract error message from the response
        // Backend returns: { success: false, error: { code, message } }
        const errorMessage = errorData.error?.message || errorData.message || 'Request failed';

        // Only clear token on 401 from authentication-related endpoints
        // Auth endpoints are: /auth/login, /auth/verify-otp, /auth/register, /auth/refresh, etc.
        // A 401 from auth endpoints means the token is invalid/expired
        // A 401 from other endpoints (like /users/profile) should NOT clear the token automatically
        // A 403 (Forbidden) should NOT clear the token - user is authenticated but lacks permissions
        if (response.status === 401) {
          // Only consider actual auth endpoints (paths starting with /auth/)
          const isAuthEndpoint = endpoint.startsWith('/auth/');
          if (isAuthEndpoint) {
            console.log('401 from auth endpoint - clearing token');
            this.setToken(null);
          } else {
            // For non-auth endpoints, 401 might indicate token expiry
            // But we should let the calling code handle it, not auto-clear the token
            console.log('401 from non-auth endpoint:', endpoint, '- NOT clearing token');
          }
        }
        // Note: 403 errors should NOT clear the token - user is authenticated but doesn't have permission

        // Create error with status code attached so callers can check for 401
        const err = new Error(errorMessage) as Error & { status: number; code?: string };
        (err as any).status = response.status;
        (err as any).code = errorData.error?.code;
        throw err;
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
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

  async verifyEmailOTP(email: string, code: string, role?: 'CUSTOMER' | 'SALON_OWNER') {
    const response = await this.request<{ success: boolean; data: { tokens: { accessToken: string; refreshToken: string }; user: { id: string; role: string; firstName: string; lastName: string }; isNewUser: boolean } }>('/auth/otp/email/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code, role: role || 'SALON_OWNER' }),
    });
    if (response.success && response.data.tokens?.accessToken) {
      this.setToken(response.data.tokens.accessToken);
      // Log user role for debugging
      console.log('User logged in with role:', response.data.user?.role);
    }
    return response;
  }

  async completeRegistration(data: { email: string; firstName: string; lastName: string; role?: 'CUSTOMER' | 'SALON_OWNER' }) {
    const response = await this.request<{ success: boolean; data: { tokens: { accessToken: string; refreshToken: string }; user: { id: string; role: string; firstName: string; lastName: string }; isNewUser: boolean } }>('/auth/complete-registration', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.success && response.data.tokens?.accessToken) {
      this.setToken(response.data.tokens.accessToken);
      console.log('Registration completed with role:', response.data.user?.role);
    }
    return response;
  }

  async getCurrentUser() {
    return this.request<{ success: boolean; data: { id: string; role: string; email: string; phoneNumber: string; firstName: string; lastName: string } }>('/users/profile');
  }

  // Salon
  async createSalon(data: {
    businessName: string;
    type: string;
    phoneNumber: string;
    address: string;
    city: string;
    region: string;
    latitude: number;
    longitude: number;
    openingTime: string;
    closingTime: string;
    workingDays: string[];
    description?: string;
    email?: string;
  }) {
    return this.request<{ success: boolean; data: Salon }>('/salons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

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
    return this.request<{ success: boolean; data: Service[] }>(`/salon-owner/${salonId}/services`);
  }

  async createService(salonId: string, data: CreateServicePayload) {
    return this.request<{ success: boolean; data: Service }>(`/salon-owner/${salonId}/services`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateService(salonId: string, serviceId: string, data: UpdateServicePayload) {
    return this.request<{ success: boolean; data: Service }>(`/salon-owner/${salonId}/services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteService(salonId: string, serviceId: string) {
    return this.request<{ success: boolean }>(`/salon-owner/${salonId}/services/${serviceId}`, {
      method: 'DELETE',
    });
  }

  // Workers
  async getWorkers(salonId: string) {
    return this.request<{ success: boolean; data: Worker[] }>(`/salon-owner/${salonId}/staff`);
  }

  async createWorker(salonId: string, data: Partial<Worker>) {
    return this.request<{ success: boolean; data: Worker }>(`/salon-owner/${salonId}/staff`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWorker(salonId: string, staffId: string, data: Partial<Worker>) {
    return this.request<{ success: boolean; data: Worker }>(`/salon-owner/${salonId}/staff/${staffId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWorker(salonId: string, staffId: string) {
    return this.request<{ success: boolean }>(`/salon-owner/${salonId}/staff/${staffId}`, {
      method: 'DELETE',
    });
  }

  // Bookings
  async getBookings(salonId: string, date?: string) {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    const query = params.toString() ? `?${params}` : '';
    return this.request<{ success: boolean; data: Booking[] }>(`/bookings/salon/${salonId}${query}`);
  }

  // Queue for today's bookings
  async getSalonQueue(salonId: string) {
    return this.request<{ success: boolean; data: { queue: Booking[]; stats: { totalQueued: number; checkedInCount: number; notCheckedInCount: number; rescheduledCount: number } } }>(`/bookings/salon/${salonId}/queue`);
  }

  // Check-in by QR code or checkin code
  async checkinByQr(data: { bookingId?: string; checkinCode?: string; qrData?: string }) {
    return this.request<{ success: boolean; data: { booking: Booking; message: string } }>('/bookings/checkin-by-qr', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBookingStatus(salonId: string, bookingId: string, status: string) {
    return this.request<{ success: boolean; data: Booking }>(`/salon-owner/${salonId}/bookings/${bookingId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Booking completion and no-show actions
  async completeBooking(bookingId: string) {
    return this.request<{ success: boolean; data: Booking }>(`/bookings/${bookingId}/complete`, {
      method: 'POST',
    });
  }

  async completeByQR(bookingId: string, qrToken: string) {
    return this.request<{ success: boolean; data: Booking }>('/bookings/complete-by-qr', {
      method: 'POST',
      body: JSON.stringify({ bookingId, qrToken }),
    });
  }

  async markNoShow(bookingId: string) {
    return this.request<{ success: boolean; data: Booking }>(`/bookings/${bookingId}/no-show`, {
      method: 'POST',
    });
  }

  async cancelBookingAsProvider(bookingId: string, reason?: string) {
    return this.request<{ success: boolean; data: Booking }>(`/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Completion settings
  async getCompletionSettings(salonId: string) {
    return this.request<{ success: boolean; data: CompletionSettings }>(`/salon/${salonId}/completion-settings`);
  }

  async updateCompletionSettings(salonId: string, settings: CompletionSettings) {
    return this.request<{ success: boolean; data: CompletionSettings }>(`/salon/${salonId}/completion-settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Earnings summary for provider
  async getEarningsSummary(salonId: string) {
    return this.request<{ success: boolean; data: EarningsSummary }>(`/salon-owner/${salonId}/earnings`);
  }

  // Dashboard
  async getDashboardStats(salonId: string) {
    return this.request<{ success: boolean; data: DashboardStats }>(`/salon-owner/${salonId}/dashboard-stats`);
  }

  // Reviews
  async getReviews(salonId: string) {
    return this.request<{ success: boolean; data: { reviews: { id: string; rating: number; comment: string; customer: { firstName: string; lastName?: string }; createdAt: string }[] } }>(`/salon-owner/${salonId}/reviews`);
  }

  async replyToReview(salonId: string, reviewId: string, reply: string) {
    return this.request<{ success: boolean }>(`/salon-owner/${salonId}/reviews/${reviewId}/reply`, {
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

  // Notifications
  async getNotifications() {
    return this.request<{ success: boolean; data: { notifications: Notification[]; unreadCount: number } }>('/notifications');
  }

  async markNotificationAsRead(id: string) {
    return this.request<{ success: boolean }>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead() {
    return this.request<{ success: boolean; data: { message: string; count: number } }>('/notifications/read-all', {
      method: 'PUT',
    });
  }

  // Image Uploads - Using fetch directly for multipart/form-data
  async uploadSalonLogo(salonId: string, file: File): Promise<{ success: boolean; data: { logo: string } }> {
    const formData = new FormData();
    formData.append('logo', file);
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${this.baseUrl}/uploads/salon/${salonId}/logo`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    return response.json();
  }

  async uploadSalonCover(salonId: string, file: File): Promise<{ success: boolean; data: { coverImage: string } }> {
    const formData = new FormData();
    formData.append('cover', file);
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${this.baseUrl}/uploads/salon/${salonId}/cover`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    return response.json();
  }

  async uploadSalonGallery(salonId: string, files: File[]): Promise<{ success: boolean; data: { images: string[] } }> {
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${this.baseUrl}/uploads/salon/${salonId}/gallery`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    return response.json();
  }

  async deleteGalleryImage(salonId: string, imageUrl: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/uploads/salon/${salonId}/gallery`, {
      method: 'DELETE',
      body: JSON.stringify({ imageUrl }),
    });
  }

  // KYC
  async getKycStatus(): Promise<{ success: boolean; data: KycSubmission | null }> {
    return this.request<{ success: boolean; data: KycSubmission | null }>('/kyc/status');
  }

  async submitKyc(data: { businessType: string; ownerLegalName: string; businessRegName?: string; tinNumber?: string; registrationNumber?: string }): Promise<{ success: boolean; data: KycSubmission }> {
    return this.request<{ success: boolean; data: KycSubmission }>('/kyc/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadKycDocument(field: string, file: File): Promise<{ success: boolean; data: { url: string } }> {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${this.baseUrl}/kyc/upload/${field}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    return response.json();
  }

  // Payout Account
  async getPayoutAccount(salonId: string): Promise<{ success: boolean; data: PayoutAccount }> {
    return this.request<{ success: boolean; data: PayoutAccount }>(`/salons/${salonId}/payout-account`);
  }

  async setupPayoutAccount(salonId: string, data: SetupPayoutAccountPayload): Promise<{ success: boolean; data: { message: string; payoutAccount: PayoutAccount } }> {
    return this.request<{ success: boolean; data: { message: string; payoutAccount: PayoutAccount } }>(`/salons/${salonId}/payout-account`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSupportedBanks(): Promise<{ success: boolean; data: { banks: { code: string; name: string }[] } }> {
    return this.request<{ success: boolean; data: { banks: { code: string; name: string }[] } }>('/salons/payouts/banks');
  }

  async getSupportedMomoProviders(): Promise<{ success: boolean; data: { providers: { code: string; name: string }[] } }> {
    return this.request<{ success: boolean; data: { providers: { code: string; name: string }[] } }>('/salons/payouts/momo-providers');
  }

  logout() {
    this.setToken(null);
  }

  isAuthenticated() {
    return !!this.token;
  }

  getToken() {
    return this.token;
  }
}

export const api = new ApiClient();

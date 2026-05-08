export interface User {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  avatar: string | null;
  role: 'SALON_OWNER';
  isVerified: boolean;
}

export interface Salon {
  id: string;
  businessName: string;
  address: string;
  city: string;
  region?: string;
  phoneNumber: string;
  email: string | null;
  description: string | null;
  type?: string;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  reviewCount: number;
  images: string[];
  logo: string | null;
  coverImage: string | null;
  // Business hours - server returns these fields
  openingTime?: string;
  closingTime?: string;
  workingDays?: string[];
  operatingHours?: Record<string, { open: string; close: string; isOpen: boolean } | string> | null;
  // Legacy field for backwards compat
  openingHours?: OpeningHours;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED';
  services: Service[];
  workers: Worker[];
  bookings: Booking[];
  // Subscription
  subscriptionStatus?: string;
  // Features
  hasParking?: boolean;
  hasWifi?: boolean;
  hasAC?: boolean;
  acceptsWalkIns?: boolean;
  isFeatured?: boolean;
  maxConcurrentClients?: number;
  totalChairs?: number;
  operatingModel?: string;
  providerCategory?: string;
  serviceAreas?: string[];
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string | null;
  };
  _count?: { reviews: number };
}

export interface OpeningHours {
  monday: { open: string; close: string; isOpen: boolean };
  tuesday: { open: string; close: string; isOpen: boolean };
  wednesday: { open: string; close: string; isOpen: boolean };
  thursday: { open: string; close: string; isOpen: boolean };
  friday: { open: string; close: string; isOpen: boolean };
  saturday: { open: string; close: string; isOpen: boolean };
  sunday: { open: string; close: string; isOpen: boolean };
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  duration: number;
  category: string;
  isActive?: boolean;
  discountPrice?: number | string | null;
  promoLabel?: string | null;
  image?: string | null;
}

export interface Worker {
  id: string;
  name: string;
  avatar: string | null;
  specialty: string | null;
  rating: number;
  isActive: boolean;
  services: Service[];
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface Guest {
  id: string;
  guestName: string;
  guestPhone?: string;
  guestAgeGroup?: string;
  isChild?: boolean;
  specialInstructions?: string;
  checkedIn?: boolean;
  service: {
    id: string;
    name: string;
    price: number;
    duration?: number;
  };
  staff?: {
    id: string;
    fullName: string;
  };
}

export interface Escrow {
  id: string;
  status: string;
  amountHeld: number;
  platformFee: number;
  providerAmount: number;
}

export interface Booking {
  id: string;
  status: BookingStatus;
  date: string;
  startTime: string;
  endTime: string;
  totalAmount: number | string;
  finalAmount: number | string;
  customerNotes: string | null;
  salonNotes: string | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  worker: {
    id: string;
    fullName: string;
    avatar: string | null;
  } | null;
  service: {
    id: string;
    name: string;
    price: number;
    duration: number;
  };
  salon: {
    id: string;
    businessName: string;
    logo: string | null;
  };
  createdAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  // Group booking fields
  isGroupBooking?: boolean;
  totalPeople?: number;
  groupBookingRef?: string;
  billingType?: 'combined' | 'separate';
  guests?: Guest[];
  // Escrow fields
  escrow?: Escrow;
  refundEligible?: boolean;
  cancellationDeadline?: string;
  noShowFlag?: boolean;
  // Payment status
  paymentStatus?: 'PENDING' | 'HELD_IN_ESCROW' | 'RELEASED' | 'REFUNDED' | 'PENALTY_APPLIED';
  cancelledBy?: 'CUSTOMER' | 'PROVIDER' | 'SYSTEM';
  cancellationReason?: string;
  // Service completion fields
  serviceCompleted?: boolean;
  serviceCompletedAt?: string;
  completionMethod?: 'MANUAL' | 'AUTO' | 'QR' | 'CUSTOMER';
  customerConfirmed?: boolean;
  disputeRaised?: boolean;
  // Check-in fields
  checkedIn?: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  checkinCode?: string;
  queuePosition?: number;
  // Review field
  review?: {
    id: string;
    rating: number;
    comment?: string | null;
    createdAt?: string;
  } | null;
}

export interface DashboardStats {
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
}

export interface CompletionSettings {
  autoCompletionHours: number;
  requiresCustomerConfirmation: boolean;
  completionReminderEnabled: boolean;
  qrCheckinEnabled: boolean;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data: {
    user: User;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
    isNewUser: boolean;
  };
}

// Re-export navigation types
export type { MainStackParamList, AuthStackParamList, TabParamList, MainNavigationProp } from './navigation';

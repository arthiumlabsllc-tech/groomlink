export interface User {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  avatar: string | null;
  role: 'CUSTOMER' | 'SALON_OWNER';
  isVerified: boolean;
}

export interface Salon {
  id: string;
  businessName: string;
  address: string;
  city: string;
  phone: string;
  email: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  images: string[];
  coverImage: string | null;
  logo: string | null;
  openingHours: OpeningHours;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED';
  owner: User;
  services: Service[];
  workers: Worker[];
  distance?: number;
  acceptsWalkIns?: boolean;
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
  price: number;
  duration: number;
  category: string;
}

export interface Worker {
  id: string;
  name: string;
  avatar: string | null;
  specialty: string | null;
  rating: number;
  services: Service[];
}

export interface Booking {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledDate: string;
  scheduledTime: string;
  totalAmount: number;
  notes: string | null;
  salon: Salon;
  worker: Worker;
  services: Service[];
  createdAt: string;
  isGroupBooking?: boolean;
  totalPeople?: number;
  groupBookingRef?: string;
  groupReference?: string;
  billingType?: 'combined' | 'separate';
  guests?: Array<{
    id: string;
    guestName: string;
    guestPhone?: string;
    guestAgeGroup?: string;
    isChild?: boolean;
    specialInstructions?: string;
    checkedIn?: boolean;
    serviceId?: string;
    service?: { id: string; name: string; price: number; duration?: number };
    staff?: { id: string; fullName: string };
  }>;
  escrow?: {
    id: string;
    status: string;
    amountHeld: number;
    platformFee: number;
    providerAmount: number;
  };
  refundEligible?: boolean;
  refundPercentage?: number;
  cancellationDeadline?: string;
  noShowFlag?: boolean;
  serviceCompleted?: boolean;
  serviceCompletedAt?: string;
  completionMethod?: string;
  customerConfirmed?: boolean;
  disputeRaised?: boolean;
  disputeReason?: string;
  autoCompletionDeadline?: string;
  // Check-in and queue fields
  checkedIn?: boolean;
  checkedInAt?: string;
  checkinCode?: string;
  queuePosition?: number;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  user: User;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
    isNewUser: boolean;
  };
}

export interface RefundPreview {
  refundPercentage: number;
  refundAmount: number;
  providerAmount: number;
  platformFee: number;
  hoursUntilBooking: number;
  tier: string;
}

export interface NoShowStatus {
  restricted: boolean;
  reason?: string;
  restrictedUntil?: string;
  noShowCount: number;
}

export interface QueuePositionResponse {
  queuePosition: number | null;
  checkedIn: boolean;
  checkedInAt?: string;
  estimatedWaitMinutes?: number;
  peopleAhead?: number;
}

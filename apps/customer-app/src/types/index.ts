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
  region?: string;
  phoneNumber: string;
  email: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  reviewCount: number;
  images: string[];
  coverImage: string | null;
  logo: string | null;
  // Business hours - server sends these fields
  openingTime?: string;
  closingTime?: string;
  workingDays?: string[];
  operatingHours?: Record<string, { open: string; close: string; isOpen: boolean } | string> | null;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED';
  type?: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string | null;
  };
  services: Service[];
  workers: Worker[];
  distance?: number;
  acceptsWalkIns?: boolean;
  isFeatured?: boolean;
  _count?: { reviews: number };
  // Additional server fields
  hasParking?: boolean;
  hasWifi?: boolean;
  hasAC?: boolean;
  maxConcurrentClients?: number;
  totalChairs?: number;
  operatingModel?: string;
  providerCategory?: string;
  subscriptionStatus?: string;
}

export interface OpeningHours {
  monday: { open: string; close: string; isOpen: boolean } | string;
  tuesday: { open: string; close: string; isOpen: boolean } | string;
  wednesday: { open: string; close: string; isOpen: boolean } | string;
  thursday: { open: string; close: string; isOpen: boolean } | string;
  friday: { open: string; close: string; isOpen: boolean } | string;
  saturday: { open: string; close: string; isOpen: boolean } | string;
  sunday: { open: string; close: string; isOpen: boolean } | string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number | string; // API returns Decimal as string
  duration: number;
  category: string;
  discountPrice?: number | string | null;
  promoLabel?: string | null;
  image?: string | null;
  isActive?: boolean;
  offersHomeService?: boolean;
  homeServiceFee?: number | string | null;
}

export interface Worker {
  id: string;
  fullName: string;
  avatar: string | null;
  specialties: string[];
  rating: number;
  reviewCount?: number;
}

export interface Booking {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledDate: string;
  scheduledTime: string;
  // Fallback fields - API may return original Prisma field names
  date?: string;
  startTime?: string;
  endTime?: string;
  totalAmount: number | string; // Prisma Decimal returns string
  finalAmount?: number | string;
  notes: string | null;
  salon: Salon;
  worker: Worker | null;
  services: Service[];
  createdAt: string;
  payment?: {
    status: string;
    provider: string;
  } | null;
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
    service?: { id: string; name: string; price: number | string; duration?: number };
    staff?: { id: string; fullName: string };
  }>;
  escrow?: {
    id: string;
    status: string;
    amountHeld: number | string;
    platformFee: number | string;
    providerAmount: number | string;
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
  // Review field
  review?: {
    id: string;
    rating: number;
    comment?: string | null;
    createdAt?: string;
  } | null;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  // Server returns 'customer', but we also support 'user' for backwards compatibility
  user?: { firstName: string; lastName: string; avatar?: string | null };
  customer?: { firstName: string; lastName: string; avatar?: string | null };
  createdAt: string;
  salonReply?: string | null;
  salonRepliedAt?: string | null;
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

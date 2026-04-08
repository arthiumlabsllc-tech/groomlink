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
  phone: string;
  email: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  images: string[];
  openingHours: OpeningHours;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED';
  services: Service[];
  workers: Worker[];
  bookings: Booking[];
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
  isActive: boolean;
  services: Service[];
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Booking {
  id: string;
  status: BookingStatus;
  date: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  finalAmount: number;
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
}

export interface DashboardStats {
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
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

// Re-export navigation types
export type { MainStackParamList, AuthStackParamList, TabParamList } from './navigation';

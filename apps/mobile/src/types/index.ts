export interface User {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  avatar: string | null;
  role: 'CUSTOMER' | 'SALON_OWNER' | 'ADMIN';
  isVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Salon {
  id: string;
  name: string;
  description: string | null;
  type: 'BARBERSHOP' | 'HAIR_SALON' | 'PEDICURE_SALON' | 'NAIL_SALON' | 'SPA' | 'BEAUTY_SALON';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  phoneNumber: string;
  email: string | null;
  address: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  logo: string | null;
  images: string[];
  openingTime: string;
  closingTime: string;
  workingDays: string[];
  hasParking: boolean;
  hasWifi: boolean;
  hasAC: boolean;
  acceptsWalkIns: boolean;
  rating: number;
  reviewCount: number;
  services?: Service[];
  workers?: Worker[];
}

export interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  specialties: string[];
  yearsOfExperience: number;
  rating: number;
  reviewCount: number;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  duration: number;
  price: number;
  discountPrice: number | null;
  image: string | null;
  isActive: boolean;
}

export interface Booking {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  date: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  finalAmount: number;
  customerNotes: string | null;
  salonNotes: string | null;
  createdAt: string;
  salon: {
    id: string;
    name: string;
    address: string;
    phoneNumber: string;
    logo: string | null;
  };
  service: Service;
  worker: Worker | null;
  payment?: {
    status: string;
    provider: string;
  };
}

export interface Payment {
  id: string;
  provider: 'MTN_MOMO' | 'VODAFONE_CASH' | 'AIRTELTIGO_MONEY' | 'CASH';
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  createdAt: string;
  booking?: Booking;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customer: {
    firstName: string;
    lastName: string;
  };
}

export interface Favorite {
  id: string;
  salon: Salon;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  SalonDetails: { salonId: string };
  Booking: { salonId: string; serviceId?: string };
  Payment: { bookingId: string; amount: number };
  Review: { bookingId: string };
};

export type AuthStackParamList = {
  Welcome: undefined;
  PhoneInput: undefined;
  OTPVerify: { phoneNumber: string };
  Register: { phoneNumber: string };
  Login: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Bookings: undefined;
  Favorites: undefined;
  Profile: undefined;
};

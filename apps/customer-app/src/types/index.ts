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
  openingHours: OpeningHours;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED';
  owner: User;
  services: Service[];
  workers: Worker[];
  distance?: number;
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

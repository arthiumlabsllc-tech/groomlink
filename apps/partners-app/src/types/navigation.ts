import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Email: undefined;
  OTP: { email: string };
  ProfileSetup: { email: string };
  SalonSetup: undefined;
};

export type MainStackParamList = {
  DashboardMain: undefined;
  QueueMain: undefined;
  BookingDetail: { bookingId: string };
  EditSalon: undefined;
  BookingsMain: undefined;
  ServicesMain: undefined;
  AddService: { serviceId?: string; service?: Service } | undefined;
  StaffMain: undefined;
  AddStaff: { staffId?: string; staff?: StaffMember } | undefined;
  QRScanner: { bookingId?: string } | undefined;
  Pricing: undefined;
  ProfileMain: undefined;
  PlatformFeedback: undefined;
  Notifications: undefined;
  CompletionSettings: undefined;
  RequestPayout: { availableBalance: number; salonId?: string };
};

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  category: string;
  isActive: boolean;
  discountPrice?: number | null;
  image?: string | null;
  workerServices?: Array<{
    worker: {
      id: string;
      fullName: string;
    };
  }>;
}

export interface StaffMember {
  id: string;
  fullName: string;
  phoneNumber?: string | null;
  email?: string | null;
  bio?: string | null;
  avatar?: string | null;
  specialty?: string | null;
  yearsOfExperience?: number | null;
  specialties?: string[];
  isActive: boolean;
  rating?: number;
  workerServices?: Array<{
    service: Service;
    priceOverride?: number | null;
  }>;
}

export type TabParamList = {
  Dashboard: undefined;
  Queue: undefined;
  Bookings: undefined;
  Services: undefined;
  Staff: undefined;
  Profile: undefined;
};

export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type MainNavigationProp = NativeStackNavigationProp<MainStackParamList>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends AuthStackParamList, MainStackParamList, TabParamList {}
  }
}

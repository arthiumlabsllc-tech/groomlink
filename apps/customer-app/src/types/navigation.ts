import { NavigationProp, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { User } from '.';

// Auth stack params (used inside AuthNavigator modal group)
export type AuthStackParamList = {
  Email: { returnTo?: string };
  OTP: { email: string; returnTo?: string };
  ProfileSetup: { email: string; returnTo?: string };
};

// Per-tab stack params (public browsing stacks)
export type HomeStackParamList = {
  HomeMain: undefined;
  SalonDetail: { salonId: string };
  Notifications: undefined;
};

export type SearchStackParamList = {
  SearchMain: undefined;
  SalonDetail: { salonId: string };
};

export type MapStackParamList = {
  MapMain: undefined;
  SalonDetail: { salonId: string };
};

// Bookings tab stack
export type BookingsStackParamList = {
  BookingsMain: undefined;
  BookingDetail: { bookingId: string };
  BookingQRCode: { bookingId: string };
  RateBooking: { bookingId: string };
};

// Profile tab stack
export type ProfileStackParamList = {
  ProfileMain: undefined;
  PlatformFeedback: undefined;
};

// Keep MainStackParamList for backward compatibility with existing screen imports
export type MainStackParamList = {
  HomeMain: undefined;
  SearchMain: undefined;
  MapMain: undefined;
  SalonDetail: { salonId: string };
  Booking: { salonId: string; workerId?: string; services?: string[] };
  BookingConfirmation: { bookingId: string };
  BookingDetail: { bookingId: string };
  BookingQRCode: { bookingId: string };
  RateBooking: { bookingId: string };
  PlatformFeedback: undefined;
};

export type TabParamList = {
  Home: undefined;
  Search: { query?: string };
  Map: undefined;
  Bookings: undefined;
  Profile: undefined;
};

// Root stack - the unified navigation structure
export type RootStackParamList = {
  // Main tabs (always rendered)
  MainTabs: undefined;
  // Auth flow (presented as modal)
  Auth: { returnTo?: string };
  // Protected screens (require authentication)
  Booking: { salonId: string; workerId?: string; services?: string[] };
  BookingConfirmation: { bookingId: string };
  BookingDetail: { bookingId: string };
  BookingQRCode: { bookingId: string };
  RateBooking: { bookingId: string };
  PlatformFeedback: undefined;
};

export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type MainNavigationProp = NativeStackNavigationProp<MainStackParamList>;
export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList, MainStackParamList, AuthStackParamList, TabParamList {}
  }
}

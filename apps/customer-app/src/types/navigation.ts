import { NavigationProp, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { User } from '.';

export type AuthStackParamList = {
  Email: undefined;
  OTP: { email: string };
  ProfileSetup: { email: string };
};

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

export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type MainNavigationProp = NativeStackNavigationProp<MainStackParamList>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends AuthStackParamList, MainStackParamList, TabParamList {}
  }
}

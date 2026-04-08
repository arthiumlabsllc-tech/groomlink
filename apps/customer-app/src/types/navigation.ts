import { NavigationProp, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Phone: undefined;
  OTP: { phoneNumber: string };
  ProfileSetup: undefined;
};

export type MainStackParamList = {
  HomeMain: undefined;
  SearchMain: undefined;
  SalonDetail: { salonId: string };
  Booking: { salonId: string; workerId?: string; services?: string[] };
  BookingConfirmation: { bookingId: string };
  BookingDetail: { bookingId: string };
  RateBooking: { bookingId: string };
};

export type TabParamList = {
  Home: undefined;
  Search: { query?: string };
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

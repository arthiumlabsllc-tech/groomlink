import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Phone: undefined;
  OTP: { phoneNumber: string };
  SalonSetup: undefined;
};

export type MainStackParamList = {
  DashboardMain: undefined;
  BookingDetail: { bookingId: string };
  EditSalon: undefined;
  BookingsMain: undefined;
  ServicesMain: undefined;
  AddService: undefined;
  StaffMain: undefined;
  AddStaff: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
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

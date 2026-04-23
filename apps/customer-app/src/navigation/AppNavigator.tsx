import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import BookingScreen from '../screens/main/BookingScreen';
import BookingConfirmationScreen from '../screens/main/BookingConfirmationScreen';
import BookingDetailScreen from '../screens/main/BookingDetailScreen';
import BookingQRCodeScreen from '../screens/main/BookingQRCodeScreen';
import RateBookingScreen from '../screens/main/RateBookingScreen';
import PlatformFeedbackScreen from '../screens/main/PlatformFeedbackScreen';
import LoadingScreen from '../components/LoadingScreen';
import { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isLoading, isAuthenticated, pendingBooking, setPendingBooking } = useAuthStore();
  const navigation = useNavigation<any>();

  // After auth modal dismisses, redirect to pending booking if one exists
  useEffect(() => {
    if (isAuthenticated && pendingBooking) {
      // Use setTimeout to ensure navigation happens after the modal has fully dismissed
      setTimeout(() => {
        navigation.navigate('Booking', { salonId: pendingBooking.salonId });
        setPendingBooking(null);
      }, 100);
    }
  }, [isAuthenticated, pendingBooking]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main tabs - always rendered and accessible */}
      <Stack.Screen name="MainTabs" component={MainNavigator} />

      {/* Auth flow - presented as a modal so users don't lose browsing context */}
      <Stack.Screen
        name="Auth"
        component={AuthNavigator}
        options={{ presentation: 'modal', headerShown: false }}
      />

      {/* Protected screens - require authentication */}
      <Stack.Screen
        name="Booking"
        component={BookingScreen}
        options={{ title: 'Book Appointment', headerShown: true }}
      />
      <Stack.Screen
        name="BookingConfirmation"
        component={BookingConfirmationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BookingDetail"
        component={BookingDetailScreen}
        options={{
          title: 'Booking Details',
          headerShown: true,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { color: '#111827' },
        }}
      />
      <Stack.Screen
        name="BookingQRCode"
        component={BookingQRCodeScreen}
        options={{
          title: 'Check-in Code',
          headerShown: true,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { color: '#111827' },
        }}
      />
      <Stack.Screen
        name="RateBooking"
        component={RateBookingScreen}
        options={{
          title: 'Rate Booking',
          headerShown: true,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { color: '#111827' },
        }}
      />
      <Stack.Screen
        name="PlatformFeedback"
        component={PlatformFeedbackScreen}
        options={{
          title: 'Rate GroomLink',
          headerShown: true,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { color: '#111827' },
        }}
      />
    </Stack.Navigator>
  );
}

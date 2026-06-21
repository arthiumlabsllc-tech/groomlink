import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';

// All screens imported eagerly for fast navigation
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoadingScreen from '../components/LoadingScreen';
import BookingScreen from '../screens/main/BookingScreen';
import BookingConfirmationScreen from '../screens/main/BookingConfirmationScreen';
import PaymentProcessingScreen from '../screens/main/PaymentProcessingScreen';
import BookingDetailScreen from '../screens/main/BookingDetailScreen';
import BookingQRCodeScreen from '../screens/main/BookingQRCodeScreen';
import RateBookingScreen from '../screens/main/RateBookingScreen';
import PlatformFeedbackScreen from '../screens/main/PlatformFeedbackScreen';

import { RootStackParamList } from '../types/navigation';
import { useAppTheme } from '../theme/ThemeContext';

function ScreenLoader() {
  const { theme } = useAppTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isLoading, isAuthenticated, pendingBooking, showAuthModal, setShowAuthModal, setPendingBooking } = useAuthStore();
  const navigation = useNavigation<any>();
  const { theme } = useAppTheme();

  // Show auth modal for new users who need to complete registration
  useEffect(() => {
    if (showAuthModal && !isAuthenticated) {
      setTimeout(() => {
        navigation.navigate('Auth');
        setShowAuthModal(false);
      }, 100);
    }
  }, [showAuthModal, isAuthenticated]);

  // After auth modal dismisses, redirect to pending booking if one exists
  useEffect(() => {
    if (isAuthenticated && pendingBooking) {
      setTimeout(() => {
        navigation.navigate('Booking', { salonId: pendingBooking.salonId });
        setPendingBooking(null);
      }, 100);
    }
  }, [isAuthenticated, pendingBooking]);

  if (isLoading) {
    return <ScreenLoader />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Welcome screen shown to non-authenticated users as entry point */}
      {!isAuthenticated && (
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
      )}

      {/* Main tabs - always accessible (guest can browse) */}
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
        name="PaymentProcessing"
        component={PaymentProcessingScreen}
        options={{ title: 'Processing Payment', headerShown: true }}
      />
      <Stack.Screen
        name="BookingDetail"
        component={BookingDetailScreen}
        options={{
          title: 'Booking Details',
          headerShown: true,
          headerStyle: { backgroundColor: theme.background },
          headerTitleStyle: { color: theme.text },
          headerTintColor: theme.text,
        }}
      />
      <Stack.Screen
        name="BookingQRCode"
        component={BookingQRCodeScreen}
        options={{
          title: 'Check-in Code',
          headerShown: true,
          headerStyle: { backgroundColor: theme.background },
          headerTitleStyle: { color: theme.text },
          headerTintColor: theme.text,
        }}
      />
      <Stack.Screen
        name="RateBooking"
        component={RateBookingScreen}
        options={{
          title: 'Rate Booking',
          headerShown: true,
          headerStyle: { backgroundColor: theme.background },
          headerTitleStyle: { color: theme.text },
          headerTintColor: theme.text,
        }}
      />
      <Stack.Screen
        name="PlatformFeedback"
        component={PlatformFeedbackScreen}
        options={{
          title: 'Rate GroomLink',
          headerShown: true,
          headerStyle: { backgroundColor: theme.background },
          headerTitleStyle: { color: theme.text },
          headerTintColor: theme.text,
        }}
      />
    </Stack.Navigator>
  );
}

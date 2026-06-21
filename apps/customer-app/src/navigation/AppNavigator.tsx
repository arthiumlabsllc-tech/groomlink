import React, { useEffect, Suspense, lazy } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';

// Lazy-load all screens to prevent crashes during module initialization.
// Native modules (react-native-maps, react-native-webview, expo-clipboard)
// are loaded only when their screens are actually navigated to.
const AuthNavigator = lazy(() => import('./AuthNavigator'));
const MainNavigator = lazy(() => import('./MainNavigator'));
const WelcomeScreen = lazy(() => import('../screens/auth/WelcomeScreen'));
const BookingScreen = lazy(() => import('../screens/main/BookingScreen'));
const BookingConfirmationScreen = lazy(() => import('../screens/main/BookingConfirmationScreen'));
const PaymentProcessingScreen = lazy(() => import('../screens/main/PaymentProcessingScreen'));
const BookingDetailScreen = lazy(() => import('../screens/main/BookingDetailScreen'));
const BookingQRCodeScreen = lazy(() => import('../screens/main/BookingQRCodeScreen'));
const RateBookingScreen = lazy(() => import('../screens/main/RateBookingScreen'));
const PlatformFeedbackScreen = lazy(() => import('../screens/main/PlatformFeedbackScreen'));
const LoadingScreen = lazy(() => import('../components/LoadingScreen'));

import { RootStackParamList } from '../types/navigation';
import { useAppTheme } from '../theme/ThemeContext';

// Loading fallback shown while a screen module is being loaded
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
      // Use setTimeout to ensure navigation happens after the modal has fully dismissed
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
    <Suspense fallback={<ScreenLoader />}>
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
    </Suspense>
  );
}

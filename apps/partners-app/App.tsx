import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider, DefaultTheme } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { Platform, Alert, View } from 'react-native';
import Constants from 'expo-constants';
import AppNavigator from './src/navigation/AppNavigator';
import LoadingScreen from './src/components/LoadingScreen';
import { useAuthStore } from './src/store/authStore';
import { authApi } from './src/api/auth';
import { salonApi } from './src/api/salon';
import { useSocket } from './src/hooks/useSocket';
import { useNotificationStore } from './src/store/notificationStore';
import { ThemeProvider, useAppTheme } from './src/theme/ThemeContext';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotificationsAsync() {
  // Check and request notification permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return null;
  }

  // Get push token
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.log('Expo project ID not found; skipping push token registration');
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });

  // Configure Android notification channel
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#006B3F',
    });
  }

  return token;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppInner() {
  const { theme, isDark } = useAppTheme();

  const paperTheme = {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      primary: theme.primary,
      background: theme.background,
      surface: theme.surface,
      text: theme.text,
      onSurface: theme.text,
    },
  };

  const navigationTheme = {
    dark: isDark,
    colors: {
      primary: theme.primary,
      background: theme.background,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
      notification: theme.notificationBadge,
    },
  };

  return (
    <PaperProvider theme={paperTheme}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer theme={navigationTheme}>
          <View style={{ flex: 1, backgroundColor: theme.background }}>
            <AppContent />
            <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={theme.statusBar} />
          </View>
        </NavigationContainer>
      </QueryClientProvider>
    </PaperProvider>
  );
}

const MIN_SPLASH_DURATION_MS = 3500; // 3.5 seconds minimum splash time

function AppContent() {
  const { setUser, clearAuth, isAuthenticated, isLoading, setLoading } = useAuthStore();
  const [salonId, setSalonId] = useState<string | null>(null);
  const [salonReady, setSalonReady] = useState(false);
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);

  useEffect(() => {
    // Enforce minimum splash duration so shop data can load in background
    const timer = setTimeout(() => {
      setMinSplashElapsed(true);
    }, MIN_SPLASH_DURATION_MS);

    checkAuth();
    registerForPushNotificationsAsync();

    return () => clearTimeout(timer);
  }, []);

  // Fetch salon when authenticated, reset on logout
  useEffect(() => {
    if (isAuthenticated) {
      fetchSalon();
    } else {
      setSalonReady(false);
      setSalonId(null);
    }
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      // Check if we have stored tokens
      const accessToken = await SecureStore.getItemAsync('accessToken');
      const storedUser = await authApi.getStoredUser();
      
      if (accessToken && storedUser) {
        // Check if this is a new user in the registration flow
        // New users have a temporary token that will fail profile validation
        const isNewUser = await SecureStore.getItemAsync('isNewUser');
        if (isNewUser === 'true') {
          console.log('New user in registration flow, skipping profile validation');
          setLoading(false);
          return;
        }
        
        // Verify token is still valid by fetching profile
        try {
          const profile = await authApi.getProfile();
          // Fetch salon before setting user to prevent dashboard from rendering without salon data
          try {
            await fetchSalon();
          } catch (salonError) {
            console.error('Failed to fetch salon during auth check:', salonError);
          }
          setSalonReady(true);
          setUser(profile);
        } catch (profileError) {
          // Token is invalid or expired - clear everything and show login
          console.log('Profile fetch failed, clearing auth state');
          await authApi.logout();
          clearAuth();
        }
      } else {
        // No tokens stored - show login screen
        clearAuth();
      }
    } catch (error) {
      // Unexpected error - clear auth and show login screen
      console.log('Auth check failed:', error);
      try {
        await authApi.logout();
      } catch (e) {
        // Ignore logout errors
      }
      clearAuth();
    }
  };

  const fetchSalon = async () => {
    try {
      const salon = await salonApi.getMySalon();
      if (salon) {
        setSalonId(salon.id);
      }
    } catch (error) {
      console.error('Failed to fetch salon:', error);
    } finally {
      setSalonReady(true);
    }
  };

  // Use socket hook for real-time notifications
  useSocket({
    salonId,
    enabled: isAuthenticated && !!salonId,
    onBookingNew: async (data) => {
      if (!data?.booking?.customer || !data?.booking?.service) return;
      const customerName = `${data.booking.customer.firstName || ''} ${data.booking.customer.lastName || ''}`.trim();
      const serviceName = data.booking.service.name || 'a service';
      const bookingId = data.booking.id;

      // Persist to notification store
      useNotificationStore.getState().addNotification({
        type: 'booking_new',
        title: 'New Booking!',
        message: `${customerName || 'A customer'} booked ${serviceName}`,
        data: { bookingId, customerName, serviceName },
      });

      // Fire system notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'New Booking!',
          body: `${customerName || 'A customer'} booked ${serviceName}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { bookingId },
        },
        trigger: null,
      });

      Alert.alert(
        'New Booking!',
        `${customerName || 'A customer'} booked ${serviceName}`,
        [{ text: 'OK' }],
        { cancelable: true }
      );
    },
    onBookingCheckin: async (data) => {
      if (!data?.customerName || !data?.serviceName) return;
      const { customerName, serviceName, queuePosition, bookingId } = data;

      // Persist to notification store
      useNotificationStore.getState().addNotification({
        type: 'booking_checkin',
        title: 'Customer Checked In',
        message: `${customerName} has checked in - Queue position: ${queuePosition || '-'}`,
        data: { bookingId, customerName, serviceName },
      });

      // Fire system notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Customer Checked In',
          body: `${customerName} has checked in - Queue position: ${queuePosition || '-'}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { bookingId },
        },
        trigger: null,
      });

      Alert.alert(
        'Customer Checked In',
        `${customerName} checked in for ${serviceName}. Queue position: ${queuePosition || '-'}`,
        [{ text: 'OK' }],
        { cancelable: true }
      );
    },
    onBookingCompleted: async (data) => {
      if (!data?.customerName || !data?.serviceName) return;
      const { customerName, serviceName, totalAmount, bookingId } = data;

      // Persist to notification store
      useNotificationStore.getState().addNotification({
        type: 'booking_completed',
        title: 'Service Completed',
        message: `${customerName}'s ${serviceName} completed - GH₵${totalAmount || 0}`,
        data: { bookingId, customerName, serviceName, amount: parseFloat(totalAmount || '0') },
      });

      // Fire system notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Service Completed',
          body: `${customerName}'s ${serviceName} completed - GH₵${totalAmount || 0}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { bookingId },
        },
        trigger: null,
      });

      Alert.alert(
        'Service Completed',
        `${customerName} - ${serviceName} completed. Amount: GHS ${totalAmount || 0}`,
        [{ text: 'OK' }],
        { cancelable: true }
      );
    },
    onQueueUpdated: () => {
      // Invalidate query cache for queue data
      queryClient.invalidateQueries({ queryKey: ['queue'] });
    },
  });

  // Show splash screen while auth is initializing, salon is loading, OR minimum duration hasn't elapsed
  if (isLoading || !minSplashElapsed || (isAuthenticated && !salonReady)) {
    return <LoadingScreen />;
  }

  return <AppNavigator />;
}



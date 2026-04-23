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

function AppContent() {
  const { setUser, clearAuth, isAuthenticated, isLoading } = useAuthStore();
  const [salonId, setSalonId] = useState<string | null>(null);
  const [salonReady, setSalonReady] = useState(false);

  useEffect(() => {
    checkAuth();
    registerForPushNotificationsAsync();
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
    onBookingNew: (data) => {
      if (!data?.booking?.customer || !data?.booking?.service) return;
      const customerName = `${data.booking.customer.firstName || ''} ${data.booking.customer.lastName || ''}`.trim();
      Alert.alert(
        'New Booking!',
        `${customerName || 'A customer'} booked ${data.booking.service.name || 'a service'}`,
        [{ text: 'OK' }],
        { cancelable: true }
      );
    },
    onBookingCheckin: (data) => {
      if (!data?.customerName || !data?.serviceName) return;
      Alert.alert(
        'Customer Checked In',
        `${data.customerName} checked in for ${data.serviceName}. Queue position: ${data.queuePosition || '-'}`,
        [{ text: 'OK' }],
        { cancelable: true }
      );
    },
    onBookingCompleted: (data) => {
      if (!data?.customerName || !data?.serviceName) return;
      Alert.alert(
        'Service Completed',
        `${data.customerName} - ${data.serviceName} completed. Amount: GHS ${data.totalAmount || 0}`,
        [{ text: 'OK' }],
        { cancelable: true }
      );
    },
    onQueueUpdated: () => {
      // Invalidate query cache for queue data
      queryClient.invalidateQueries({ queryKey: ['queue'] });
    },
  });

  if (isLoading || (isAuthenticated && !salonReady)) {
    return <LoadingScreen />;
  }

  return <AppNavigator />;
}



import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { PaperProvider, DefaultTheme } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { Platform, View } from 'react-native';
import Constants from 'expo-constants';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import LoadingScreen from './src/components/LoadingScreen';
import { useAuthStore } from './src/store/authStore';
import { authApi } from './src/api/auth';
import { notificationApi } from './src/api/notification';
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

  // Register push token with backend
  try {
    await notificationApi.registerPushToken(token.data, Platform.OS);
  } catch (e) {
    console.log('Failed to register push token:', e);
  }

  // Configure Android notification channel
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#CE1126',
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

// Navigation reference accessible outside components for notification deep-linking
const navigationRef = React.createRef<NavigationContainerRef<any>>();

const MIN_SPLASH_DURATION_MS = 3500; // 3.5 seconds minimum splash time

function AppContent() {
  const { setUser, setLoading, setShowAuthModal, user, isAuthenticated, isLoading } = useAuthStore();
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);

  useEffect(() => {
    // Enforce minimum splash duration so salons/barbershops can load in background
    const timer = setTimeout(() => {
      setMinSplashElapsed(true);
    }, MIN_SPLASH_DURATION_MS);

    checkAuth();

    // Setup notifications and store cleanup function
    let notificationCleanup: (() => void) | undefined;
    setupNotifications().then((cleanup) => {
      notificationCleanup = cleanup;
    });

    return () => {
      clearTimeout(timer);
      notificationCleanup?.();
    };
  }, []);

  const setupNotifications = async (): Promise<() => void> => {
    // Register for push notifications
    await registerForPushNotificationsAsync();

    // Listen for notification taps (when user taps a notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.bookingId) {
          // Navigate to booking detail when notification is tapped
          setTimeout(() => {
            navigationRef.current?.navigate('BookingDetail', { bookingId: data.bookingId });
          }, 300);
        }
      }
    );

    // Listen for notifications received while app is foregrounded
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data;
        // Add to local notification store if it has the right structure
        if (data?.id) {
          useNotificationStore.getState().addNotification({
            id: data.id as string,
            type: (data.type as any) || 'SYSTEM',
            title: notification.request.content.title || '',
            message: notification.request.content.body || '',
            data: data,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    );

    return () => {
      responseSubscription.remove();
      foregroundSubscription.remove();
    };
  };

  const checkAuth = async () => {
    try {
      // Check if we have tokens stored
      const accessToken = await SecureStore.getItemAsync('accessToken');
      
      if (!accessToken) {
        // No tokens, user is not authenticated
        setLoading(false);
        return;
      }

      // Check if this is a new user in the registration flow
      const isNewUser = await SecureStore.getItemAsync('isNewUser');
      if (isNewUser === 'true') {
        console.log('New user detected, showing auth modal to complete registration');
        setLoading(false);
        setShowAuthModal(true);
        return;
      }

      // Verify token is still valid by fetching profile
      try {
        const profile = await authApi.getProfile();
        setUser(profile);
      } catch (profileError) {
        // Token is invalid or expired - clear everything and show login
        console.log('Session validation failed, clearing tokens');
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        await SecureStore.deleteItemAsync('user');
        setLoading(false);
      }
    } catch (error) {
      // Any unexpected error - ensure we show login screen
      console.error('Auth check failed:', error);
      setLoading(false);
    }
  };

  // Show splash screen while auth is initializing OR minimum duration hasn't elapsed
  if (isLoading || !minSplashElapsed) {
    return <LoadingScreen />;
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

function AppShell() {
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
        <NavigationContainer ref={navigationRef} theme={navigationTheme}>
          <View style={{ flex: 1, backgroundColor: theme.background }}>
            <AppContent />
            <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={theme.statusBar} />
          </View>
        </NavigationContainer>
      </QueryClientProvider>
    </PaperProvider>
  );
}

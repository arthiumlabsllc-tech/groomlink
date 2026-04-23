import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { authApi } from './src/api/auth';
import { notificationApi } from './src/api/notification';
import { useNotificationStore } from './src/store/notificationStore';

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

function AppContent() {
  const { setUser, setLoading, user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    checkAuth();
    setupNotifications();
  }, []);

  const setupNotifications = async () => {
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
        console.log('New user detected, skipping profile validation');
        setLoading(false);
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

  return <AppNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer ref={navigationRef}>
            <AppContent />
            <StatusBar style="auto" />
          </NavigationContainer>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

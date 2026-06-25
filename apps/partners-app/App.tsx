import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef, DefaultTheme as NavDefaultTheme } from '@react-navigation/native';
import { PaperProvider, DefaultTheme } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { Platform, View, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import LoadingScreen from './src/components/LoadingScreen';
import ToastContainer, { ToastMessage } from './src/components/Toast';
import { useAuthStore } from './src/store/authStore';
import { authApi } from './src/api/auth';
import { salonApi } from './src/api/salon';
import apiClient from './src/api/client';
import { notificationApi } from './src/api/notifications';
import { useSocket } from './src/hooks/useSocket';
import { useNotificationStore } from './src/store/notificationStore';
import { ThemeProvider, useAppTheme } from './src/theme/ThemeContext';
import UpdatePrompt from './src/components/UpdatePrompt';

// Suppress foreground alerts – server push handles background/killed; socket drives foreground UX
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowCriticalAlerts: true,
      },
    });
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.log('Expo project ID not found; skipping push token registration');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Booking Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#006B3F',
      sound: 'notification_alert.wav',
    });
  }

  if (tokenData?.data) {
    try {
      await apiClient.post('/users/push-token', {
        token: tokenData.data,
        platform: Platform.OS,
      });
      console.log('Push token registered with server');
    } catch (err) {
      console.warn('Failed to register push token with server:', err);
    }
  }

  return tokenData?.data || null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Navigation reference accessible outside components for notification deep-linking
const navigationRef = React.createRef<NavigationContainerRef<any>>();

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <ThemeProvider>
            <AppInner />
          </ThemeProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

function AppInner() {
  const { theme, isDark } = useAppTheme();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Expose a global toast function so socket callbacks (outside the component tree) can show toasts
  useEffect(() => {
    (globalThis as any).__partnersShowToast = (t: Omit<ToastMessage, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-4), { ...t, id }]);
    };
    return () => { delete (globalThis as any).__partnersShowToast; };
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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
    ...NavDefaultTheme,
    dark: isDark,
    colors: {
      ...NavDefaultTheme.colors,
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
        <UpdatePrompt>
          <NavigationContainer ref={navigationRef} theme={navigationTheme}>
            <View style={{ flex: 1, backgroundColor: theme.background }}>
              <AppContent />
              <ToastContainer toasts={toasts} onExpire={removeToast} />
              <StatusBar style={isDark ? 'light' : 'dark'} />
            </View>
          </NavigationContainer>
        </UpdatePrompt>
      </QueryClientProvider>
    </PaperProvider>
  );
}

// Helper: show a non-blocking toast from anywhere
function showToast(title: string, message: string, type: ToastMessage['type'] = 'info') {
  (globalThis as any).__partnersShowToast?.({ title, message, type });
}

// Helper: navigate to booking detail via navigation ref
function navigateToBooking(bookingId: string) {
  setTimeout(() => {
    navigationRef.current?.navigate('BookingDetail', { bookingId });
  }, 300);
}

const MIN_SPLASH_DURATION_MS = 3500;

function AppContent() {
  const { setUser, clearAuth, isAuthenticated, isLoading, setLoading } = useAuthStore();
  const [salonId, setSalonId] = useState<string | null>(null);
  const [salonReady, setSalonReady] = useState(false);
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);

  const notificationListenerRef = useRef<Notifications.Subscription | null>(null);
  const responseListenerRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMinSplashElapsed(true), MIN_SPLASH_DURATION_MS);
    checkAuth();

    // Foreground notification received – add to store silently (no alert, no banner)
    notificationListenerRef.current = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (data?.bookingId) {
        useNotificationStore.getState().addNotification({
          type: 'system',
          title: notification.request.content.title || 'Notification',
          message: notification.request.content.body || '',
          data: { bookingId: data.bookingId as string },
        });
      }
    });

    // Notification tapped – navigate to booking + invalidate caches
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.bookingId) {
        const bookingId = data.bookingId as string;
        queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
        queryClient.invalidateQueries({ queryKey: ['bookingDetail', bookingId] });
        queryClient.invalidateQueries({ queryKey: ['salonStats'] });
        queryClient.invalidateQueries({ queryKey: ['notificationUnreadCount'] });
        navigateToBooking(bookingId);
      }
    });

    return () => {
      clearTimeout(timer);
      if (notificationListenerRef.current) Notifications.removeNotificationSubscription(notificationListenerRef.current);
      if (responseListenerRef.current) Notifications.removeNotificationSubscription(responseListenerRef.current);
    };
  }, []);

  // Register push token when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotificationsAsync();
    }
  }, [isAuthenticated]);

  // Fetch salon when authenticated, reset on logout
  useEffect(() => {
    if (isAuthenticated) {
      fetchSalon();
    } else {
      setSalonReady(false);
      setSalonId(null);
    }
  }, [isAuthenticated]);

  // Sync notifications from server on auth
  useEffect(() => {
    if (isAuthenticated) {
      syncNotifications();
    }
  }, [isAuthenticated]);

  const syncNotifications = async () => {
    try {
      const data = await notificationApi.getAll(1, 50);
      if (data?.notifications) {
        const mapped = data.notifications.map((n) => ({
          id: n.id,
          type: mapServerType(n.type),
          title: n.title,
          message: n.message,
          timestamp: n.createdAt,
          read: n.isRead,
          serverId: n.id,
          data: n.data,
        }));
        useNotificationStore.getState().setNotifications(mapped);
      }
      if (typeof data?.unreadCount === 'number') {
        useNotificationStore.getState().setServerUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.warn('Failed to sync notifications from server:', err);
    }
  };

  const checkAuth = async () => {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      const storedUser = await authApi.getStoredUser();
      
      if (accessToken && storedUser) {
        const isNewUser = await SecureStore.getItemAsync('isNewUser');
        if (isNewUser === 'true') {
          console.log('New user in registration flow, skipping profile validation');
          setLoading(false);
          return;
        }
        
        try {
          const profile = await authApi.getProfile();
          try { await fetchSalon(); } catch (salonError) {
            console.error('Failed to fetch salon during auth check:', salonError);
          }
          setSalonReady(true);
          setUser(profile);
        } catch (profileError) {
          console.log('Profile fetch failed, clearing auth state');
          await authApi.logout();
          clearAuth();
        }
      } else {
        clearAuth();
      }
    } catch (error) {
      console.log('Auth check failed:', error);
      try { await authApi.logout(); } catch (e) { /* ignore */ }
      clearAuth();
    }
  };

  const fetchSalon = async () => {
    try {
      const salon = await salonApi.getMySalon();
      if (salon) setSalonId(salon.id);
    } catch (error) {
      console.error('Failed to fetch salon:', error);
    } finally {
      setSalonReady(true);
    }
  };

  // Real-time socket listeners
  useSocket({
    salonId,
    enabled: isAuthenticated && !!salonId,

    onBookingNew: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
      queryClient.invalidateQueries({ queryKey: ['salonStats'] });
      if (!data?.booking?.customer || !data?.booking?.service) return;
      const customerName = `${data.booking.customer.firstName || ''} ${data.booking.customer.lastName || ''}`.trim();
      const serviceName = data.booking.service.name || 'a service';
      const bookingId = data.booking.id;

      useNotificationStore.getState().addNotification({
        type: 'booking_new',
        title: 'New Booking!',
        message: `${customerName || 'A customer'} booked ${serviceName}`,
        data: { bookingId, customerName, serviceName },
      });

      showToast('New Booking!', `${customerName || 'A customer'} booked ${serviceName}`, 'success');
    },

    onBookingCheckin: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
      queryClient.invalidateQueries({ queryKey: ['salonStats'] });
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      if (!data?.customerName || !data?.serviceName) return;
      const { customerName, serviceName, queuePosition, bookingId } = data;

      useNotificationStore.getState().addNotification({
        type: 'booking_checkin',
        title: 'Customer Checked In',
        message: `${customerName} has checked in - Queue position: ${queuePosition || '-'}`,
        data: { bookingId, customerName, serviceName },
      });

      showToast('Customer Checked In', `${customerName} – Queue #${queuePosition || '-'}`, 'info');
    },

    onBookingCompleted: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
      queryClient.invalidateQueries({ queryKey: ['salonStats'] });
      if (!data?.customerName || !data?.serviceName) return;
      const { customerName, serviceName, totalAmount, bookingId } = data;

      useNotificationStore.getState().addNotification({
        type: 'booking_completed',
        title: 'Service Completed',
        message: `${customerName}'s ${serviceName} completed - GH₵${totalAmount || 0}`,
        data: { bookingId, customerName, serviceName, amount: parseFloat(totalAmount || '0') },
      });

      showToast('Service Completed', `${customerName} – GH₵${totalAmount || 0}`, 'success');
    },

    onBookingCancelled: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
      queryClient.invalidateQueries({ queryKey: ['salonStats'] });
      if (!data?.customerName || !data?.serviceName) return;
      const { customerName, serviceName, bookingId } = data;

      useNotificationStore.getState().addNotification({
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `${customerName} cancelled their ${serviceName} booking`,
        data: { bookingId, customerName, serviceName },
      });

      showToast('Booking Cancelled', `${customerName} cancelled ${serviceName}`, 'warning');
    },

    onBookingNoShow: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
      queryClient.invalidateQueries({ queryKey: ['salonStats'] });
      if (!data?.bookingId) return;
      const { bookingId, message } = data;

      useNotificationStore.getState().addNotification({
        type: 'booking_no_show',
        title: 'No-Show',
        message: message || 'A customer was marked as no-show',
        data: { bookingId },
      });

      showToast('No-Show', message || 'A customer was marked as no-show', 'warning');
    },

    onBookingConfirmed: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
      queryClient.invalidateQueries({ queryKey: ['salonStats'] });
      if (!data?.bookingId) return;

      useNotificationStore.getState().addNotification({
        type: 'booking_confirmed',
        title: 'Booking Confirmed',
        message: `${data.customerName || 'Customer'} confirmed ${data.serviceName || 'booking'} for ${data.date || ''} ${data.startTime || ''}`,
        data: { bookingId: data.bookingId },
      });

      showToast('Booking Confirmed', `${data.customerName} – ${data.serviceName}`, 'success');
    },

    onBookingRejected: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
      queryClient.invalidateQueries({ queryKey: ['salonStats'] });
      if (!data?.bookingId) return;

      useNotificationStore.getState().addNotification({
        type: 'booking_rejected',
        title: 'Booking Rejected',
        message: `${data.customerName || 'Customer'}'s ${data.serviceName || 'booking'} was rejected${data.reason ? `: ${data.reason}` : ''}`,
        data: { bookingId: data.bookingId },
      });

      showToast('Booking Rejected', `${data.customerName} – ${data.serviceName}`, 'error');
    },

    onSlotUpdated: () => {
      queryClient.invalidateQueries({ queryKey: ['availableSlots'] });
      queryClient.invalidateQueries({ queryKey: ['salonSlots'] });
    },

    onNotificationCreated: (data) => {
      // Real-time server notification – add to store and refresh unread count
      useNotificationStore.getState().addNotification({
        type: 'system',
        title: data.title,
        message: data.message,
        serverId: data.id,
        timestamp: data.createdAt,
        data: data.data,
      });
      queryClient.invalidateQueries({ queryKey: ['notificationUnreadCount'] });
      if (data.data?.bookingId) {
        showToast(data.title, data.message, 'info');
      }
    },

    onQueueUpdated: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
    },
  });

  if (isLoading || !minSplashElapsed || (isAuthenticated && !salonReady)) {
    return <LoadingScreen />;
  }

  return <AppNavigator />;
}

// Map server notification type string to local NotificationType
function mapServerType(serverType: string): 'booking_new' | 'booking_confirmed' | 'booking_checkin' | 'booking_completed' | 'booking_cancelled' | 'booking_rejected' | 'booking_no_show' | 'slot_updated' | 'review_new' | 'system' {
  const map: Record<string, 'booking_new' | 'booking_confirmed' | 'booking_checkin' | 'booking_completed' | 'booking_cancelled' | 'booking_rejected' | 'booking_no_show' | 'slot_updated' | 'review_new' | 'system'> = {
    BOOKING_CREATED: 'booking_new',
    BOOKING_CONFIRMED: 'booking_confirmed',
    CHECKIN: 'booking_checkin',
    BOOKING_COMPLETED: 'booking_completed',
    BOOKING_CANCELLED: 'booking_cancelled',
    BOOKING_REJECTED: 'booking_rejected',
    BOOKING_NO_SHOW: 'booking_no_show',
    REVIEW: 'review_new',
  };
  return map[serverType] || 'system';
}

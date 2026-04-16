import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { authApi } from './src/api/auth';
import { salonApi } from './src/api/salon';
import { useSocket } from './src/hooks/useSocket';
import { Alert } from 'react-native';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function AppContent() {
  const { setUser, clearAuth, isAuthenticated } = useAuthStore();
  const [salonId, setSalonId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  // Fetch salon when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchSalon();
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
    }
  };

  // Use socket hook for real-time notifications
  useSocket({
    salonId,
    enabled: isAuthenticated && !!salonId,
    onBookingNew: (data) => {
      const customerName = `${data.booking.customer.firstName} ${data.booking.customer.lastName}`;
      Alert.alert(
        'New Booking!',
        `${customerName} booked ${data.booking.service.name}`,
        [{ text: 'OK' }],
        { cancelable: true }
      );
    },
    onBookingCheckin: (data) => {
      Alert.alert(
        'Customer Checked In',
        `${data.customerName} checked in for ${data.serviceName}. Queue position: ${data.queuePosition}`,
        [{ text: 'OK' }],
        { cancelable: true }
      );
    },
    onBookingCompleted: (data) => {
      Alert.alert(
        'Service Completed',
        `${data.customerName} - ${data.serviceName} completed. Amount: GHS ${data.totalAmount}`,
        [{ text: 'OK' }],
        { cancelable: true }
      );
    },
    onQueueUpdated: () => {
      // Invalidate query cache for queue data
      queryClient.invalidateQueries({ queryKey: ['queue'] });
    },
  });

  return <AppNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <AppContent />
            <StatusBar style="auto" />
          </NavigationContainer>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { authApi } from './src/api/auth';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function AppContent() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

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
      // New users have a temporary token that will fail profile validation
      const isNewUser = await SecureStore.getItemAsync('isNewUser');
      if (isNewUser === 'true') {
        // New user - skip profile validation, stay in auth flow
        // ProfileSetupScreen will handle completing registration
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
          <NavigationContainer>
            <AppContent />
            <StatusBar style="auto" />
          </NavigationContainer>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

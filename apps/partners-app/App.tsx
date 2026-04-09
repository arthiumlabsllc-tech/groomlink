import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { authApi } from './src/api/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function AppContent() {
  const { setUser, clearAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

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

import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import DashboardScreen from '../screens/main/DashboardScreen';
import QueueScreen from '../screens/main/QueueScreen';
import BookingsScreen from '../screens/main/BookingsScreen';
import ServicesScreen from '../screens/main/ServicesScreen';
import StaffScreen from '../screens/main/StaffScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import BookingDetailScreen from '../screens/main/BookingDetailScreen';
import EditSalonScreen from '../screens/main/EditSalonScreen';
import AddServiceScreen from '../screens/main/AddServiceScreen';
import AddStaffScreen from '../screens/main/AddStaffScreen';
import QRScannerScreen from '../screens/main/QRScannerScreen';
import PricingScreen from '../screens/main/PricingScreen';
import PlatformFeedbackScreen from '../screens/main/PlatformFeedbackScreen';
import NotificationsListScreen from '../screens/main/NotificationsListScreen';
import CompletionSettingsScreen from '../screens/main/CompletionSettingsScreen';
import RequestPayoutScreen from '../screens/main/RequestPayoutScreen';
import PayoutHistoryScreen from '../screens/main/PayoutHistoryScreen';
import ChatScreen from '../screens/support/ChatScreen';
import ReviewsScreen from '../screens/main/ReviewsScreen';
import { MainStackParamList, TabParamList } from '../types/navigation';
import { AppTheme } from '../theme/colors';
import { useAppTheme } from '../theme/ThemeContext';
import { bookingsApi } from '../api/bookings';
import { salonApi } from '../api/salon';
import { notificationApi } from '../api/notifications';
import { useNotificationStore } from '../store/notificationStore';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

function DashboardStack() {
  const { theme } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="DashboardMain" component={DashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Booking Details' }} />
      <Stack.Screen name="EditSalon" component={EditSalonScreen} options={{ title: 'Edit Salon' }} />
      <Stack.Screen name="Pricing" component={PricingScreen} options={{ title: 'Subscription Plans' }} />
      <Stack.Screen name="Notifications" component={NotificationsListScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen 
        name="QRScanner" 
        component={QRScannerScreen} 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal'
        }} 
      />
    </Stack.Navigator>
  );
}

function QueueStack() {
  const { theme } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="QueueMain" component={QueueScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function BookingsStack() {
  const { theme } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="BookingsMain" component={BookingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Booking Details' }} />
      <Stack.Screen 
        name="QRScanner" 
        component={QRScannerScreen} 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal'
        }} 
      />
    </Stack.Navigator>
  );
}

function ServicesStack() {
  const { theme } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="ServicesMain" component={ServicesScreen} options={{ headerShown: false }} />
      <Stack.Screen 
        name="AddService" 
        component={AddServiceScreen} 
        options={({ route }) => ({ 
          title: route.params?.serviceId ? 'Edit Service' : 'Add Service' 
        })} 
      />
    </Stack.Navigator>
  );
}

function StaffStack() {
  const { theme } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="StaffMain" component={StaffScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="AddStaff"
        component={AddStaffScreen}
        options={({ route }) => ({
          title: route.params?.staffId ? 'Edit Staff' : 'Add Staff'
        })}
      />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  const { theme } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="PlatformFeedback"
        component={PlatformFeedbackScreen}
        options={{ title: 'Rate GroomLink' }}
      />
      <Stack.Screen
        name="CompletionSettings"
        component={CompletionSettingsScreen}
        options={{ title: 'Completion Settings' }}
      />
      <Stack.Screen
        name="RequestPayout"
        component={RequestPayoutScreen}
        options={{ title: 'Request Payout' }}
      />
      <Stack.Screen
        name="PayoutHistory"
        component={PayoutHistoryScreen}
        options={{ title: 'Payout History' }}
      />
      <Stack.Screen
        name="EditSalon"
        component={EditSalonScreen}
        options={{ title: 'Salon Settings' }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Reviews"
        component={ReviewsScreen}
        options={{ title: 'Reviews' }}
      />
    </Stack.Navigator>
  );
}

export default function MainNavigator() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

  // Fetch pending bookings count for tab badge
  const { data: salon } = useQuery({
    queryKey: ['mySalon'],
    queryFn: salonApi.getMySalon,
  });
  const { data: bookingsData } = useQuery({
    queryKey: ['salonBookings', salon?.id, 'badge'],
    queryFn: () => salon ? bookingsApi.getSalonBookings({ salonId: salon.id, limit: 50 }) : null,
    enabled: !!salon?.id,
    refetchInterval: 30000, // refresh every 30s
  });
  const pendingCount = useMemo(() => {
    if (!bookingsData?.data) return 0;
    return bookingsData.data.filter((b: any) => b.status === 'PENDING').length;
  }, [bookingsData]);

  // Fetch unread notification count for badge
  const setServerUnreadCount = useNotificationStore((s) => s.setServerUnreadCount);
  const { data: serverUnread } = useQuery({
    queryKey: ['notificationUnreadCount'],
    queryFn: notificationApi.getUnreadCount,
    refetchInterval: 60000,
  });
  useEffect(() => {
    if (typeof serverUnread === 'number') {
      setServerUnreadCount(serverUnread);
    }
  }, [serverUnread, setServerUnreadCount]);
  const notifUnreadCount = useNotificationStore((s) => s.serverUnreadCount);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = 'home';
          
          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Queue') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Bookings') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Services') {
            iconName = focused ? 'cut' : 'cut-outline';
          } else if (route.name === 'Staff') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          // Notification badge for Dashboard tab
          const showBadge = route.name === 'Dashboard' && notifUnreadCount > 0;
          
          return (
            <View style={styles.iconContainer}>
              <Ionicons 
                name={iconName as any} 
                size={22} 
                color={focused ? theme.tabActive : theme.tabInactive} 
              />
              {focused && <View style={styles.activeIndicator} />}
              {showBadge && (
                <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                  <Text style={styles.badgeText}>
                    {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
                  </Text>
                </View>
              )}
            </View>
          );
        },
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          paddingBottom: Platform.OS === 'ios' ? 24 + insets.bottom : Math.max(insets.bottom, 8),
          height: Platform.OS === 'ios' ? 88 + insets.bottom : 64 + Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardStack}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="Queue" 
        component={QueueStack}
        options={{
          tabBarLabel: 'Queue',
        }}
      />
      <Tab.Screen 
        name="Bookings" 
        component={BookingsStack}
        options={{
          tabBarLabel: 'Bookings',
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.danger,
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '600' as const,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
          },
        }}
      />
      <Tab.Screen 
        name="Services" 
        component={ServicesStack}
        options={{
          tabBarLabel: 'Services',
        }}
      />
      <Tab.Screen 
        name="Staff" 
        component={StaffStack}
        options={{
          tabBarLabel: 'Staff',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

const createStyles = (theme: AppTheme, _insets: { bottom: number }) => StyleSheet.create({
  tabBar: {
    backgroundColor: theme.tabBar,
    borderTopWidth: 1,
    borderTopColor: theme.tabBarBorder,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.03,
    shadowRadius: 0,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  tabBarItem: {
    gap: 0,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.tabActive,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
});

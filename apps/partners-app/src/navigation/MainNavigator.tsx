import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
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
import { MainStackParamList, TabParamList } from '../types/navigation';
import { AppTheme } from '../theme/colors';
import { useAppTheme } from '../theme/ThemeContext';

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
        headerBackTitleVisible: false,
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
        headerBackTitleVisible: false,
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
        headerBackTitleVisible: false,
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
        headerBackTitleVisible: false,
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
        headerBackTitleVisible: false,
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
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="PlatformFeedback"
        component={PlatformFeedbackScreen}
        options={{ title: 'Rate GroomLink' }}
      />
    </Stack.Navigator>
  );
}

export default function MainNavigator() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

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
          
          return (
            <View style={styles.iconContainer}>
              <Ionicons 
                name={iconName as any} 
                size={22} 
                color={focused ? theme.tabActive : theme.tabInactive} 
              />
              {focused && <View style={styles.activeIndicator} />}
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
});

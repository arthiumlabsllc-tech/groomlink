import React, { Suspense, lazy } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/ThemeContext';

// Lazy-load all screens to prevent module-load crashes from native dependencies
// (react-native-maps, react-native-webview, expo-clipboard, etc.)
const HomeScreen = lazy(() => import('../screens/main/HomeScreen'));
const SearchScreen = lazy(() => import('../screens/main/SearchScreen'));
const MapScreen = lazy(() => import('../screens/main/MapScreen'));
const BookingsScreen = lazy(() => import('../screens/main/BookingsScreen'));
const ProfileScreen = lazy(() => import('../screens/main/ProfileScreen'));
const SalonDetailScreen = lazy(() => import('../screens/main/SalonDetailScreen'));
const NotificationsScreen = lazy(() => import('../screens/main/NotificationsScreen'));
const ChatScreen = lazy(() => import('../screens/support/ChatScreen'));

import {
  HomeStackParamList,
  SearchStackParamList,
  MapStackParamList,
  BookingsStackParamList,
  ProfileStackParamList,
  TabParamList,
} from '../types/navigation';

// Brand colors (constant)
const BRAND = {
  primaryGreen: '#006B3F',
  accentGold: '#FCD116',
  accentRed: '#CE1126',
};

const Tab = createBottomTabNavigator<TabParamList>();
const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();
const SearchStackNav = createNativeStackNavigator<SearchStackParamList>();
const MapStackNav = createNativeStackNavigator<MapStackParamList>();
const BookingsStackNav = createNativeStackNavigator<BookingsStackParamList>();
const ProfileStackNav = createNativeStackNavigator<ProfileStackParamList>();

function ScreenLoader() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

function HomeStack() {
  return (
    <Suspense fallback={<ScreenLoader />}>
    <HomeStackNav.Navigator>
      <HomeStackNav.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStackNav.Screen name="SalonDetail" component={SalonDetailScreen} options={{ title: 'Salon Details' }} />
      <HomeStackNav.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
    </HomeStackNav.Navigator>
    </Suspense>
  );
}

function SearchStack() {
  return (
    <Suspense fallback={<ScreenLoader />}>
    <SearchStackNav.Navigator>
      <SearchStackNav.Screen name="SearchMain" component={SearchScreen} options={{ headerShown: false }} />
      <SearchStackNav.Screen name="SalonDetail" component={SalonDetailScreen} options={{ title: 'Salon Details' }} />
    </SearchStackNav.Navigator>
    </Suspense>
  );
}

function MapStack() {
  return (
    <Suspense fallback={<ScreenLoader />}>
    <MapStackNav.Navigator>
      <MapStackNav.Screen name="MapMain" component={MapScreen} options={{ headerShown: false }} />
      <MapStackNav.Screen name="SalonDetail" component={SalonDetailScreen} options={{ title: 'Salon Details' }} />
    </MapStackNav.Navigator>
    </Suspense>
  );
}

function BookingsStack() {
  return (
    <Suspense fallback={<ScreenLoader />}>
    <BookingsStackNav.Navigator screenOptions={{ headerShown: false }}>
      <BookingsStackNav.Screen name="BookingsMain" component={BookingsScreen} />
    </BookingsStackNav.Navigator>
    </Suspense>
  );
}

function ProfileStack() {
  return (
    <Suspense fallback={<ScreenLoader />}>
    <ProfileStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStackNav.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStackNav.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
    </ProfileStackNav.Navigator>
    </Suspense>
  );
}

export default function MainNavigator() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = 'home';
          
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Bookings') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          
          return (
            <View style={styles.iconContainer}>
              <Ionicons name={iconName} size={size} color={color} />
              {focused && <View style={[styles.activeIndicator, { backgroundColor: theme.tabActive }]} />}
            </View>
          );
        },
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopWidth: 1,
          borderTopColor: theme.tabBarBorder,
          height: 60 + Math.max(insets.bottom, 12),
          paddingBottom: Math.max(insets.bottom, 12),
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: styles.tabBarLabel,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Search" component={SearchStack} />
      <Tab.Screen name="Map" component={MapStack} />
      <Tab.Screen name="Bookings" component={BookingsStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});

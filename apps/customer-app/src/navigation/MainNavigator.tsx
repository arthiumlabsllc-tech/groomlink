import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/ThemeContext';
import HomeScreen from '../screens/main/HomeScreen';
import SearchScreen from '../screens/main/SearchScreen';
import MapScreen from '../screens/main/MapScreen';
import BookingsScreen from '../screens/main/BookingsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import SalonDetailScreen from '../screens/main/SalonDetailScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
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

function HomeStack() {
  return (
    <HomeStackNav.Navigator>
      <HomeStackNav.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStackNav.Screen name="SalonDetail" component={SalonDetailScreen} options={{ title: 'Salon Details' }} />
      <HomeStackNav.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
    </HomeStackNav.Navigator>
  );
}

function SearchStack() {
  return (
    <SearchStackNav.Navigator>
      <SearchStackNav.Screen name="SearchMain" component={SearchScreen} options={{ headerShown: false }} />
      <SearchStackNav.Screen name="SalonDetail" component={SalonDetailScreen} options={{ title: 'Salon Details' }} />
    </SearchStackNav.Navigator>
  );
}

function MapStack() {
  return (
    <MapStackNav.Navigator>
      <MapStackNav.Screen name="MapMain" component={MapScreen} options={{ headerShown: false }} />
      <MapStackNav.Screen name="SalonDetail" component={SalonDetailScreen} options={{ title: 'Salon Details' }} />
    </MapStackNav.Navigator>
  );
}

function BookingsStack() {
  return (
    <BookingsStackNav.Navigator screenOptions={{ headerShown: false }}>
      <BookingsStackNav.Screen name="BookingsMain" component={BookingsScreen} />
    </BookingsStackNav.Navigator>
  );
}

function ProfileStack() {
  return (
    <ProfileStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStackNav.Screen name="ProfileMain" component={ProfileScreen} />
    </ProfileStackNav.Navigator>
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

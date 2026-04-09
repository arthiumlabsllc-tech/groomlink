import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/main/DashboardScreen';
import BookingsScreen from '../screens/main/BookingsScreen';
import ServicesScreen from '../screens/main/ServicesScreen';
import StaffScreen from '../screens/main/StaffScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import BookingDetailScreen from '../screens/main/BookingDetailScreen';
import EditSalonScreen from '../screens/main/EditSalonScreen';
import AddServiceScreen from '../screens/main/AddServiceScreen';
import AddStaffScreen from '../screens/main/AddStaffScreen';
import { MainStackParamList, TabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

function DashboardStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#111827',
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
    </Stack.Navigator>
  );
}

function BookingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#111827',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen name="BookingsMain" component={BookingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Booking Details' }} />
    </Stack.Navigator>
  );
}

function ServicesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#111827',
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
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#111827',
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

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = 'home';
          
          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
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
                color={focused ? '#006B3F' : '#9CA3AF'} 
              />
              {focused && <View style={styles.activeIndicator} />}
            </View>
          );
        },
        tabBarActiveTintColor: '#006B3F',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
        tabBarStyle: styles.tabBar,
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
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
    backgroundColor: '#006B3F',
  },
});

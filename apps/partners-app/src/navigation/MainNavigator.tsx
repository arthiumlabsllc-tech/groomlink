import React from 'react';
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
    <Stack.Navigator>
      <Stack.Screen name="DashboardMain" component={DashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Booking Details' }} />
      <Stack.Screen name="EditSalon" component={EditSalonScreen} options={{ title: 'Edit Salon' }} />
    </Stack.Navigator>
  );
}

function BookingsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="BookingsMain" component={BookingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Booking Details' }} />
    </Stack.Navigator>
  );
}

function ServicesStack() {
  return (
    <Stack.Navigator>
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
    <Stack.Navigator>
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
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#006B3F',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Bookings" component={BookingsStack} />
      <Tab.Screen name="Services" component={ServicesStack} />
      <Tab.Screen name="Staff" component={StaffStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

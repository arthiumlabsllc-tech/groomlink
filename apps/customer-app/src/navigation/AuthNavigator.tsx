import React, { Suspense, lazy } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// EAGER: First auth screen loaded immediately
import EmailScreen from '../screens/auth/EmailScreen';

// LAZY: Secondary auth screens (OTPScreen uses expo-clipboard)
const OTPScreen = lazy(() => import('../screens/auth/OTPScreen'));
const ProfileSetupScreen = lazy(() => import('../screens/auth/ProfileSetupScreen'));

import { AuthStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<AuthStackParamList>();

function ScreenLoader() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

export default function AuthNavigator() {
  return (
    <Suspense fallback={<ScreenLoader />}>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Email" component={EmailScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    </Stack.Navigator>
    </Suspense>
  );
}

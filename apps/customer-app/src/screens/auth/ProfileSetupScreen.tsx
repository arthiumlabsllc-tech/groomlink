import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { AuthStackParamList } from '../../types/navigation';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

// Design System Colors (theme-aware)
const createColors = (t: AppTheme) => ({
  primaryGreen: '#006B3F',
  accentGold: '#FCD116',
  accentRed: '#CE1126',
  dark: '#1a1a2e',
  background: t.background,
  cardBackground: t.surface,
  textPrimary: t.text,
  textSecondary: t.textSecondary,
  border: t.border,
  success: t.success,
});

type ProfileSetupRouteProp = RouteProp<AuthStackParamList, 'ProfileSetup'>;

type LocationStatus = 'pending' | 'granted' | 'denied' | 'detecting';

export default function ProfileSetupScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<ProfileSetupRouteProp>();
  const email = route.params?.email || '';
  
  const { setUser } = useAuthStore();
  const { theme } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Location state
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('pending');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      setLocationStatus('detecting');
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationStatus('denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);

      // Reverse geocode to get address details
      const addresses = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        const formattedAddress = [addr.street, addr.city].filter(Boolean).join(', ');
        setAddress(formattedAddress);
        setCity(addr.city || '');
        setRegion(addr.region || '');
      }
      
      setLocationStatus('granted');
    } catch (err) {
      console.log('Location error:', err);
      setLocationStatus('denied');
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove spaces and dashes
    const cleaned = phone.replace(/[\s-]/g, '');
    // Check for valid Ghana phone format: 0XX XXX XXXX or +233 XX XXX XXXX
    const ghanaPattern = /^(0\d{9}|\+233\d{9})$/;
    return ghanaPattern.test(cleaned);
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove spaces and dashes
    const cleaned = phone.replace(/[\s-]/g, '');
    // If starts with 0, convert to +233
    if (cleaned.startsWith('0')) {
      return '+233' + cleaned.substring(1);
    }
    // If doesn't have +, add it
    if (!cleaned.startsWith('+')) {
      return '+233' + cleaned;
    }
    return cleaned;
  };

  const handleSubmit = async () => {
    // Validation
    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }
    if (!lastName.trim()) {
      setError('Last name is required');
      return;
    }
    if (!phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }
    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid Ghana phone number (e.g., 024 123 4567)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      const response = await authApi.completeRegistration({
        email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: formattedPhone,
        latitude,
        longitude,
        address: address || undefined,
        city: city || undefined,
        region: region || undefined,
      });

      if (response.success && response.data?.user) {
        // Clear the isNewUser flag since registration is complete
        await SecureStore.deleteItemAsync('isNewUser');
        setUser(response.data.user);
        // Dismiss the entire auth modal by resetting to MainTabs
        // navigation.goBack() only pops within AuthNavigator, doesn't dismiss the modal
        navigation.getParent()?.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          })
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete registration');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  const renderLocationSection = () => {
    if (locationStatus === 'detecting') {
      return (
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <ActivityIndicator size="small" color={COLORS.primaryGreen} />
            <Text style={styles.locationTitle}>Detecting your location...</Text>
          </View>
        </View>
      );
    }

    if (locationStatus === 'granted' && city) {
      return (
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <View style={styles.locationIconSuccess}>
              <Ionicons name="location" size={20} color="#fff" />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationTitle}>Location Detected</Text>
              <Text style={styles.locationDetail}>{city}{region ? `, ${region}` : ''}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
          </View>
        </View>
      );
    }

    // Denied or pending - show enable button
    return (
      <View style={styles.locationCard}>
        <View style={styles.locationHeader}>
          <View style={styles.locationIcon}>
            <Ionicons name="location-outline" size={20} color={COLORS.textSecondary} />
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>Enable Location</Text>
            <Text style={styles.locationDetail}>Find nearby salons and barbershops</Text>
          </View>
        </View>
        <Button
          mode="outlined"
          onPress={requestLocationPermission}
          textColor={COLORS.primaryGreen}
          style={styles.locationButton}
          contentStyle={styles.locationButtonContent}
        >
          {locationStatus === 'denied' ? 'Try Again' : 'Enable Location'}
        </Button>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/logo-full-black.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={styles.progressFill} />
            </View>
            <Text variant="bodySmall" style={styles.progressText}>Step 3 of 3</Text>
          </View>

          <Text variant="headlineMedium" style={styles.title}>
            Complete Your Profile
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Tell us a bit about yourself
          </Text>

          {/* Avatar Placeholder */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
            <TouchableOpacity style={styles.cameraButton}>
              <Ionicons name="camera" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              label="First Name *"
              value={firstName}
              onChangeText={setFirstName}
              style={styles.input}
              mode="outlined"
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primaryGreen}
              textColor={COLORS.textPrimary}
              placeholderTextColor={COLORS.textSecondary}
              autoFocus
            />
            <TextInput
              label="Last Name *"
              value={lastName}
              onChangeText={setLastName}
              style={styles.input}
              mode="outlined"
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primaryGreen}
              textColor={COLORS.textPrimary}
              placeholderTextColor={COLORS.textSecondary}
            />
            <View style={styles.phoneContainer}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>+233</Text>
              </View>
              <TextInput
                label="Phone Number *"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                style={styles.phoneInput}
                mode="outlined"
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primaryGreen}
                textColor={COLORS.textPrimary}
                placeholderTextColor={COLORS.textSecondary}
                placeholder="24 123 4567"
                maxLength={12}
              />
            </View>
            <Text style={styles.phoneHint}>Enter your Ghana phone number</Text>
          </View>

          {/* Location Section */}
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={18} color={COLORS.primaryGreen} />
            <Text style={styles.sectionTitle}>Location (Optional)</Text>
          </View>
          {renderLocationSection()}

          {error ? (
            <HelperText type="error" visible={true} style={styles.errorText}>
              {error}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !firstName || !lastName || !phoneNumber}
            style={styles.button}
            contentStyle={styles.buttonContent}
            buttonColor={COLORS.primaryGreen}
          >
            {loading ? 'Creating Account...' : 'Get Started'}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (COLORS: ReturnType<typeof createColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 180,
    height: 48,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    width: '100%',
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 2,
  },
  progressText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: COLORS.textSecondary,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accentGold,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  inputContainer: {
    marginBottom: 24,
    gap: 16,
  },
  input: {
    backgroundColor: COLORS.cardBackground,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phonePrefix: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 16,
    height: 56,
    justifyContent: 'center',
  },
  phonePrefixText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  phoneInput: {
    backgroundColor: COLORS.cardBackground,
    flex: 1,
  },
  phoneHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: -8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  locationCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationIconSuccess: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  locationDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  locationButton: {
    marginTop: 12,
    borderRadius: 8,
    borderColor: COLORS.primaryGreen,
  },
  locationButtonContent: {
    paddingVertical: 4,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    borderRadius: 12,
    minHeight: 56,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});

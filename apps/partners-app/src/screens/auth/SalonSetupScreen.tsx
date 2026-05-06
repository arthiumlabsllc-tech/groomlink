import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, HelperText, Divider, Surface, Chip } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { salonApi, CreateSalonData } from '../../api/salon';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

type AuthStackParamList = {
  Email: undefined;
  OTP: { email: string };
  ProfileSetup: { email: string };
  ProviderCategory: undefined;
  SalonSetup: { providerCategory: string };
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'SalonSetup'>;
type SalonSetupRouteProp = RouteProp<AuthStackParamList, 'SalonSetup'>;

const SALON_TYPES = [
  { label: 'Barbershop', value: 'BARBERSHOP', icon: 'cut' },
  { label: 'Hair Salon', value: 'HAIR_SALON', icon: 'woman' },
  { label: 'Beauty Salon', value: 'BEAUTY_SALON', icon: 'sparkles' },
  { label: 'Nail Salon', value: 'NAIL_SALON', icon: 'hand-left' },
  { label: 'Pedicure Salon', value: 'PEDICURE_SALON', icon: 'footsteps' },
  { label: 'Spa', value: 'SPA', icon: 'water' },
];

const GHANA_REGIONS = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Central',
  'Eastern',
  'Northern',
  'Upper East',
  'Upper West',
  'Volta',
  'Oti',
  'Bono',
  'Bono East',
  'Ahafo',
  'Savannah',
  'North East',
  'Western North',
];

const GHANA_CITIES = [
  'Accra',
  'Kumasi',
  'Takoradi',
  'Cape Coast',
  'Tamale',
  'Ho',
  'Sunyani',
  'Bolgatanga',
  'Wa',
  'Koforidua',
  'Tema',
  'Sekondi',
];

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00',
  '17:00', '18:00', '19:00', '20:00', '21:00', '22:00',
];

const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

// Display labels for days
const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};

export default function SalonSetupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SalonSetupRouteProp>();
  const { user, setUser } = useAuthStore();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Get provider category from route params (selected in ProviderCategoryScreen)
  const providerCategory = route.params?.providerCategory || 'BUSINESS';
  const isFreelancer = providerCategory === 'FREELANCER';

  const [businessName, setBusinessName] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [email, setEmail] = useState(user?.email || '');

  // Section 2: Location
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('Greater Accra');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationDetected, setLocationDetected] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Service Areas (freelancers only)
  const [serviceAreasText, setServiceAreasText] = useState('');

  // Section 3: Business Hours
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('18:00');
  const [workingDays, setWorkingDays] = useState<string[]>(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-detect location on mount
  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = async () => {
    setDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLatitude(loc.coords.latitude);
        setLongitude(loc.coords.longitude);
        setLocationDetected(true);
      }
    } catch (err) {
      console.log('Location detection failed:', err);
    } finally {
      setDetectingLocation(false);
    }
  };

  const formatPhoneNumber = (input: string): string => {
    const digits = input.replace(/\D/g, '');
    if (digits.startsWith('0')) {
      return '+233' + digits.slice(1);
    }
    if (digits.startsWith('233')) {
      return '+' + digits;
    }
    if (input.startsWith('+')) {
      return '+' + digits;
    }
    if (digits.length <= 9) {
      return '+233' + digits;
    }
    return '+' + digits;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setPhoneNumber(formatted);
  };

  const toggleWorkingDay = (day: string) => {
    setWorkingDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const validateForm = (): boolean => {
    if (!businessName.trim()) {
      setError(isFreelancer ? 'Professional name is required' : 'Business name is required');
      return false;
    }
    if (!selectedType) {
      setError(isFreelancer ? 'Please select a service type' : 'Please select a salon type');
      return false;
    }
    if (!phoneNumber.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (!phoneNumber.match(/^\+233[0-9]{9}$/)) {
      setError('Phone number must be in Ghana format (+233XXXXXXXXX)');
      return false;
    }

    // Business-specific validation
    if (!isFreelancer) {
      if (!address.trim()) {
        setError('Address is required');
        return false;
      }
      if (latitude === null || longitude === null) {
        setError('Location coordinates are required. Please enable location services.');
        return false;
      }
      if (!openingTime) {
        setError('Opening time is required');
        return false;
      }
      if (!closingTime) {
        setError('Closing time is required');
        return false;
      }
    }

    if (!city.trim()) {
      setError('City is required');
      return false;
    }
    if (!region.trim()) {
      setError('Region is required');
      return false;
    }

    // Freelancer-specific validation
    if (isFreelancer) {
      if (!serviceAreasText.trim()) {
        setError('Please enter at least one service area (neighborhoods you cover)');
        return false;
      }
      if (workingDays.length === 0) {
        setError('Please select at least one available day');
        return false;
      }
    } else {
      if (workingDays.length === 0) {
        setError('Please select at least one working day');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      // Parse service areas from comma-separated text
      const serviceAreas = isFreelancer
        ? serviceAreasText.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : undefined;

      const salonData: CreateSalonData = {
        businessName: businessName.trim(),
        type: selectedType,
        providerCategory,
        phoneNumber: phoneNumber.trim(),
        email: email.trim() || undefined,
        city: city.trim(),
        region: region.trim(),
        description: description.trim() || undefined,
        serviceAreas,
      };

      // Business-specific fields
      if (!isFreelancer) {
        salonData.address = address.trim();
        salonData.latitude = latitude!;
        salonData.longitude = longitude!;
        salonData.openingTime = openingTime;
        salonData.closingTime = closingTime;
        salonData.workingDays = workingDays;
      } else {
        // Freelancers: pass workingDays, defaults handled by backend
        salonData.workingDays = workingDays;
      }

      // Create the salon
      await salonApi.create(salonData);

      // Refresh auth state - fetch updated profile with salon association
      const profile = await authApi.getProfile();

      // Update auth store - this will trigger navigation to MainNavigator
      setUser(profile);
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      const fieldErrors = apiError?.details?.map?.((d: any) => d.message)?.join(', ') || apiError?.message;
      setError(fieldErrors || apiError?.message || err.response?.data?.message || 'Failed to create salon. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Progress Steps */}
          <View style={styles.progressContainer}>
            <View style={styles.progressStep}>
              <View style={[styles.stepCircle, styles.stepComplete]}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.stepLabel}>Verify</Text>
            </View>
            <View style={styles.progressLine}>
              <View style={styles.progressLineFilled} />
            </View>
            <View style={styles.progressStep}>
              <View style={[styles.stepCircle, styles.stepComplete]}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.stepLabel}>Profile</Text>
            </View>
            <View style={styles.progressLine}>
              <View style={styles.progressLineFilled} />
            </View>
            <View style={styles.progressStep}>
              <View style={[styles.stepCircle, styles.stepComplete]}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.stepLabel}>Type</Text>
            </View>
            <View style={styles.progressLine}>
              <View style={styles.progressLineFilled} />
            </View>
            <View style={styles.progressStep}>
              <View style={[styles.stepCircle, styles.stepActive]}>
                <Text style={styles.stepNumber}>4</Text>
              </View>
              <Text style={[styles.stepLabel, styles.stepLabelActive]}>Setup</Text>
            </View>
          </View>

          {/* Header */}
          <View style={styles.headerSection}>
            <View style={styles.headerIcon}>
              <Ionicons name="business" size={28} color="#006B3F" />
            </View>
            <Text variant="headlineSmall" style={styles.title}>
              {isFreelancer ? 'Set Up Your Profile' : 'Set Up Your Salon'}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {isFreelancer ? 'Tell us about yourself to get started' : 'Tell us about your business to get started'}
            </Text>
          </View>

          {/* Section 1: Basic Info */}
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={20} color="#006B3F" />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Basic Information
              </Text>
            </View>
            <Divider style={styles.sectionDivider} />

            {/* Provider category badge */}
            <View style={styles.categoryBadge}>
              <Ionicons name={isFreelancer ? 'person' : 'business'} size={16} color="#006B3F" />
              <Text style={styles.categoryBadgeText}>
                {isFreelancer ? 'Freelancer' : 'Business Owner'}
              </Text>
            </View>

            <TextInput
              label={isFreelancer ? 'Professional Name *' : 'Business Name *'}
              value={businessName}
              onChangeText={setBusinessName}
              style={styles.input}
              mode="outlined"
              outlineColor={theme.border}
              activeOutlineColor="#006B3F"
              textColor={theme.text}
              placeholderTextColor={theme.textSecondary}
              placeholder={isFreelancer ? 'e.g., Kwame the Barber' : 'e.g., Glamour Beauty Salon'}
              left={<TextInput.Icon icon={isFreelancer ? 'account' : 'storefront'} color={theme.textSecondary} />}
              theme={{ roundness: 10 }}
              autoFocus
            />

            <Text variant="bodyMedium" style={styles.label}>
              {isFreelancer ? 'Service Type *' : 'Salon Type *'}
            </Text>
            <View style={styles.typeGrid}>
              {SALON_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeChip,
                    selectedType === type.value && styles.typeChipSelected,
                  ]}
                  onPress={() => setSelectedType(type.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={18}
                    color={selectedType === type.value ? '#FFFFFF' : theme.textSecondary}
                  />
                  <Text style={[
                    styles.typeChipText,
                    selectedType === type.value && styles.typeChipTextSelected,
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textArea]}
              mode="outlined"
              outlineColor={theme.border}
              activeOutlineColor="#006B3F"
              textColor={theme.text}
              placeholderTextColor={theme.textSecondary}
              placeholder={isFreelancer ? 'Tell customers about your skills, experience, and services...' : 'Tell customers about your salon and services...'}
              theme={{ roundness: 10 }}
            />

            <TextInput
              label="Phone Number *"
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              style={styles.input}
              mode="outlined"
              outlineColor={theme.border}
              activeOutlineColor="#006B3F"
              textColor={theme.text}
              placeholderTextColor={theme.textSecondary}
              placeholder="+233 XX XXX XXXX"
              left={<TextInput.Icon icon="phone" color={theme.textSecondary} />}
              theme={{ roundness: 10 }}
            />

            <TextInput
              label="Email (Optional)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              mode="outlined"
              outlineColor={theme.border}
              activeOutlineColor="#006B3F"
              textColor={theme.text}
              placeholderTextColor={theme.textSecondary}
              placeholder="salon@example.com"
              left={<TextInput.Icon icon="email" color={theme.textSecondary} />}
              theme={{ roundness: 10 }}
            />
          </Surface>

          {/* Section 2: Location */}
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={20} color="#006B3F" />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {isFreelancer ? 'Service Area' : 'Location'}
              </Text>
            </View>
            <Divider style={styles.sectionDivider} />

            {/* Service Areas - Freelancers only */}
            {isFreelancer && (
              <>
                <TextInput
                  label="Areas You Serve *"
                  value={serviceAreasText}
                  onChangeText={setServiceAreasText}
                  style={styles.input}
                  mode="outlined"
                  outlineColor={theme.border}
                  activeOutlineColor="#006B3F"
                  textColor={theme.text}
                  placeholderTextColor={theme.textSecondary}
                  placeholder="e.g., East Legon, Cantonments, Airport Residential"
                  left={<TextInput.Icon icon="map-marker-radius" color={theme.textSecondary} />}
                  theme={{ roundness: 10 }}
                  multiline
                  numberOfLines={2}
                />
                <Text variant="bodySmall" style={styles.fieldHint}>
                  Enter neighborhoods separated by commas where you can provide home service
                </Text>
              </>
            )}

            {/* Address - Business owners only */}
            {!isFreelancer && (
              <TextInput
                label="Address *"
                value={address}
                onChangeText={setAddress}
                style={styles.input}
                mode="outlined"
                outlineColor={theme.border}
                activeOutlineColor="#006B3F"
                textColor={theme.text}
                placeholderTextColor={theme.textSecondary}
                placeholder="e.g., 123 Oxford Street, Osu"
                left={<TextInput.Icon icon="map-marker" color={theme.textSecondary} />}
                theme={{ roundness: 10 }}
              />
            )}

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  label="City *"
                  value={city}
                  onChangeText={setCity}
                  style={styles.input}
                  mode="outlined"
                  outlineColor={theme.border}
                  activeOutlineColor="#006B3F"
                  textColor={theme.text}
                  placeholderTextColor={theme.textSecondary}
                  placeholder="e.g., Accra"
                  theme={{ roundness: 10 }}
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  label="Region *"
                  value={region}
                  onChangeText={setRegion}
                  style={styles.input}
                  mode="outlined"
                  outlineColor={theme.border}
                  activeOutlineColor="#006B3F"
                  textColor={theme.text}
                  placeholderTextColor={theme.textSecondary}
                  placeholder="e.g., Greater Accra"
                  theme={{ roundness: 10 }}
                />
              </View>
            </View>

            {/* GPS Location - Business owners only */}
            {!isFreelancer && (
              <View style={styles.locationStatusContainer}>
                {locationDetected ? (
                  <View style={styles.locationDetected}>
                    <Ionicons name="checkmark-circle" size={20} color="#006B3F" />
                    <Text style={styles.locationDetectedText}>
                      Location detected successfully
                    </Text>
                  </View>
                ) : (
                  <Button
                    mode="outlined"
                    onPress={detectLocation}
                    loading={detectingLocation}
                    disabled={detectingLocation}
                    style={styles.detectLocationButton}
                    textColor="#006B3F"
                    icon="map-marker"
                  >
                    {detectingLocation ? 'Detecting...' : 'Detect GPS Location'}
                  </Button>
                )}
              </View>
            )}
          </Surface>

          {/* Section 3: Business Hours / Availability */}
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time" size={20} color="#006B3F" />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {isFreelancer ? 'Availability' : 'Business Hours'}
              </Text>
            </View>
            <Divider style={styles.sectionDivider} />

            {/* Opening/Closing Time - Business owners only */}
            {!isFreelancer && (
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text variant="bodyMedium" style={styles.label}>
                    Opening Time *
                  </Text>
                  <View style={styles.timeChips}>
                    {['06:00', '07:00', '08:00', '09:00'].map((time) => (
                      <Chip
                        key={time}
                        selected={openingTime === time}
                        onPress={() => setOpeningTime(time)}
                        style={[
                          styles.timeChip,
                          openingTime === time && styles.timeChipSelected,
                        ]}
                        textStyle={openingTime === time ? styles.timeChipTextSelected : undefined}
                      >
                        {time}
                      </Chip>
                    ))}
                  </View>
                </View>
                <View style={styles.halfInput}>
                  <Text variant="bodyMedium" style={styles.label}>
                    Closing Time *
                  </Text>
                  <View style={styles.timeChips}>
                    {['17:00', '18:00', '19:00', '20:00'].map((time) => (
                      <Chip
                        key={time}
                        selected={closingTime === time}
                        onPress={() => setClosingTime(time)}
                        style={[
                          styles.timeChip,
                          closingTime === time && styles.timeChipSelected,
                        ]}
                        textStyle={closingTime === time ? styles.timeChipTextSelected : undefined}
                      >
                        {time}
                      </Chip>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Freelancer info note */}
            {isFreelancer && (
              <View style={styles.infoNote}>
                <Ionicons name="information-circle" size={18} color="#006B3F" />
                <Text variant="bodySmall" style={styles.infoNoteText}>
                  You work by appointment only. Customers will book you for specific times on your available days.
                </Text>
              </View>
            )}

            <Text variant="bodyMedium" style={[styles.label, !isFreelancer && { marginTop: 16 }]}>
              {isFreelancer ? 'Available Days *' : 'Working Days *'}
            </Text>
            <View style={styles.daysContainer}>
              {DAYS_OF_WEEK.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayChip,
                    workingDays.includes(day) && styles.dayChipSelected,
                  ]}
                  onPress={() => toggleWorkingDay(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayChipText,
                    workingDays.includes(day) && styles.dayChipTextSelected,
                  ]}>
                    {DAY_LABELS[day]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Surface>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#CE1126" />
              <HelperText type="error" visible={true} style={styles.error}>
                {error}
              </HelperText>
            </View>
          ) : null}

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            buttonColor="#006B3F"
            theme={{ roundness: 12 }}
          >
            {loading ? (isFreelancer ? 'Creating Profile...' : 'Creating Salon...') : (isFreelancer ? 'Create Profile' : 'Create Salon')}
          </Button>

          <Text variant="bodySmall" style={styles.hint}>
            You can add services, staff, and more details after registration
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  progressStep: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepComplete: {
    backgroundColor: '#006B3F',
  },
  stepActive: {
    backgroundColor: '#006B3F',
    borderWidth: 3,
    borderColor: '#FCD116',
  },
  stepNumber: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  stepLabel: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  stepLabelActive: {
    color: '#006B3F',
    fontWeight: '600',
  },
  progressLine: {
    width: 30,
    height: 3,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 6,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressLineFilled: {
    flex: 1,
    backgroundColor: '#006B3F',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: 'bold',
    color: theme.text,
  },
  subtitle: {
    textAlign: 'center',
    color: theme.textSecondary,
  },
  section: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontWeight: '600',
    color: theme.text,
  },
  sectionDivider: {
    marginBottom: 16,
    marginTop: 8,
  },
  label: {
    color: theme.text,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: theme.surface,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 100,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: theme.surfaceVariant,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  typeChipSelected: {
    backgroundColor: '#006B3F',
    borderColor: '#006B3F',
  },
  typeChipText: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '500',
  },
  typeChipTextSelected: {
    color: '#FFFFFF',
  },
  locationStatusContainer: {
    marginTop: 8,
  },
  locationDetected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
  },
  locationDetectedText: {
    color: '#006B3F',
    fontWeight: '500',
  },
  detectLocationButton: {
    borderColor: '#006B3F',
    borderRadius: 8,
  },
  timeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    backgroundColor: theme.surfaceVariant,
    marginVertical: 2,
  },
  timeChipSelected: {
    backgroundColor: '#006B3F',
  },
  timeChipTextSelected: {
    color: '#FFFFFF',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: theme.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.border,
    minWidth: 60,
    alignItems: 'center',
  },
  dayChipSelected: {
    backgroundColor: '#006B3F',
    borderColor: '#006B3F',
  },
  dayChipText: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '500',
  },
  dayChipTextSelected: {
    color: '#FFFFFF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  error: {
    marginLeft: 4,
  },
  button: {
    borderRadius: 12,
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  hint: {
    textAlign: 'center',
    color: theme.textSecondary,
    marginTop: 16,
    lineHeight: 20,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  categoryBadgeText: {
    fontSize: 14,
    color: '#006B3F',
    fontWeight: '600',
  },
  fieldHint: {
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  infoNoteText: {
    flex: 1,
    color: theme.textSecondary,
    lineHeight: 18,
  },
});

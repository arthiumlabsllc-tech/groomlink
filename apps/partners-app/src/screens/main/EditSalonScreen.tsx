import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  TextInput,
  Button,
  Menu,
  Divider,
  ActivityIndicator,
  HelperText,
  Surface,
  Switch,
  Card,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { salonApi, CreateSalonData } from '../../api/salon';
import { OpeningHours } from '../../types';

const BUSINESS_CATEGORIES = [
  { label: 'Barbershop', value: 'BARBERSHOP', icon: 'cut' },
  { label: 'Hair Salon', value: 'HAIR_SALON', icon: 'scissors' },
  { label: 'Nail Salon', value: 'NAIL_SALON', icon: 'hand-left' },
  { label: 'Pedicure Salon', value: 'PEDICURE_SALON', icon: 'footsteps' },
  { label: 'Spa', value: 'SPA', icon: 'leaf' },
  { label: 'Beauty Salon', value: 'BEAUTY_SALON', icon: 'sparkles' },
];

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Mon', fullLabel: 'Monday' },
  { key: 'tuesday', label: 'Tue', fullLabel: 'Tuesday' },
  { key: 'wednesday', label: 'Wed', fullLabel: 'Wednesday' },
  { key: 'thursday', label: 'Thu', fullLabel: 'Thursday' },
  { key: 'friday', label: 'Fri', fullLabel: 'Friday' },
  { key: 'saturday', label: 'Sat', fullLabel: 'Saturday' },
  { key: 'sunday', label: 'Sun', fullLabel: 'Sunday' },
] as const;

const TIME_OPTIONS = (() => {
  const times: { label: string; value: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      const displayHour = hour % 12 || 12;
      const ampm = hour < 12 ? 'AM' : 'PM';
      times.push({
        label: `${displayHour}:${m} ${ampm}`,
        value: `${h}:${m}`,
      });
    }
  }
  return times;
})();

interface FormErrors {
  businessName?: string;
  address?: string;
  city?: string;
  phone?: string;
}

type DayHours = {
  open: string;
  close: string;
  isOpen: boolean;
};

type HoursState = {
  [K in typeof DAYS_OF_WEEK[number]['key']]: DayHours;
};

const defaultHours: HoursState = {
  monday: { open: '09:00', close: '18:00', isOpen: true },
  tuesday: { open: '09:00', close: '18:00', isOpen: true },
  wednesday: { open: '09:00', close: '18:00', isOpen: true },
  thursday: { open: '09:00', close: '18:00', isOpen: true },
  friday: { open: '09:00', close: '18:00', isOpen: true },
  saturday: { open: '09:00', close: '16:00', isOpen: true },
  sunday: { open: '10:00', close: '14:00', isOpen: false },
};

export default function EditSalonScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  // Fetch salon data
  const { data: salon, isLoading: salonLoading } = useQuery({
    queryKey: ['mySalon'],
    queryFn: salonApi.getMySalon,
  });

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('BARBERSHOP');
  const [openingHours, setOpeningHours] = useState<HoursState>(defaultHours);

  // Menu visibility
  const [openTimeMenus, setOpenTimeMenus] = useState<{ [key: string]: boolean }>({});
  const [closeTimeMenus, setCloseTimeMenus] = useState<{ [key: string]: boolean }>({});

  // Form validation
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({
    businessName: false,
    address: false,
    city: false,
    phone: false,
  });

  // Initialize form with salon data
  useEffect(() => {
    if (salon) {
      setBusinessName(salon.businessName || '');
      setAddress(salon.address || '');
      setCity(salon.city || '');
      setPhone(salon.phone || '');
      setEmail(salon.email || '');
      setDescription(salon.description || '');
      setCategory('BARBERSHOP');

      if (salon.openingHours) {
        const hours = salon.openingHours as OpeningHours;
        setOpeningHours({
          monday: hours.monday || defaultHours.monday,
          tuesday: hours.tuesday || defaultHours.tuesday,
          wednesday: hours.wednesday || defaultHours.wednesday,
          thursday: hours.thursday || defaultHours.thursday,
          friday: hours.friday || defaultHours.friday,
          saturday: hours.saturday || defaultHours.saturday,
          sunday: hours.sunday || defaultHours.sunday,
        });
      }
    }
  }, [salon]);

  // Update salon mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateSalonData & { openingHours?: HoursState }>) =>
      salonApi.update(salon!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mySalon'] });
      Alert.alert('Success', 'Salon details updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error: Error) => {
      Alert.alert('Error', `Failed to update salon: ${error.message}`);
    },
  });

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!businessName.trim()) {
      newErrors.businessName = 'Salon name is required';
    }

    if (!address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (!validateForm() || !salon) return;

    const data: Partial<CreateSalonData & { openingHours?: HoursState }> = {
      businessName: businessName.trim(),
      address: address.trim(),
      city: city.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      description: description.trim() || undefined,
      category,
      openingHours,
    };

    updateMutation.mutate(data);
  };

  // Toggle day open/closed
  const toggleDayOpen = (day: keyof HoursState) => {
    setOpeningHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen: !prev[day].isOpen,
      },
    }));
  };

  // Update time for a day
  const updateTime = (day: keyof HoursState, type: 'open' | 'close', value: string) => {
    setOpeningHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [type]: value,
      },
    }));
  };

  // Format time for display
  const formatTimeDisplay = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const displayHour = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (salonLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006B3F" />
      </View>
    );
  }

  if (!salon) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
        <Text style={styles.errorText}>No salon found</Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          buttonColor="#006B3F"
          theme={{ roundness: 12 }}
        >
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Salon Photo Section */}
          <View style={styles.photoSection}>
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>
                {businessName ? businessName[0].toUpperCase() : 'S'}
              </Text>
            </View>
            <TouchableOpacity style={styles.photoButton}>
              <Ionicons name="camera-outline" size={18} color="#006B3F" />
              <Text style={styles.photoButtonText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Basic Information */}
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={20} color="#006B3F" />
              <Text style={styles.sectionTitle}>Basic Information</Text>
            </View>
            <Divider style={styles.sectionDivider} />

            <TextInput
              label="Salon Name *"
              value={businessName}
              onChangeText={(text) => {
                setBusinessName(text);
                setTouched({ ...touched, businessName: true });
              }}
              onBlur={() => setTouched({ ...touched, businessName: true })}
              error={touched.businessName && !!errors.businessName}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              style={styles.input}
              placeholder="Enter salon name"
              left={<TextInput.Icon icon="storefront" color="#6B7280" />}
              theme={{ roundness: 10 }}
            />
            {touched.businessName && errors.businessName && (
              <HelperText type="error">{errors.businessName}</HelperText>
            )}

            <TextInput
              label="Address *"
              value={address}
              onChangeText={(text) => {
                setAddress(text);
                setTouched({ ...touched, address: true });
              }}
              onBlur={() => setTouched({ ...touched, address: true })}
              error={touched.address && !!errors.address}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              style={styles.input}
              placeholder="Street address"
              left={<TextInput.Icon icon="map-marker-outline" color="#6B7280" />}
              theme={{ roundness: 10 }}
            />
            {touched.address && errors.address && (
              <HelperText type="error">{errors.address}</HelperText>
            )}

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  label="City *"
                  value={city}
                  onChangeText={(text) => {
                    setCity(text);
                    setTouched({ ...touched, city: true });
                  }}
                  onBlur={() => setTouched({ ...touched, city: true })}
                  error={touched.city && !!errors.city}
                  mode="outlined"
                  outlineColor="#E5E7EB"
                  activeOutlineColor="#006B3F"
                  style={styles.input}
                  placeholder="City"
                  theme={{ roundness: 10 }}
                />
                {touched.city && errors.city && (
                  <HelperText type="error">{errors.city}</HelperText>
                )}
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  label="Phone *"
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    setTouched({ ...touched, phone: true });
                  }}
                  onBlur={() => setTouched({ ...touched, phone: true })}
                  error={touched.phone && !!errors.phone}
                  mode="outlined"
                  outlineColor="#E5E7EB"
                  activeOutlineColor="#006B3F"
                  style={styles.input}
                  keyboardType="phone-pad"
                  placeholder="+233 XX XXX XXXX"
                  left={<TextInput.Icon icon="phone-outline" color="#6B7280" />}
                  theme={{ roundness: 10 }}
                />
                {touched.phone && errors.phone && (
                  <HelperText type="error">{errors.phone}</HelperText>
                )}
              </View>
            </View>

            <TextInput
              label="Email (Optional)"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="salon@example.com"
              left={<TextInput.Icon icon="email-outline" color="#6B7280" />}
              theme={{ roundness: 10 }}
            />

            <TextInput
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={4}
              placeholder="Describe your salon..."
              theme={{ roundness: 10 }}
            />
          </Surface>

          {/* Category Section */}
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pricetag" size={20} color="#006B3F" />
              <Text style={styles.sectionTitle}>Business Category</Text>
            </View>
            <Divider style={styles.sectionDivider} />
            <View style={styles.categoryGrid}>
              {BUSINESS_CATEGORIES.map((cat) => {
                const isSelected = category === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipSelected,
                    ]}
                    onPress={() => setCategory(cat.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={18}
                      color={isSelected ? '#FFFFFF' : '#6B7280'}
                    />
                    <Text style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextSelected,
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Surface>

          {/* Business Hours */}
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time" size={20} color="#006B3F" />
              <Text style={styles.sectionTitle}>Business Hours</Text>
            </View>
            <Divider style={styles.sectionDivider} />
            
            {DAYS_OF_WEEK.map(({ key, label, fullLabel }) => (
              <View key={key} style={styles.dayRow}>
                <View style={styles.dayHeader}>
                  <Switch
                    value={openingHours[key].isOpen}
                    onValueChange={() => toggleDayOpen(key)}
                    color="#006B3F"
                  />
                  <Text style={[
                    styles.dayLabel,
                    !openingHours[key].isOpen && styles.dayLabelClosed
                  ]}>
                    {fullLabel}
                  </Text>
                </View>
                
                {openingHours[key].isOpen ? (
                  <View style={styles.timeRow}>
                    <Menu
                      visible={openTimeMenus[key] || false}
                      onDismiss={() => setOpenTimeMenus({ ...openTimeMenus, [key]: false })}
                      anchor={
                        <TouchableOpacity
                          style={styles.timeButton}
                          onPress={() => setOpenTimeMenus({ ...openTimeMenus, [key]: true })}
                        >
                          <Text style={styles.timeButtonLabel}>Open</Text>
                          <Text style={styles.timeButtonValue}>
                            {formatTimeDisplay(openingHours[key].open)}
                          </Text>
                        </TouchableOpacity>
                      }
                      contentStyle={styles.timeMenuContent}
                    >
                      <ScrollView style={styles.timeMenuScroll}>
                        {TIME_OPTIONS.map((time) => (
                          <Menu.Item
                            key={time.value}
                            onPress={() => {
                              updateTime(key, 'open', time.value);
                              setOpenTimeMenus({ ...openTimeMenus, [key]: false });
                            }}
                            title={time.label}
                          />
                        ))}
                      </ScrollView>
                    </Menu>

                    <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />

                    <Menu
                      visible={closeTimeMenus[key] || false}
                      onDismiss={() => setCloseTimeMenus({ ...closeTimeMenus, [key]: false })}
                      anchor={
                        <TouchableOpacity
                          style={styles.timeButton}
                          onPress={() => setCloseTimeMenus({ ...closeTimeMenus, [key]: true })}
                        >
                          <Text style={styles.timeButtonLabel}>Close</Text>
                          <Text style={styles.timeButtonValue}>
                            {formatTimeDisplay(openingHours[key].close)}
                          </Text>
                        </TouchableOpacity>
                      }
                      contentStyle={styles.timeMenuContent}
                    >
                      <ScrollView style={styles.timeMenuScroll}>
                        {TIME_OPTIONS.map((time) => (
                          <Menu.Item
                            key={time.value}
                            onPress={() => {
                              updateTime(key, 'close', time.value);
                              setCloseTimeMenus({ ...closeTimeMenus, [key]: false });
                            }}
                            title={time.label}
                          />
                        ))}
                      </ScrollView>
                    </Menu>
                  </View>
                ) : (
                  <Text style={styles.closedText}>Closed</Text>
                )}
              </View>
            ))}
          </Surface>

          {/* Save Button */}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={updateMutation.isPending}
              disabled={updateMutation.isPending}
              style={styles.saveButton}
              buttonColor="#006B3F"
              theme={{ roundness: 12 }}
              contentStyle={styles.buttonContent}
            >
              Save Changes
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  errorText: {
    color: '#6B7280',
    fontSize: 16,
    marginBottom: 16,
    marginTop: 12,
  },
  backButton: {
    borderRadius: 12,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#006B3F',
    marginBottom: 12,
  },
  photoPlaceholderText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
  },
  photoButtonText: {
    color: '#006B3F',
    fontWeight: '500',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
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
    color: '#111827',
    fontSize: 16,
  },
  sectionDivider: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#006B3F',
    borderColor: '#006B3F',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  dayRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 12,
  },
  dayLabelClosed: {
    color: '#9CA3AF',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingLeft: 52,
    gap: 8,
  },
  timeButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    minWidth: 85,
  },
  timeButtonLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  timeButtonValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  closedText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    paddingLeft: 52,
  },
  timeMenuContent: {
    maxHeight: 300,
  },
  timeMenuScroll: {
    maxHeight: 280,
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  saveButton: {},
  buttonContent: {
    paddingVertical: 8,
  },
});

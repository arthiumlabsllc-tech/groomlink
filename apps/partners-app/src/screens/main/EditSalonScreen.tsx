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
import { salonApi, CreateSalonData } from '../../api/salon';
import { OpeningHours } from '../../types';

const BUSINESS_CATEGORIES = [
  { label: 'Barbershop', value: 'BARBERSHOP' },
  { label: 'Hair Salon', value: 'HAIR_SALON' },
  { label: 'Nail Salon', value: 'NAIL_SALON' },
  { label: 'Pedicure Salon', value: 'PEDICURE_SALON' },
  { label: 'Spa', value: 'SPA' },
  { label: 'Beauty Salon', value: 'BEAUTY_SALON' },
];

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
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
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
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
      // Category might not be set on existing salons
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
        <Text style={styles.errorText}>No salon found</Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          buttonColor="#006B3F"
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
            <Surface style={styles.photoPlaceholder} elevation={2}>
              <Text style={styles.photoPlaceholderText}>
                {businessName ? businessName[0].toUpperCase() : 'S'}
              </Text>
            </Surface>
            <Text style={styles.photoHint}>
              Salon photo can be updated in the full settings
            </Text>
          </View>

          {/* Basic Information */}
          <Card style={styles.card}>
            <Card.Title title="Basic Information" titleStyle={styles.cardTitle} />
            <Card.Content>
              {/* Salon Name */}
              <View style={styles.inputGroup}>
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
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#006B3F"
                  style={styles.input}
                  placeholder="Enter salon name"
                />
                {touched.businessName && errors.businessName && (
                  <HelperText type="error">{errors.businessName}</HelperText>
                )}
              </View>

              {/* Address */}
              <View style={styles.inputGroup}>
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
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#006B3F"
                  style={styles.input}
                  placeholder="Street address"
                />
                {touched.address && errors.address && (
                  <HelperText type="error">{errors.address}</HelperText>
                )}
              </View>

              {/* City */}
              <View style={styles.inputGroup}>
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
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#006B3F"
                  style={styles.input}
                  placeholder="City"
                />
                {touched.city && errors.city && (
                  <HelperText type="error">{errors.city}</HelperText>
                )}
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <TextInput
                  label="Phone Number *"
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    setTouched({ ...touched, phone: true });
                  }}
                  onBlur={() => setTouched({ ...touched, phone: true })}
                  error={touched.phone && !!errors.phone}
                  mode="outlined"
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#006B3F"
                  style={styles.input}
                  keyboardType="phone-pad"
                  placeholder="+233 XX XXX XXXX"
                />
                {touched.phone && errors.phone && (
                  <HelperText type="error">{errors.phone}</HelperText>
                )}
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <TextInput
                  label="Email (Optional)"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#006B3F"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="salon@example.com"
                />
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <TextInput
                  label="Description (Optional)"
                  value={description}
                  onChangeText={setDescription}
                  mode="outlined"
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#006B3F"
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={4}
                  placeholder="Describe your salon..."
                />
              </View>

              {/* Category Dropdown */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Business Category *</Text>
                <Menu
                  visible={categoryMenuVisible}
                  onDismiss={() => setCategoryMenuVisible(false)}
                  anchor={
                    <TouchableOpacity
                      style={styles.menuAnchor}
                      onPress={() => setCategoryMenuVisible(true)}
                    >
                      <Text style={styles.menuAnchorText}>
                        {BUSINESS_CATEGORIES.find((c) => c.value === category)?.label || 'Select category'}
                      </Text>
                    </TouchableOpacity>
                  }
                >
                  {BUSINESS_CATEGORIES.map((option) => (
                    <Menu.Item
                      key={option.value}
                      onPress={() => {
                        setCategory(option.value);
                        setCategoryMenuVisible(false);
                      }}
                      title={option.label}
                    />
                  ))}
                </Menu>
              </View>
            </Card.Content>
          </Card>

          {/* Business Hours */}
          <Card style={styles.card}>
            <Card.Title title="Business Hours" titleStyle={styles.cardTitle} />
            <Card.Content>
              <Text style={styles.hoursHint}>
                Toggle each day to set open or closed. Select opening and closing times.
              </Text>
              
              {DAYS_OF_WEEK.map(({ key, label }) => (
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
                      {label}
                    </Text>
                  </View>
                  
                  {openingHours[key].isOpen && (
                    <View style={styles.timeRow}>
                      {/* Open Time Menu */}
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

                      <Text style={styles.timeSeparator}>—</Text>

                      {/* Close Time Menu */}
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
                  )}
                  
                  {!openingHours[key].isOpen && (
                    <Text style={styles.closedText}>Closed</Text>
                  )}
                  
                  <Divider style={styles.dayDivider} />
                </View>
              ))}
            </Card.Content>
          </Card>

          {/* Save Button */}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={updateMutation.isPending}
              disabled={updateMutation.isPending}
              style={styles.saveButton}
              buttonColor="#006B3F"
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
  },
  backButton: {
    borderRadius: 8,
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
  },
  photoPlaceholderText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  photoHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  cardTitle: {
    fontWeight: '600',
    color: '#111827',
  },
  inputGroup: {
    marginTop: 12,
  },
  label: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 100,
  },
  menuAnchor: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  menuAnchorText: {
    fontSize: 16,
    color: '#212121',
  },
  hoursHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  dayRow: {
    paddingVertical: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 16,
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
    marginTop: 8,
    paddingLeft: 52,
  },
  timeButton: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    minWidth: 80,
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
  timeSeparator: {
    marginHorizontal: 12,
    color: '#9CA3AF',
  },
  closedText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    paddingLeft: 52,
  },
  dayDivider: {
    marginTop: 12,
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
  saveButton: {
    paddingVertical: 6,
    borderRadius: 8,
  },
});

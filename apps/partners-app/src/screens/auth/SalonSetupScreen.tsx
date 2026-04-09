import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, HelperText, Divider, Surface } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { salonApi, CreateSalonData } from '../../api/salon';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

type AuthStackParamList = {
  Phone: undefined;
  OTP: { phoneNumber: string };
  SalonSetup: undefined;
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'SalonSetup'>;

const BUSINESS_CATEGORIES = [
  { label: 'Barbershop', value: 'BARBERSHOP', icon: 'cut' },
  { label: 'Hair Salon', value: 'HAIR_SALON', icon: 'scissors' },
  { label: 'Beauty Salon', value: 'BEAUTY_SALON', icon: 'sparkles' },
  { label: 'Nail Salon', value: 'NAIL_SALON', icon: 'hand-left' },
  { label: 'Spa & Wellness', value: 'SPA_WELLNESS', icon: 'leaf' },
  { label: 'Full Service', value: 'FULL_SERVICE', icon: 'business' },
];

export default function SalonSetupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, setUser } = useAuthStore();
  
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [email, setEmail] = useState(user?.email || '');
  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleCategory = (value: string) => {
    setSelectedCategories(prev => 
      prev.includes(value) 
        ? prev.filter(c => c !== value)
        : [...prev, value]
    );
  };

  const validateForm = (): boolean => {
    if (!businessName.trim()) {
      setError('Salon name is required');
      return false;
    }
    if (!address.trim()) {
      setError('Address is required');
      return false;
    }
    if (!city.trim()) {
      setError('City is required');
      return false;
    }
    if (!phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const salonData: CreateSalonData = {
        businessName: businessName.trim(),
        address: address.trim(),
        city: city.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        description: description.trim() || undefined,
        category: selectedCategories[0] || undefined,
      };

      // Create the salon
      await salonApi.create(salonData);
      
      // Refresh auth state - fetch updated profile with salon association
      // This ensures we have proper tokens and user state
      const updatedProfile = await authApi.refreshAuthAfterSalonSetup();
      
      // Update auth store - this will trigger navigation to MainNavigator
      setUser(updatedProfile);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create salon. Please try again.');
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
              <View style={[styles.stepCircle, styles.stepActive]}>
                <Text style={styles.stepNumber}>2</Text>
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
              Set Up Your Salon
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Tell us about your business to get started
            </Text>
          </View>

          {/* Basic Info Section */}
          <Surface style={styles.section} elevation={0}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Basic Information
            </Text>
            <Divider style={styles.sectionDivider} />
            
            <TextInput
              label="Salon Name *"
              value={businessName}
              onChangeText={setBusinessName}
              style={styles.input}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              placeholder="e.g., Glamour Beauty Salon"
              left={<TextInput.Icon icon="storefront" color="#6B7280" />}
              theme={{ roundness: 10 }}
              autoFocus
            />

            <TextInput
              label="Address *"
              value={address}
              onChangeText={setAddress}
              style={styles.input}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              placeholder="e.g., 123 Oxford Street, Osu"
              left={<TextInput.Icon icon="map-marker-outline" color="#6B7280" />}
              theme={{ roundness: 10 }}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  label="City *"
                  value={city}
                  onChangeText={setCity}
                  style={styles.input}
                  mode="outlined"
                  outlineColor="#E5E7EB"
                  activeOutlineColor="#006B3F"
                  placeholder="e.g., Accra"
                  theme={{ roundness: 10 }}
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  label="Phone *"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  style={styles.input}
                  mode="outlined"
                  outlineColor="#E5E7EB"
                  activeOutlineColor="#006B3F"
                  placeholder="024 XXX XXXX"
                  left={<TextInput.Icon icon="phone-outline" color="#6B7280" />}
                  theme={{ roundness: 10 }}
                />
              </View>
            </View>

            <TextInput
              label="Email (Optional)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              placeholder="salon@example.com"
              left={<TextInput.Icon icon="email-outline" color="#6B7280" />}
              theme={{ roundness: 10 }}
            />
          </Surface>

          {/* Category Section */}
          <Surface style={styles.section} elevation={0}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Business Category
            </Text>
            <Text variant="bodySmall" style={styles.sectionHint}>
              Select all that apply
            </Text>
            <Divider style={styles.sectionDivider} />
            
            <View style={styles.categoryGrid}>
              {BUSINESS_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    selectedCategories.includes(cat.value) && styles.categoryChipSelected,
                  ]}
                  onPress={() => toggleCategory(cat.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={cat.icon as any} 
                    size={18} 
                    color={selectedCategories.includes(cat.value) ? '#FFFFFF' : '#6B7280'} 
                  />
                  <Text style={[
                    styles.categoryChipText,
                    selectedCategories.includes(cat.value) && styles.categoryChipTextSelected,
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Surface>

          {/* Description Section */}
          <Surface style={styles.section} elevation={0}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Description
            </Text>
            <Divider style={styles.sectionDivider} />
            
            <TextInput
              label="About Your Salon (Optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textArea]}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              placeholder="Tell customers about your salon, services, and what makes you unique..."
              theme={{ roundness: 10 }}
            />
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
            disabled={loading || !businessName || !address || !city || !phone}
            style={styles.button}
            contentStyle={styles.buttonContent}
            buttonColor="#006B3F"
            theme={{ roundness: 12 }}
          >
            {loading ? 'Creating Salon...' : 'Create Salon'}
          </Button>
          
          <Text variant="bodySmall" style={styles.hint}>
            You can add services, staff, and more details after registration
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    color: '#9CA3AF',
  },
  stepLabelActive: {
    color: '#006B3F',
    fontWeight: '600',
  },
  progressLine: {
    width: 60,
    height: 3,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
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
    color: '#111827',
  },
  subtitle: {
    textAlign: 'center',
    color: '#6B7280',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionHint: {
    color: '#9CA3AF',
    marginBottom: 8,
    marginTop: -4,
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
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#9CA3AF',
    marginTop: 16,
    lineHeight: 20,
  },
});

import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText, Divider, List } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { salonApi, CreateSalonData } from '../../api/salon';
import { useAuthStore } from '../../store/authStore';

type AuthStackParamList = {
  Phone: undefined;
  OTP: { phoneNumber: string };
  SalonSetup: undefined;
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'SalonSetup'>;

const BUSINESS_CATEGORIES = [
  { label: 'Hair Salon', value: 'HAIR_SALON' },
  { label: 'Barbershop', value: 'BARBERSHOP' },
  { label: 'Beauty Salon', value: 'BEAUTY_SALON' },
  { label: 'Nail Salon', value: 'NAIL_SALON' },
  { label: 'Spa & Wellness', value: 'SPA_WELLNESS' },
  { label: 'Full Service', value: 'FULL_SERVICE' },
  { label: 'Other', value: 'OTHER' },
];

export default function SalonSetupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [email, setEmail] = useState(user?.email || '');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        category: category || undefined,
      };

      await salonApi.create(salonData);
      // Navigation will be handled automatically by AppNavigator
      // since the user now has a salon associated
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create salon. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (value: string) => {
    const cat = BUSINESS_CATEGORIES.find(c => c.value === value);
    return cat?.label || 'Select Category';
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
          <Text variant="headlineMedium" style={styles.title}>
            Register Your Salon
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Tell us about your business to get started
          </Text>

          <View style={styles.formContainer}>
            <TextInput
              label="Salon Name *"
              value={businessName}
              onChangeText={setBusinessName}
              style={styles.input}
              mode="outlined"
              outlineColor="#E0E0E0"
              activeOutlineColor="#006B3F"
              placeholder="e.g., Glamour Beauty Salon"
              autoFocus
            />

            <TextInput
              label="Address *"
              value={address}
              onChangeText={setAddress}
              style={styles.input}
              mode="outlined"
              outlineColor="#E0E0E0"
              activeOutlineColor="#006B3F"
              placeholder="e.g., 123 Oxford Street, Osu"
              right={<TextInput.Icon icon="map-marker" />}
            />

            <TextInput
              label="City *"
              value={city}
              onChangeText={setCity}
              style={styles.input}
              mode="outlined"
              outlineColor="#E0E0E0"
              activeOutlineColor="#006B3F"
              placeholder="e.g., Accra"
            />

            <TextInput
              label="Phone Number *"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={styles.input}
              mode="outlined"
              outlineColor="#E0E0E0"
              activeOutlineColor="#006B3F"
              placeholder="e.g., 024 XXX XXXX"
              right={<TextInput.Icon icon="phone" />}
            />

            <TextInput
              label="Email (Optional)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              mode="outlined"
              outlineColor="#E0E0E0"
              activeOutlineColor="#006B3F"
              placeholder="salon@example.com"
              right={<TextInput.Icon icon="email" />}
            />

            <View style={styles.pickerContainer}>
              <Text variant="bodyMedium" style={styles.pickerLabel}>
                Business Category (Optional)
              </Text>
              <List.Accordion
                title={getCategoryLabel(category)}
                expanded={showCategoryPicker}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                style={styles.accordion}
                titleStyle={category ? styles.accordionTitleSelected : styles.accordionTitle}
              >
                {BUSINESS_CATEGORIES.map((cat) => (
                  <List.Item
                    key={cat.value}
                    title={cat.label}
                    onPress={() => {
                      setCategory(cat.value);
                      setShowCategoryPicker(false);
                    }}
                    titleStyle={styles.categoryItem}
                    right={props => category === cat.value ? <List.Icon {...props} icon="check" color="#006B3F" /> : null}
                  />
                ))}
              </List.Accordion>
            </View>

            <TextInput
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={styles.textArea}
              mode="outlined"
              outlineColor="#E0E0E0"
              activeOutlineColor="#006B3F"
              placeholder="Tell customers about your salon, services, and what makes you unique..."
            />

            {error ? (
              <HelperText type="error" visible={true} style={styles.error}>
                {error}
              </HelperText>
            ) : null}
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !businessName || !address || !city || !phone}
            style={styles.button}
            contentStyle={styles.buttonContent}
            buttonColor="#006B3F"
          >
            {loading ? 'Creating Salon...' : 'Create Salon'}
          </Button>
          
          <Text variant="bodySmall" style={styles.hint}>
            You can add services, workers, and more details after registration
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#006B3F',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  formContainer: {
    marginBottom: 24,
    gap: 16,
  },
  input: {
    backgroundColor: '#fff',
  },
  textArea: {
    backgroundColor: '#fff',
    minHeight: 100,
  },
  pickerContainer: {
    marginTop: -8,
  },
  pickerLabel: {
    marginBottom: 4,
    color: '#666',
  },
  accordion: {
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  accordionTitle: {
    color: '#666',
  },
  accordionTitleSelected: {
    color: '#006B3F',
    fontWeight: '500',
  },
  categoryItem: {
    fontSize: 14,
  },
  error: {
    marginTop: 8,
  },
  button: {
    borderRadius: 8,
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  hint: {
    textAlign: 'center',
    color: '#999',
    marginTop: 16,
  },
});

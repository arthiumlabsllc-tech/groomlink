import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText, Surface } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../api/auth';

type AuthStackParamList = {
  Email: undefined;
  OTP: { email: string };
  ProfileSetup: { email: string };
  ProviderCategory: undefined;
  SalonSetup: { providerCategory: string };
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ProfileSetup'>;
type ProfileSetupRouteProp = RouteProp<AuthStackParamList, 'ProfileSetup'>;

export default function ProfileSetupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ProfileSetupRouteProp>();
  const { email } = route.params;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhoneNumber = (input: string): string => {
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '');
    
    // If starts with 0, convert to +233 format
    if (digits.startsWith('0')) {
      return '+233' + digits.slice(1);
    }
    
    // If already starts with 233, add +
    if (digits.startsWith('233')) {
      return '+' + digits;
    }
    
    // If starts with +, keep as is (but clean)
    if (input.startsWith('+')) {
      return '+' + digits;
    }
    
    // Otherwise assume Ghana number without prefix
    if (digits.length <= 9) {
      return '+233' + digits;
    }
    
    return '+' + digits;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setPhoneNumber(formatted);
  };

  const validateForm = (): boolean => {
    if (!firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (firstName.trim().length < 2) {
      setError('First name must be at least 2 characters');
      return false;
    }
    if (!lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    if (lastName.trim().length < 2) {
      setError('Last name must be at least 2 characters');
      return false;
    }
    if (!phoneNumber.trim()) {
      setError('Phone number is required');
      return false;
    }
    // Validate Ghana phone format: +233XXXXXXXXX
    if (!phoneNumber.match(/^\+233[0-9]{9}$/)) {
      setError('Phone number must be in Ghana format (+233XXXXXXXXX)');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      await authApi.completeRegistration({
        email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        role: 'SALON_OWNER',
      });

      // On success, tokens are stored by the API
      // Navigate to ProviderCategory selection
      navigation.navigate('ProviderCategory');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete registration. Please try again.');
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
              <Text style={[styles.stepLabel, styles.stepLabelActive]}>Profile</Text>
            </View>
            <View style={styles.progressLine}>
              <View style={styles.progressLineEmpty} />
            </View>
            <View style={styles.progressStep}>
              <View style={[styles.stepCircle, styles.stepInactive]}>
                <Text style={styles.stepNumberInactive}>3</Text>
              </View>
              <Text style={styles.stepLabel}>Salon</Text>
            </View>
          </View>

          {/* Header */}
          <View style={styles.headerSection}>
            <View style={styles.headerIcon}>
              <Ionicons name="person" size={28} color="#006B3F" />
            </View>
            <Text variant="headlineSmall" style={styles.title}>
              Complete Your Profile
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Tell us a bit about yourself
            </Text>
          </View>

          {/* Form Section */}
          <Surface style={styles.section} elevation={0}>
            <TextInput
              label="First Name *"
              value={firstName}
              onChangeText={setFirstName}
              style={styles.input}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              placeholder="e.g., Kwame"
              left={<TextInput.Icon icon="account" color="#6B7280" />}
              theme={{ roundness: 10 }}
              autoFocus
              autoCapitalize="words"
            />

            <TextInput
              label="Last Name *"
              value={lastName}
              onChangeText={setLastName}
              style={styles.input}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              placeholder="e.g., Asante"
              left={<TextInput.Icon icon="account-outline" color="#6B7280" />}
              theme={{ roundness: 10 }}
              autoCapitalize="words"
            />

            <TextInput
              label="Phone Number *"
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              style={styles.input}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              placeholder="+233 XX XXX XXXX"
              left={<TextInput.Icon icon="phone" color="#6B7280" />}
              theme={{ roundness: 10 }}
            />
            <Text variant="bodySmall" style={styles.phoneHint}>
              Enter your Ghana mobile number (e.g., +233241234567)
            </Text>
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
            disabled={loading || !firstName || !lastName || !phoneNumber}
            style={styles.button}
            contentStyle={styles.buttonContent}
            buttonColor="#006B3F"
            theme={{ roundness: 12 }}
          >
            {loading ? 'Saving...' : 'Continue'}
          </Button>

          <Text variant="bodySmall" style={styles.hint}>
            This information helps customers contact you about bookings
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
  stepInactive: {
    backgroundColor: '#E5E7EB',
  },
  stepNumber: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  stepNumberInactive: {
    color: '#9CA3AF',
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
    width: 40,
    height: 3,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressLineFilled: {
    flex: 1,
    backgroundColor: '#006B3F',
  },
  progressLineEmpty: {
    flex: 1,
    backgroundColor: '#E5E7EB',
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
  input: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  phoneHint: {
    color: '#9CA3AF',
    marginTop: -8,
    marginBottom: 4,
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

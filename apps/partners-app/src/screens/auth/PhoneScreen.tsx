import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authApi } from '../../api/auth';

type AuthStackParamList = {
  Phone: undefined;
  OTP: { phoneNumber: string };
  SalonSetup: undefined;
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Phone'>;

export default function PhoneScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhoneNumber = (text: string) => {
    // Remove any non-digit characters
    const cleaned = text.replace(/\D/g, '');
    // Limit to 10 digits
    return cleaned.slice(0, 10);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Ghana phone numbers: 10 digits, starting with 0
    // Or 9 digits without leading 0
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length === 10 || cleanPhone.length === 9;
  };

  const handleRequestOTP = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid 10-digit Ghana phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Format phone number with +233 prefix
      let formattedPhone = phoneNumber.replace(/\D/g, '');
      // Remove leading 0 if present
      if (formattedPhone.startsWith('0')) {
        formattedPhone = formattedPhone.slice(1);
      }
      formattedPhone = `+233${formattedPhone}`;
      
      await authApi.requestOTP(formattedPhone);
      navigation.navigate('OTP', { phoneNumber: formattedPhone });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={styles.ghanaFlag}>
              <View style={[styles.flagStripe, styles.flagRed]} />
              <View style={[styles.flagStripe, styles.flagGold]} />
              <View style={[styles.flagStripe, styles.flagGreen]} />
            </View>
          </View>
          
          <Text variant="headlineMedium" style={styles.title}>
            GroomLink for Business
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Enter your phone number to sign in or register your salon
          </Text>

          <View style={styles.inputContainer}>
            <View style={styles.phoneInputRow}>
              <View style={styles.prefixContainer}>
                <Text style={styles.prefixText}>🇬🇭 +233</Text>
              </View>
              <TextInput
                label="Phone Number"
                value={phoneNumber}
                onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
                keyboardType="phone-pad"
                autoFocus
                style={styles.input}
                placeholder="XX XXX XXXX"
                maxLength={10}
                mode="outlined"
                outlineColor="#E0E0E0"
                activeOutlineColor="#006B3F"
              />
            </View>
            <HelperText type="info" visible={true} style={styles.helperText}>
              Enter your Ghana phone number
            </HelperText>
            {error ? (
              <HelperText type="error" visible={true} style={styles.errorText}>
                {error}
              </HelperText>
            ) : null}
          </View>

          <Button
            mode="contained"
            onPress={handleRequestOTP}
            loading={loading}
            disabled={loading || phoneNumber.length < 9}
            style={[styles.button, (loading || phoneNumber.length < 9) && styles.buttonDisabled]}
            contentStyle={styles.buttonContent}
            buttonColor="#006B3F"
            textColor="#fff"
          >
            {loading ? 'Sending...' : 'Continue'}
          </Button>
          
          {phoneNumber.length < 9 && !loading && (
            <Text variant="bodySmall" style={styles.hintText}>
              Enter your phone number to continue
            </Text>
          )}
          
          <Text variant="bodySmall" style={styles.signupNote}>
            New salon owner? We'll help you set up your business after verification
          </Text>

          <Text variant="bodySmall" style={styles.termsText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
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
    paddingBottom: 40,
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
  ghanaFlag: {
    width: 60,
    height: 40,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  flagStripe: {
    height: 13.33,
  },
  flagRed: {
    backgroundColor: '#CE1126',
  },
  flagGold: {
    backgroundColor: '#FCD116',
  },
  flagGreen: {
    backgroundColor: '#006B3F',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#006B3F',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 24,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prefixContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    fontSize: 18,
  },
  helperText: {
    marginTop: 4,
  },
  errorText: {
    marginTop: 4,
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
    minHeight: 56,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#006B3F80',
    opacity: 0.8,
  },
  buttonContent: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  hintText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 12,
  },
  signupNote: {
    textAlign: 'center',
    color: '#666',
    marginTop: 24,
    fontStyle: 'italic',
  },
  termsText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 16,
  },
});

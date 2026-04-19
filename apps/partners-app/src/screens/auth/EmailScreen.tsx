import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../api/auth';

type AuthStackParamList = {
  Email: undefined;
  OTP: { email: string };
  SalonSetup: undefined;
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Email'>;

export default function EmailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRequestOTP = async () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authApi.requestEmailOTP(email);
      navigation.navigate('OTP', { email });
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
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Image
                source={require('../../../assets/logo-white.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.logoAccent} />
          </View>

          <Text variant="headlineMedium" style={styles.title}>
            GroomLink Partners
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Manage Your Salon
          </Text>
          <Text variant="bodyMedium" style={styles.tagline}>
            For salon & barbershop owners in Ghana
          </Text>

          <View style={styles.inputContainer}>
            <Text variant="labelLarge" style={styles.inputLabel}>
              Email Address
            </Text>
            <TextInput
              label=""
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              style={styles.input}
              placeholder="you@example.com"
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              left={<TextInput.Icon icon="email-outline" color="#6B7280" />}
              theme={{ roundness: 12 }}
            />
            <HelperText type="info" visible={true} style={styles.helperText}>
              We'll send a 6-digit verification code to this email
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
            disabled={loading || !validateEmail(email)}
            style={[styles.button, (loading || !validateEmail(email)) && styles.buttonDisabled]}
            contentStyle={styles.buttonContent}
            buttonColor="#006B3F"
            textColor="#fff"
            theme={{ roundness: 12 }}
          >
            {loading ? 'Sending...' : 'Continue'}
          </Button>

          {!validateEmail(email) && !loading && (
            <Text variant="bodySmall" style={styles.hintText}>
              Enter a valid email address to continue
            </Text>
          )}

          <View style={styles.footerNote}>
            <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
            <Text variant="bodySmall" style={styles.signupNote}>
              New salon owner? We'll help you set up your business after verification
            </Text>
          </View>

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
    backgroundColor: '#FFFFFF',
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
    position: 'relative',
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#006B3F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#006B3F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoImage: {
    width: 52,
    height: 52,
  },
  logoAccent: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FCD116',
    right: '32%',
    top: 0,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: 'bold',
    color: '#006B3F',
    letterSpacing: 0.5,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 4,
    color: '#111827',
    fontWeight: '600',
  },
  tagline: {
    textAlign: 'center',
    marginBottom: 40,
    color: '#6B7280',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    marginBottom: 8,
    color: '#374151',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#FFFFFF',
    fontSize: 16,
  },
  helperText: {
    marginTop: 6,
    color: '#6B7280',
  },
  errorText: {
    marginTop: 4,
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
    minHeight: 56,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#006B3F80',
    opacity: 0.7,
  },
  buttonContent: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  hintText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 13,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 32,
    paddingHorizontal: 8,
    gap: 8,
  },
  signupNote: {
    flex: 1,
    color: '#6B7280',
    lineHeight: 20,
  },
  termsText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 24,
    fontSize: 12,
  },
});

import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../api/auth';
import { AuthStackParamList } from '../../types/navigation';

// Design System Colors
const COLORS = {
  primaryGreen: '#006B3F',
  accentGold: '#FCD116',
  accentRed: '#CE1126',
  dark: '#1a1a2e',
  background: '#F9FAFB',
  cardBackground: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Email'>;

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValidEmail = (email: string): boolean => {
    return EMAIL_REGEX.test(email.trim());
  };

  const handleRequestOTP = async () => {
    const trimmedEmail = email.trim();
    
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authApi.requestEmailOTP(trimmedEmail);
      navigation.navigate('OTP', { email: trimmedEmail });
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>GL</Text>
            </View>
            <View style={styles.logoAccent} />
          </View>

          <Text variant="headlineMedium" style={styles.title}>
            Welcome to GroomLink
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Find the best salons in Ghana
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              style={styles.input}
              placeholder="you@example.com"
              left={<TextInput.Icon icon="email" color={COLORS.textSecondary} />}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primaryGreen}
              mode="outlined"
            />
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
            disabled={loading || !isValidEmail(email)}
            style={[styles.button, (loading || !isValidEmail(email)) && styles.buttonDisabled]}
            contentStyle={styles.buttonContent}
            buttonColor={COLORS.primaryGreen}
            textColor="#fff"
          >
            {loading ? 'Sending...' : 'Continue'}
          </Button>

          <Text variant="bodySmall" style={styles.termsText}>
            By continuing, you agree to our Terms & Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    marginBottom: 32,
  },
  logoCircle: {
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
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoAccent: {
    width: 40,
    height: 6,
    backgroundColor: COLORS.accentGold,
    borderRadius: 3,
    marginTop: 8,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 40,
    color: COLORS.textSecondary,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: COLORS.cardBackground,
    fontSize: 16,
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
    opacity: 0.6,
  },
  buttonContent: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  termsText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 24,
    fontSize: 12,
  },
});

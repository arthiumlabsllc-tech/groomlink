import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../../api/auth';
import { AuthStackParamList } from '../../types/navigation';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

// Theme-aware logo selection
const LOGO_BLACK = require('../../../assets/logo-full-black.png');
const LOGO_WHITE = require('../../../assets/logo-full-white.png');

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
});

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Email'>;

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDark } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Select logo based on theme
  const logoSource = isDark ? LOGO_WHITE : LOGO_BLACK;

  // Check if user is resuming registration (app was closed during profile setup)
  useEffect(() => {
    const checkRegistrationState = async () => {
      const isNewUser = await SecureStore.getItemAsync('isNewUser');
      const registrationEmail = await SecureStore.getItemAsync('registrationEmail');
      if (isNewUser === 'true' && registrationEmail) {
        navigation.replace('ProfileSetup', { email: registrationEmail });
      }
    };
    checkRegistrationState();
  }, []);

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
            <Image
              source={logoSource}
              style={styles.logoImage}
              resizeMode="contain"
            />
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
              placeholderTextColor={COLORS.textSecondary}
              textColor={COLORS.textPrimary}
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

const createStyles = (COLORS: ReturnType<typeof createColors>) => StyleSheet.create({
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
  logoImage: {
    width: 180,
    height: 56,
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

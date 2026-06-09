import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../../api/auth';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

type AuthStackParamList = {
  Email: undefined;
  OTP: { email: string };
  ProfileSetup: { email: string };
  ProviderCategory: undefined;
  SalonSetup: { providerCategory: string };
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Email'>;

export default function EmailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user is resuming registration after app restart
  useEffect(() => {
    const checkRegistrationResume = async () => {
      try {
        const isNewUser = await SecureStore.getItemAsync('isNewUser');
        const registrationEmail = await SecureStore.getItemAsync('registrationEmail');
        if (isNewUser === 'true' && registrationEmail) {
          // User was in the middle of registration - navigate to ProfileSetup
          navigation.navigate('ProfileSetup', { email: registrationEmail });
        }
      } catch (e) {
        // Ignore errors - just stay on Email screen
      }
    };
    checkRegistrationResume();
  }, []);

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
      const errorMessage = err.response?.data?.error?.message 
        || err.response?.data?.message 
        || 'Failed to send OTP. Please try again.';
      setError(errorMessage);
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
            <Image
              source={isDark ? require('../../../assets/logo-full-white.png') : require('../../../assets/logo-full-black.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
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

          {/* Sign In Method Description */}
          <View style={styles.authMethodContainer}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#006B3F" />
            <Text variant="bodyMedium" style={styles.authMethodText}>
              We use passwordless sign in. Enter your email and we'll send a 6-digit verification code.
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              placeholder="you@example.com"
              mode="outlined"
              outlineColor={theme.border}
              activeOutlineColor="#006B3F"
              textColor={theme.text}
              placeholderTextColor={theme.textSecondary}
              left={<TextInput.Icon icon="email-outline" color={theme.textSecondary} />}
              theme={{ roundness: 12, colors: { onSurfaceVariant: theme.textSecondary } }}
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
            disabled={loading || !validateEmail(email)}
            style={[styles.button, (loading || !validateEmail(email)) && styles.buttonDisabled]}
            contentStyle={styles.buttonContent}
            buttonColor={(loading || !validateEmail(email)) ? '#E0E0E0' : '#006B3F'}
            textColor={(loading || !validateEmail(email)) ? '#9E9E9E' : '#FFFFFF'}
            theme={{ roundness: 12 }}
          >
            {loading ? 'Sending...' : 'Continue'}
          </Button>

          <View style={styles.footerNote}>
            <Ionicons name="information-circle-outline" size={16} color={theme.textTertiary} />
            <Text variant="bodySmall" style={styles.signupNote}>
              New salon owner? We'll help you set up your business after verification. No password needed.
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

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
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
  title: {
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: 'bold',
    color: theme.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 4,
    color: theme.text,
    fontWeight: '600',
  },
  tagline: {
    textAlign: 'center',
    marginBottom: 40,
    color: theme.textSecondary,
  },
  authMethodContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.successBg,
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    gap: 10,
  },
  authMethodText: {
    flex: 1,
    color: theme.text,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: theme.surface,
    fontSize: 16,
    minHeight: 56,
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
    elevation: 0,
  },
  buttonContent: {
    paddingVertical: 16,
    paddingHorizontal: 24,
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
    color: theme.textSecondary,
    lineHeight: 20,
  },
  termsText: {
    textAlign: 'center',
    color: theme.textSecondary,
    marginTop: 24,
    fontSize: 12,
  },
});

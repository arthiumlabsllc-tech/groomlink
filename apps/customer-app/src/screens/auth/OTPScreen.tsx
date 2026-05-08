import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TextInput as RNTextInput, Image } from 'react-native';
import { Text, Button, HelperText } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { AuthStackParamList } from '../../types/navigation';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

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

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'OTP'>;
type OTPRouteProp = RouteProp<AuthStackParamList, 'OTP'>;

const RESEND_TIMEOUT = 30;

export default function OTPScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OTPRouteProp>();
  const { email } = route.params;
  const { setUser } = useAuthStore();
  const { theme } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(RESEND_TIMEOUT);
  const inputRefs = useRef<(RNTextInput | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (index === 5 && value) {
      const code = [...newOtp.slice(0, 5), value].join('');
      if (code.length === 6) {
        handleVerify(code);
      }
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await authApi.verifyEmailOTP(email, code);
      
      if (response.success) {
        const { user, isNewUser } = response.data;
        
        if (isNewUser) {
          // New user - store flag and navigate to ProfileSetup to complete registration
          await SecureStore.setItemAsync('isNewUser', 'true');
          navigation.navigate('ProfileSetup', { email });
        } else {
          // Existing user - tokens are already stored in SecureStore by authApi
          // Set user in store which updates isAuthenticated to true
          setUser(user);
          // Dismiss the entire auth modal by resetting to MainTabs
          // navigation.goBack() only pops within AuthNavigator (OTP->Email),
          // it doesn't dismiss the modal. We need to reset the root navigator.
          navigation.getParent()?.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            })
          );
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await authApi.requestEmailOTP(email);
      setError('');
      setCountdown(RESEND_TIMEOUT);
    } catch (err: any) {
      setError('Failed to resend OTP. Please try again.');
    }
  };

  const isActive = (index: number) => {
    // Active if current is empty and previous is filled, or if current has value
    if (index === 0) return otp[0] === '';
    return otp[index] !== '' || (otp[index - 1] !== '' && otp[index] === '');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../../../assets/logo-white.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        <Text variant="headlineMedium" style={styles.title}>
          Verify your email
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Enter the 6-digit code sent to{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <RNTextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.otpInput,
                isActive(index) && styles.otpInputActive,
              ]}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(value) => handleOtpChange(index, value)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              placeholderTextColor={COLORS.textSecondary}
              selectTextOnFocus
            />
          ))}
        </View>

        {error ? (
          <HelperText type="error" visible={true} style={styles.error}>
            {error}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          onPress={() => handleVerify(otp.join(''))}
          loading={loading}
          disabled={loading || otp.join('').length !== 6}
          style={styles.button}
          contentStyle={styles.buttonContent}
          buttonColor={COLORS.primaryGreen}
        >
          {loading ? 'Verifying...' : 'Verify'}
        </Button>

        <Button
          mode="text"
          onPress={handleResend}
          disabled={loading || countdown > 0}
          style={styles.resendButton}
          textColor={countdown > 0 ? COLORS.textSecondary : COLORS.primaryGreen}
        >
          {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (COLORS: ReturnType<typeof createColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoImage: {
    width: 48,
    height: 48,
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
    lineHeight: 24,
  },
  emailText: {
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  otpInput: {
    width: 52,
    height: 64,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    backgroundColor: COLORS.cardBackground,
  },
  otpInputActive: {
    borderColor: COLORS.primaryGreen,
    shadowColor: COLORS.primaryGreen,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  error: {
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    borderRadius: 12,
    marginBottom: 16,
    minHeight: 56,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  resendButton: {
    alignSelf: 'center',
  },
});

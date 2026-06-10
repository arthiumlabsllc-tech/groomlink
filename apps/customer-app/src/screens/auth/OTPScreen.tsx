import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TextInput as RNTextInput, Image, Animated } from 'react-native';
import { Text, Button, HelperText } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
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

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'OTP'>;
type OTPRouteProp = RouteProp<AuthStackParamList, 'OTP'>;

const RESEND_TIMEOUT = 30;

export default function OTPScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OTPRouteProp>();
  const { email } = route.params;
  const { setUser } = useAuthStore();
  const { theme, isDark } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  // Select logo based on theme
  const logoSource = isDark ? LOGO_WHITE : LOGO_BLACK;
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(RESEND_TIMEOUT);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(RNTextInput | null)[]>([]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // Auto-paste from clipboard
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const clip = await Clipboard.getStringAsync();
        if (clip && /^\d{6}$/.test(clip.trim())) {
          const digits = clip.trim().split('');
          setOtp(digits);
          handleVerify(clip.trim());
        }
      } catch {}
    };
    // Small delay to allow screen to mount
    const timer = setTimeout(checkClipboard, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1 || loading) return;
    
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
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const response = await authApi.verifyEmailOTP(email, code);
      
      if (response.success) {
        const { user, isNewUser } = response.data;
        
        // Show success animation
        setVerified(true);
        Animated.spring(successScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();

        // Brief delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 600));

        if (isNewUser) {
          // New user - store flag and email, then navigate to ProfileSetup to complete registration
          await SecureStore.setItemAsync('isNewUser', 'true');
          await SecureStore.setItemAsync('registrationEmail', email);
          navigation.navigate('ProfileSetup', { email });
        } else {
          // Existing user - tokens are already stored in SecureStore by authApi
          // Set user in store which updates isAuthenticated to true
          setUser(user);
          // Dismiss the entire auth modal by resetting to MainTabs
          navigation.getParent()?.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            })
          );
        }
      } else {
        // API returned success: false with an error message
        setError(response.message || 'Invalid OTP. Please try again.');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message 
        || err.response?.data?.message 
        || 'Invalid OTP. Please try again.';
      setError(errorMessage);
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
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={logoSource}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {verified ? (
          <View style={styles.successContainer}>
            <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
              <Ionicons name="checkmark" size={40} color="#fff" />
            </Animated.View>
            <Text variant="headlineSmall" style={styles.successText}>Verified!</Text>
          </View>
        ) : (
          <>
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
          </>
        )}
      </Animated.View>
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
  logoImage: {
    width: 160,
    height: 50,
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
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successText: {
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
  },
});

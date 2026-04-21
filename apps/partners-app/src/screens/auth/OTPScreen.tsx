import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TextInput as RNTextInput, Image } from 'react-native';
import { Text, Button, HelperText, Surface } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

type AuthStackParamList = {
  Email: undefined;
  OTP: { email: string };
  ProfileSetup: { email: string };
  SalonSetup: undefined;
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'OTP'>;
type OTPRouteProp = RouteProp<AuthStackParamList, 'OTP'>;

export default function OTPScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OTPRouteProp>();
  const { email } = route.params;
  const { setUser } = useAuthStore();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(RNTextInput | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow single digit
    if (value.length > 1) return;
    
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

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
    if (code.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authApi.verifyEmailOTP(email, code);
      
      if (response.success) {
        const { isNewUser, user } = response.data;
        
        if (isNewUser) {
          // New user needs to complete profile first, then set up their salon
          // Don't call setUser() yet - keep user in auth flow
          navigation.navigate('ProfileSetup', { email });
        } else {
          // Existing user - fully authenticated, store tokens and go to main app
          setUser(user);
          // AppNavigator will automatically redirect to MainNavigator
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
    if (!canResend) return;
    
    try {
      setLoading(true);
      await authApi.requestEmailOTP(email);
      setError('');
      setResendTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const maskEmail = (email: string) => {
    // Mask email for privacy: s***@example.com
    const [localPart, domain] = (email || '').split('@');
    if (!localPart || !domain) return email || '';
    if (localPart.length <= 2) {
      return email;
    }
    const maskedLocal = localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1];
    return `${maskedLocal}@${domain}`;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/logo-black.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text variant="headlineMedium" style={styles.title}>
          Verify Email
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Enter the 6-digit code sent to
        </Text>
        <Text variant="bodyLarge" style={styles.emailText}>
          {maskEmail(email)}
        </Text>

        {/* OTP Input Container */}
        <Surface style={styles.otpContainer} elevation={0}>
          {otp.map((digit, index) => (
            <RNTextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null,
                error ? styles.otpInputError : null,
              ]}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(value) => handleOtpChange(index, value)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              selectTextOnFocus
              editable={!loading}
            />
          ))}
        </Surface>

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#CE1126" />
            <HelperText type="error" visible={true} style={styles.error}>
              {error}
            </HelperText>
          </View>
        ) : null}

        <Button
          mode="contained"
          onPress={() => handleVerify(otp.join(''))}
          loading={loading}
          disabled={loading || otp.join('').length !== 6}
          style={styles.button}
          contentStyle={styles.buttonContent}
          buttonColor="#006B3F"
          theme={{ roundness: 12 }}
        >
          {loading ? 'Verifying...' : 'Verify Code'}
        </Button>

        <View style={styles.resendContainer}>
          {canResend ? (
            <Button
              mode="text"
              onPress={handleResend}
              disabled={loading}
              textColor="#006B3F"
              labelStyle={styles.resendButton}
            >
              Resend Code
            </Button>
          ) : (
            <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text variant="bodyMedium" style={styles.timerText}>
                Resend code in <Text style={styles.timerCount}>{resendTimer}s</Text>
              </Text>
            </View>
          )}
        </View>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Email')}
          textColor="#6B7280"
          style={styles.backButton}
          labelStyle={styles.backButtonLabel}
        >
          <Ionicons name="arrow-back" size={16} color="#6B7280" /> Change Email
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    width: 48,
    height: 48,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    textAlign: 'center',
    color: '#6B7280',
  },
  emailText: {
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '600',
    color: '#006B3F',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  otpInputFilled: {
    borderColor: '#006B3F',
    backgroundColor: '#F0FDF4',
    color: '#006B3F',
  },
  otpInputError: {
    borderColor: '#CE1126',
    backgroundColor: '#FEF2F2',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  error: {
    textAlign: 'center',
    marginLeft: 4,
  },
  button: {
    borderRadius: 12,
    marginBottom: 20,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendButton: {
    fontWeight: '600',
    fontSize: 15,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    color: '#6B7280',
  },
  timerCount: {
    fontWeight: 'bold',
    color: '#FCD116',
    fontSize: 16,
  },
  backButton: {
    alignSelf: 'center',
  },
  backButtonLabel: {
    fontSize: 14,
  },
});

import React, { useState, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TextInput as RNTextInput } from 'react-native';
import { Text, Button, HelperText } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { AuthStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'OTP'>;
type OTPRouteProp = RouteProp<AuthStackParamList, 'OTP'>;

export default function OTPScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OTPRouteProp>();
  const { phoneNumber } = route.params;
  const { setUser } = useAuthStore();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(RNTextInput | null)[]>([]);

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
      const response = await authApi.verifyOTP(phoneNumber, code);
      
      if (response.success) {
        setUser(response.data.user);
        
        if (response.data.isNewUser) {
          navigation.navigate('ProfileSetup');
        }
        // Otherwise, AppNavigator will automatically show Main screens
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
      await authApi.requestOTP(phoneNumber);
      setError('');
    } catch (err: any) {
      setError('Failed to resend OTP. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Enter OTP
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Enter the 6-digit code sent to {phoneNumber}
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <RNTextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(value) => handleOtpChange(index, value)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
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
        >
          {loading ? 'Verifying...' : 'Verify'}
        </Button>

        <Button
          mode="text"
          onPress={handleResend}
          disabled={loading}
          style={styles.resendButton}
        >
          Resend OTP
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#CE1126',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  error: {
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  resendButton: {
    alignSelf: 'center',
  },
});

import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>GL</Text>
            </View>
          </View>
          
          <Text variant="headlineMedium" style={styles.title}>
            GroomLink for Business
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Enter your email to sign in or create an account
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
              mode="outlined"
              outlineColor="#E0E0E0"
              activeOutlineColor="#006B3F"
              left={<TextInput.Icon icon="email" />}
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
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </Button>
          
          {!validateEmail(email) && !loading && (
            <Text variant="bodySmall" style={styles.hintText}>
              Enter a valid email address to continue
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
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#006B3F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
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
  input: {
    backgroundColor: '#fff',
    fontSize: 16,
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

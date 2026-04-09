import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authApi } from '../../api/auth';
import { AuthStackParamList } from '../../types/navigation';

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
          <Text variant="headlineMedium" style={styles.title}>
            Welcome to GroomLink
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
              left={<TextInput.Icon icon="email" />}
            />
            <HelperText type="info" visible={true}>
              We'll send a verification code to this email
            </HelperText>
            {error ? (
              <HelperText type="error" visible={true}>
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
            buttonColor="#CE1126"
            textColor="#fff"
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </Button>
          
          {!isValidEmail(email) && !loading && (
            <Text variant="bodySmall" style={styles.hintText}>
              Enter a valid email to continue
            </Text>
          )}

          <Text variant="bodySmall" style={styles.signupNote}>
            New here? We'll help you set up your account after verification
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
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#f5f5f5',
    fontSize: 18,
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
    minHeight: 56,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#CE112680',
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
});

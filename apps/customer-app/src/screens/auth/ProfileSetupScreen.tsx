import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

export default function ProfileSetupScreen() {
  const { setUser } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!firstName || !lastName) {
      setError('First and last name are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authApi.updateProfile({
        firstName,
        lastName,
        email: email || undefined,
      });

      if (response.success) {
        const profile = await authApi.getProfile();
        setUser(profile);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
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
            Complete Your Profile
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Tell us a bit about yourself
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              style={styles.input}
              autoFocus
            />
            <TextInput
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              style={styles.input}
            />
            <TextInput
              label="Email (Optional)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            {error ? (
              <HelperText type="error" visible={true}>
                {error}
              </HelperText>
            ) : null}
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !firstName || !lastName}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {loading ? 'Saving...' : 'Get Started'}
          </Button>
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
    gap: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
  },
  button: {
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});

import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authApi } from '../../api/auth';
import { AuthStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Phone'>;

export default function PhoneScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+233${phoneNumber.replace(/^0/, '')}`;
      await authApi.requestOTP(formattedPhone);
      navigation.navigate('OTP', { phoneNumber: formattedPhone });
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
            Enter your phone number to get started
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              label="Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoFocus
              style={styles.input}
              placeholder="+233 XX XXX XXXX"
              left={<TextInput.Affix text="+233 " />}
            />
            <HelperText type="info" visible={true}>
              Enter your Ghana phone number
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
            disabled={loading || phoneNumber.length < 9}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {loading ? 'Sending...' : 'Continue'}
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
  },
  input: {
    backgroundColor: '#f5f5f5',
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});

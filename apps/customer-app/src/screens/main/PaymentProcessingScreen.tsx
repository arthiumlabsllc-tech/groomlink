import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { paymentApi } from '../../api/payment';
import { RootStackParamList } from '../../types/navigation';

type PaymentProcessingRouteProp = RouteProp<RootStackParamList, 'PaymentProcessing'>;
type PaymentProcessingNavProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  route: PaymentProcessingRouteProp;
}

export default function PaymentProcessingScreen({ route }: Props) {
  const { bookingId, clientReference, provider } = route.params;
  const navigation = useNavigation<PaymentProcessingNavProp>();
  const [status, setStatus] = useState<'polling' | 'success' | 'failed' | 'timeout'>('polling');
  const [attempts, setAttempts] = useState(0);
  const spinValue = useRef(new Animated.Value(0)).current;
  const MAX_POLL_ATTEMPTS = 30; // ~90 seconds (3s intervals)

  // Spin animation
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, []);

  // Poll for payment status
  useEffect(() => {
    if (status !== 'polling') return;

    const poll = async () => {
      try {
        const result = await paymentApi.verify({ reference: clientReference });

        if (result.success) {
          setStatus('success');
          // Navigate to booking confirmation after a short delay
          setTimeout(() => {
            navigation.reset({
              index: 1,
              routes: [
                { name: 'MainTabs' },
                { name: 'BookingConfirmation', params: { bookingId } },
              ],
            });
          }, 2000);
          return;
        }

        if (result.status === 'FAILED' || result.status === 'CANCELLED') {
          setStatus('failed');
          return;
        }

        // Still pending, increment attempts
        setAttempts(prev => {
          const next = prev + 1;
          if (next >= MAX_POLL_ATTEMPTS) {
            setStatus('timeout');
          }
          return next;
        });
      } catch (error: any) {
        // Network error, keep polling
        setAttempts(prev => {
          const next = prev + 1;
          if (next >= MAX_POLL_ATTEMPTS) {
            setStatus('timeout');
          }
          return next;
        });
      }
    };

    const interval = setInterval(poll, 3000);
    // Initial poll
    poll();

    return () => clearInterval(interval);
  }, [status, clientReference, bookingId, navigation]);

  const getProviderLabel = () => {
    switch (provider) {
      case 'MTN_MOMO': return 'MTN Mobile Money';
      case 'VODAFONE_CASH': return 'Vodafone Cash';
      case 'AIRTELTIGO_MONEY': return 'AirtelTigo Money';
      default: return provider;
    }
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleRetry = () => {
    setStatus('polling');
    setAttempts(0);
  };

  const handleGoToBookings = () => {
    navigation.reset({
      index: 1,
      routes: [
        { name: 'MainTabs' },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {status === 'polling' && (
        <View style={styles.content}>
          <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
            <Ionicons name="sync" size={56} color="#006B3F" />
          </Animated.View>
          <Text style={styles.title}>Processing Payment</Text>
          <Text style={styles.subtitle}>
            Waiting for {getProviderLabel()} confirmation...
          </Text>
          <Text style={styles.hint}>
            Please approve the payment prompt on your phone
          </Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${Math.min((attempts / MAX_POLL_ATTEMPTS) * 100, 100)}%` }]} />
          </View>
        </View>
      )}

      {status === 'success' && (
        <View style={styles.content}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={72} color="#006B3F" />
          </View>
          <Text style={styles.title}>Payment Successful!</Text>
          <Text style={styles.subtitle}>
            Your booking has been confirmed
          </Text>
        </View>
      )}

      {status === 'failed' && (
        <View style={styles.content}>
          <View style={styles.failedIcon}>
            <Ionicons name="close-circle" size={72} color="#CE1126" />
          </View>
          <Text style={styles.title}>Payment Failed</Text>
          <Text style={styles.subtitle}>
            The payment could not be completed. Your booking is still pending.
          </Text>
          <Text style={styles.hint}>
            You can retry payment from your booking details
          </Text>
          <View style={styles.buttonGroup}>
            <Button
              mode="contained"
              onPress={handleRetry}
              buttonColor="#006B3F"
              style={styles.button}
            >
              Retry Payment
            </Button>
            <Button
              mode="outlined"
              onPress={handleGoToBookings}
              style={styles.button}
            >
              Go to Bookings
            </Button>
          </View>
        </View>
      )}

      {status === 'timeout' && (
        <View style={styles.content}>
          <View style={styles.failedIcon}>
            <Ionicons name="time-outline" size={72} color="#FCD116" />
          </View>
          <Text style={styles.title}>Payment Taking Longer</Text>
          <Text style={styles.subtitle}>
            We haven't received confirmation yet. This can take up to 2 minutes.
          </Text>
          <Text style={styles.hint}>
            Your booking is still pending. You can check the status later.
          </Text>
          <View style={styles.buttonGroup}>
            <Button
              mode="contained"
              onPress={handleRetry}
              buttonColor="#006B3F"
              style={styles.button}
            >
              Keep Checking
            </Button>
            <Button
              mode="outlined"
              onPress={handleGoToBookings}
              style={styles.button}
            >
              Go to Bookings
            </Button>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  spinner: {
    marginBottom: 32,
  },
  successIcon: {
    marginBottom: 24,
  },
  failedIcon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
  },
  progressContainer: {
    width: '80%',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#006B3F',
    borderRadius: 2,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
  },
});

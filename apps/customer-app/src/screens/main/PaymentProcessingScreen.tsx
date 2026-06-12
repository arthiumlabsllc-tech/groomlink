import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { paymentApi } from '../../api/payment';
import { RootStackParamList } from '../../types/navigation';
import PaystackWebViewModal from '../../components/PaystackWebViewModal';

type PaymentProcessingRouteProp = RouteProp<RootStackParamList, 'PaymentProcessing'>;
type PaymentProcessingNavProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  route: PaymentProcessingRouteProp;
}

export default function PaymentProcessingScreen({ route }: Props) {
  const { bookingId, reference, provider, checkoutUrl } = route.params;
  const navigation = useNavigation<PaymentProcessingNavProp>();
  const isDark = useColorScheme() === 'dark';
  const styles = createStyles(isDark);
  const [status, setStatus] = useState<'polling' | 'success' | 'failed' | 'timeout'>('polling');
  const [attempts, setAttempts] = useState(0);
  const [showWebView, setShowWebView] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;
  const MAX_POLL_ATTEMPTS = 200; // ~600 seconds / 10 minutes (3s intervals) - matches backend grace period

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
        const result = await paymentApi.verify({ reference });

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

        // Only show failed if the server explicitly confirms failure
        // (not just 'still processing')
        if (result.status === 'FAILED' || result.status === 'CANCELLED') {
          setStatus('failed');
          return;
        }

        // Payment is still processing (PROCESSING status) or other non-terminal state
        // Continue polling
        setAttempts(prev => {
          const next = prev + 1;
          if (next >= MAX_POLL_ATTEMPTS) {
            setStatus('timeout');
          }
          return next;
        });
      } catch (error: any) {
        // API returned 400 (explicit failure) - check response data
        const responseStatus = error?.response?.data?.data?.status;
        if (responseStatus === 'FAILED' || responseStatus === 'CANCELLED') {
          setStatus('failed');
          return;
        }
        
        // Network error or other error, keep polling
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
  }, [status, reference, bookingId, navigation]);

  const handleOpenWebView = useCallback(() => {
    if (checkoutUrl) {
      setShowWebView(true);
    }
  }, [checkoutUrl]);

  const handlePaymentComplete = useCallback((_reference: string) => {
    // Close the WebView - the polling mechanism will detect the success
    setShowWebView(false);
  }, []);

  const handlePaymentFailed = useCallback((_reference: string) => {
    // Close the WebView - the polling mechanism will detect the failure
    setShowWebView(false);
  }, []);

  const handleWebViewClose = useCallback(() => {
    setShowWebView(false);
  }, []);

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
    <>
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
            {checkoutUrl
              ? 'Tap "Complete Payment" below to finish payment in the secure checkout'
              : 'Please approve the payment prompt on your phone'}
          </Text>
          {checkoutUrl && (
            <Button
              mode="contained"
              onPress={handleOpenWebView}
              buttonColor="#006B3F"
              style={styles.actionButton}
            >
              Complete Payment
            </Button>
          )}
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

      {/* Paystack Inline WebView Modal */}
      {checkoutUrl && (
        <PaystackWebViewModal
          visible={showWebView}
          checkoutUrl={checkoutUrl}
          onClose={handleWebViewClose}
          onPaymentComplete={handlePaymentComplete}
          onPaymentFailed={handlePaymentFailed}
        />
      )}
    </>
  );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#121212' : '#FFFFFF',
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
    color: isDark ? '#FFFFFF' : '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: isDark ? '#9CA3AF' : '#4B5563',
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: isDark ? '#6B7280' : '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
  },
  progressContainer: {
    width: '80%',
    height: 4,
    backgroundColor: isDark ? '#333333' : '#E5E7EB',
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
  actionButton: {
    width: '80%',
    marginVertical: 16,
  },
});

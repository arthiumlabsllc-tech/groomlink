import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  SafeAreaView,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface PaystackWebViewModalProps {
  visible: boolean;
  checkoutUrl: string;
  onClose: () => void;
  onPaymentComplete: (reference: string) => void;
  onPaymentFailed?: (reference: string) => void;
}

/**
 * Modal WebView that loads Paystack checkout inline.
 * Monitors URL navigation to detect when payment is complete.
 *
 * Flow:
 * 1. Loads Paystack authorization_url in WebView
 * 2. User completes payment (enters phone, approves mobile money prompt)
 * 3. Paystack redirects to our callback URL
 * 4. We intercept that redirect, extract the reference, and close the modal
 * 5. The parent screen's polling mechanism confirms the final status
 */
export default function PaystackWebViewModal({
  visible,
  checkoutUrl,
  onClose,
  onPaymentComplete,
  onPaymentFailed,
}: PaystackWebViewModalProps) {
  const isDark = useColorScheme() === 'dark';
  const webViewRef = useRef<WebView>(null);
  const hasHandledResult = useRef(false);

  // Callback URL patterns that Paystack redirects to after payment
  const CALLBACK_PATTERNS = [
    '/api/payments/callback/paystack',
    '/payment/success',
    '/payment/failed',
  ];

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      if (hasHandledResult.current) return;

      const { url } = navState;

      // Check if Paystack is redirecting to our callback URL
      const isCallbackUrl = CALLBACK_PATTERNS.some(
        (pattern) => url.includes(pattern)
      );

      if (isCallbackUrl) {
        hasHandledResult.current = true;

        try {
          const urlObj = new URL(url);
          const reference =
            urlObj.searchParams.get('reference') ||
            urlObj.searchParams.get('trxref') ||
            '';
          const error = urlObj.searchParams.get('error');

          // Check if it's a failure redirect
          if (url.includes('/payment/failed') || error) {
            onPaymentFailed?.(reference);
          } else {
            onPaymentComplete(reference);
          }
        } catch {
          // URL parsing failed, still treat as complete and let polling handle it
          onPaymentComplete('');
        }
      }
    },
    [onPaymentComplete, onPaymentFailed]
  );

  const handleClose = useCallback(() => {
    hasHandledResult.current = false;
    onClose();
  }, [onClose]);

  // Reset handler when modal becomes visible
  const handleShow = useCallback(() => {
    hasHandledResult.current = false;
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onShow={handleShow}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#E5E7EB' }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={isDark ? '#FFF' : '#111'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#111' }]}>
            Secure Payment
          </Text>
          <View style={styles.headerRight}>
            <Ionicons name="lock-closed" size={16} color="#006B3F" />
            <Text style={styles.secureText}>Paystack</Text>
          </View>
        </View>

        {/* WebView */}
        <WebView
          ref={webViewRef}
          source={{ uri: checkoutUrl }}
          onNavigationStateChange={handleNavigationStateChange}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#006B3F" />
              <Text style={[styles.loadingText, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>
                Loading secure checkout...
              </Text>
            </View>
          )}
          // Security settings
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          // Prevent the WebView from navigating away from payment
          onShouldStartLoadWithRequest={(request) => {
            // Allow Paystack URLs and our callback URLs
            const allowedDomains = [
              'checkout.paystack.com',
              'groomlinkgh.com',
              'api.paystack.co',
            ];

            // Block non-payment URLs (social login callbacks, etc.)
            const url = request.url.toLowerCase();
            const isAllowed = allowedDomains.some(
              (domain) => url.includes(domain)
            );

            // Also allow tel: for phone number auto-dial
            if (url.startsWith('tel:')) return false;

            return isAllowed;
          }}
          // Handle errors gracefully
          onError={() => {
            // WebView error - let the user close and retry
          }}
          onHttpError={() => {
            // HTTP error - let the user close and retry
          }}
          style={styles.webview}
        />

        {/* Bottom notice */}
        <View style={[styles.footer, { borderTopColor: isDark ? '#333' : '#E5E7EB' }]}>
          <Ionicons name="shield-checkmark" size={14} color="#006B3F" />
          <Text style={[styles.footerText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Your payment is secured by Paystack. Never share your PIN.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  secureText: {
    fontSize: 12,
    color: '#006B3F',
    fontWeight: '600',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
  },
});

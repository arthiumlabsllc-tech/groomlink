import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  Button,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { bookingApi } from '../../api/booking';
import { MainStackParamList } from '../../types/navigation';

// Design System Colors
const COLORS = {
  primaryGreen: '#006B3F',
  accentGold: '#FCD116',
  accentRed: '#CE1126',
  dark: '#1a1a2e',
  background: '#F9FAFB',
  cardBackground: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};

type BookingQRCodeRouteProp = RouteProp<MainStackParamList, 'BookingQRCode'>;

export default function BookingQRCodeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<BookingQRCodeRouteProp>();
  const { bookingId } = route.params;

  const { data: qrData, isLoading, error } = useQuery({
    queryKey: ['booking-qr', bookingId],
    queryFn: () => bookingApi.getQRCode(bookingId),
  });

  // Fetch booking details to get checkinCode
  const { data: bookingData } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingApi.getBookingById(bookingId),
  });

  const generateReference = () => {
    return `GLK-${bookingId.substring(0, 8).toUpperCase()}`;
  };

  const copyToClipboard = (text: string) => {
    // For React Native, we'll show an alert with the code that user can manually copy
    // expo-clipboard would need to be installed for actual clipboard functionality
    Alert.alert(
      'Check-in Code',
      `Your code is: ${text}\n\nShow this code to salon staff.`,
      [{ text: 'OK' }]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryGreen} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading QR Code...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !qrData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="qr-code-outline" size={64} color={COLORS.accentRed} />
          <Text variant="titleMedium" style={styles.errorTitle}>
            Failed to load QR code
          </Text>
          <Text variant="bodyMedium" style={styles.errorSubtitle}>
            Please try again later
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="qr-code" size={32} color={COLORS.primaryGreen} />
          <Text variant="headlineSmall" style={styles.headerTitle}>
            Check-in Code
          </Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            Show this code to your barber/stylist
          </Text>
        </View>

        {/* QR Code Card */}
        <Card style={styles.qrCard}>
          <Card.Content style={styles.qrCardContent}>
            {/* Booking Reference */}
            <View style={styles.referenceContainer}>
              <Text variant="labelMedium" style={styles.referenceLabel}>
                Booking Reference
              </Text>
              <Text variant="titleLarge" style={styles.referenceNumber}>
                {qrData.bookingRef || generateReference()}
              </Text>
            </View>

            {/* QR Code Image */}
            <View style={styles.qrImageContainer}>
              {qrData.qrCode ? (
                <Image
                  source={{ uri: qrData.qrCode }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Ionicons name="qr-code" size={120} color={COLORS.border} />
                </View>
              )}
            </View>

            {/* Helper Text */}
            <View style={styles.helperContainer}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={COLORS.textSecondary}
              />
              <Text variant="bodySmall" style={styles.helperText}>
                Present this QR code to the salon staff when you arrive for your appointment
              </Text>
            </View>

            {/* Manual Check-in Code */}
            {bookingData?.checkinCode && (
              <View style={styles.manualCodeContainer}>
                <Text variant="bodySmall" style={styles.manualCodeLabel}>
                  Can't scan? Share this code:
                </Text>
                <TouchableOpacity 
                  style={styles.codeRow}
                  onPress={() => copyToClipboard(bookingData.checkinCode || '')}
                  activeOpacity={0.7}
                >
                  <Text variant="headlineMedium" style={styles.manualCode}>
                    {bookingData.checkinCode}
                  </Text>
                  <Ionicons name="copy-outline" size={24} color={COLORS.primaryGreen} />
                </TouchableOpacity>
                <Text variant="bodySmall" style={styles.tapToCopy}>
                  Tap to show code
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Instructions Card */}
        <Card style={styles.instructionsCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.instructionsTitle}>
              How to use
            </Text>
            
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>1</Text>
              </View>
              <Text variant="bodyMedium" style={styles.instructionText}>
                Arrive at the salon 5-10 minutes before your appointment
              </Text>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>2</Text>
              </View>
              <Text variant="bodyMedium" style={styles.instructionText}>
                Show this QR code to the receptionist or your stylist
              </Text>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>3</Text>
              </View>
              <Text variant="bodyMedium" style={styles.instructionText}>
                They will scan it to confirm your arrival and start your service
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Done Button */}
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.doneButton}
          contentStyle={styles.doneButtonContent}
        >
          Done
        </Button>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    marginTop: 16,
    color: COLORS.accentRed,
    marginBottom: 8,
  },
  errorSubtitle: {
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  qrCard: {
    borderRadius: 20,
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 16,
  },
  qrCardContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  referenceContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  referenceLabel: {
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  referenceNumber: {
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    letterSpacing: 2,
  },
  qrImageContainer: {
    width: 240,
    height: 240,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  qrPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primaryGreen}10`,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  helperText: {
    flex: 1,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  // Manual Code Section
  manualCodeContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  manualCodeLabel: {
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: `${COLORS.primaryGreen}10`,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  manualCode: {
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    letterSpacing: 3,
  },
  tapToCopy: {
    color: COLORS.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  instructionsCard: {
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionNumberText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  instructionText: {
    flex: 1,
    color: COLORS.textPrimary,
    lineHeight: 22,
    paddingTop: 2,
  },
  doneButton: {
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
    marginTop: 8,
  },
  doneButtonContent: {
    paddingVertical: 14,
  },
  bottomPadding: {
    height: 40,
  },
});

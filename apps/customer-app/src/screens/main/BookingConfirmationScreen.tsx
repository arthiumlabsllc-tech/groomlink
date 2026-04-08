import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Divider,
  ActivityIndicator,
  Avatar,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { bookingApi } from '../../api/booking';
import { MainStackParamList } from '../../types/navigation';

type BookingConfirmationRouteProp = RouteProp<MainStackParamList, 'BookingConfirmation'>;

export default function BookingConfirmationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<BookingConfirmationRouteProp>();
  const { bookingId } = route.params;

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingApi.getBookingById(bookingId),
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const generateReference = () => {
    return `GLK-${bookingId.substring(0, 8).toUpperCase()}`;
  };

  const handleShare = async () => {
    if (!booking) return;
    
    try {
      const message = `My GroomLink Booking\n\n` +
        `Salon: ${booking.salon.businessName}\n` +
        `Date: ${formatDate(booking.scheduledDate)}\n` +
        `Time: ${formatTime(booking.scheduledTime)}\n` +
        `Reference: ${generateReference()}`;
      
      await Share.share({
        message,
        title: 'GroomLink Booking',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#006B3F" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#CE1126" />
          <Text variant="titleMedium" style={styles.errorTitle}>Failed to load booking</Text>
          <Button mode="contained" onPress={() => navigation.goBack()} style={styles.backButton}>
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
        {/* Success Animation/Icon */}
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#006B3F" />
          </View>
          <Text variant="headlineSmall" style={styles.successTitle}>
            Booking Confirmed!
          </Text>
          <Text variant="bodyMedium" style={styles.successSubtitle}>
            Your appointment has been successfully booked
          </Text>
        </View>

        {/* Reference Number */}
        <Card style={styles.referenceCard}>
          <Card.Content style={styles.referenceContent}>
            <Text variant="labelMedium" style={styles.referenceLabel}>Booking Reference</Text>
            <Text variant="headlineMedium" style={styles.referenceNumber}>
              {generateReference()}
            </Text>
            <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
              <Ionicons name="share-outline" size={20} color="#006B3F" />
              <Text variant="bodyMedium" style={styles.shareText}>Share</Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Booking Summary */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Booking Details</Text>
            
            {/* Salon Info */}
            <View style={styles.summaryRow}>
              <Ionicons name="storefront-outline" size={22} color="#666" />
              <View style={styles.summaryItemContent}>
                <Text variant="bodySmall" style={styles.summaryLabel}>Salon</Text>
                <Text variant="bodyLarge" style={styles.summaryValue}>
                  {booking.salon.businessName}
                </Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Services */}
            <View style={styles.summaryRow}>
              <Ionicons name="cut-outline" size={22} color="#666" />
              <View style={styles.summaryItemContent}>
                <Text variant="bodySmall" style={styles.summaryLabel}>Services</Text>
                {booking.services.map((service: any, index: number) => (
                  <Text key={service.id} variant="bodyMedium" style={styles.serviceText}>
                    {service.name}
                  </Text>
                ))}
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Date */}
            <View style={styles.summaryRow}>
              <Ionicons name="calendar-outline" size={22} color="#666" />
              <View style={styles.summaryItemContent}>
                <Text variant="bodySmall" style={styles.summaryLabel}>Date</Text>
                <Text variant="bodyLarge" style={styles.summaryValue}>
                  {formatDate(booking.scheduledDate)}
                </Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Time */}
            <View style={styles.summaryRow}>
              <Ionicons name="time-outline" size={22} color="#666" />
              <View style={styles.summaryItemContent}>
                <Text variant="bodySmall" style={styles.summaryLabel}>Time</Text>
                <Text variant="bodyLarge" style={styles.summaryValue}>
                  {formatTime(booking.scheduledTime)}
                </Text>
              </View>
            </View>

            {booking.worker && (
              <>
                <Divider style={styles.divider} />
                
                {/* Stylist */}
                <View style={styles.summaryRow}>
                  <Ionicons name="person-outline" size={22} color="#666" />
                  <View style={styles.summaryItemContent}>
                    <Text variant="bodySmall" style={styles.summaryLabel}>Stylist</Text>
                    <Text variant="bodyLarge" style={styles.summaryValue}>
                      {booking.worker.name}
                    </Text>
                  </View>
                </View>
              </>
            )}

            <Divider style={styles.divider} />

            {/* Total */}
            <View style={styles.summaryRow}>
              <Ionicons name="wallet-outline" size={22} color="#666" />
              <View style={styles.summaryItemContent}>
                <Text variant="bodySmall" style={styles.summaryLabel}>Total</Text>
                <Text variant="titleLarge" style={styles.totalAmount}>
                  GH₵ {booking.totalAmount.toFixed(2)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Location Info */}
        <Card style={styles.locationCard}>
          <Card.Content style={styles.locationContent}>
            <View style={styles.locationRow}>
              <View style={styles.locationInfo}>
                <Ionicons name="location-outline" size={22} color="#666" />
                <View style={styles.locationText}>
                  <Text variant="bodySmall" style={styles.summaryLabel}>Address</Text>
                  <Text variant="bodyMedium">{booking.salon.address}</Text>
                  <Text variant="bodyMedium">{booking.salon.city}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.directionsButton}>
                <Ionicons name="navigate" size={20} color="#006B3F" />
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Bookings')}
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}
        >
          View My Bookings
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('HomeMain')}
          style={styles.secondaryButton}
          contentStyle={styles.buttonContent}
          textColor="#006B3F"
        >
          Back to Home
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    marginTop: 16,
    color: '#CE1126',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#006B3F',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 200,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontWeight: 'bold',
    color: '#006B3F',
    marginBottom: 8,
  },
  successSubtitle: {
    color: '#666',
    textAlign: 'center',
  },
  referenceCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#006B3F',
  },
  referenceContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  referenceLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  referenceNumber: {
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
  },
  shareText: {
    color: '#FCD116',
    marginLeft: 4,
  },
  summaryCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
    color: '#006B3F',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  summaryItemContent: {
    marginLeft: 12,
    flex: 1,
  },
  summaryLabel: {
    color: '#888',
  },
  summaryValue: {
    fontWeight: '500',
    marginTop: 2,
  },
  serviceText: {
    marginTop: 4,
  },
  divider: {
    marginVertical: 4,
  },
  totalAmount: {
    fontWeight: 'bold',
    color: '#006B3F',
    marginTop: 2,
  },
  locationCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  locationContent: {
    padding: 16,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  locationText: {
    marginLeft: 12,
  },
  directionsButton: {
    padding: 12,
    backgroundColor: '#E8F5EE',
    borderRadius: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  primaryButton: {
    backgroundColor: '#006B3F',
    marginBottom: 12,
    borderRadius: 8,
  },
  secondaryButton: {
    borderColor: '#006B3F',
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});

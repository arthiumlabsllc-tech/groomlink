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

  const generateGroupReference = () => {
    return booking.groupReference || `GRP-${bookingId.substring(0, 8).toUpperCase()}`;
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
          <ActivityIndicator size="large" color={COLORS.primaryGreen} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.accentRed} />
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
        {/* Success Section */}
        <View style={styles.successContainer}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={48} color="#fff" />
          </View>
          <Text variant="headlineSmall" style={styles.successTitle}>
            Booking Confirmed!
          </Text>
          <Text variant="bodyMedium" style={styles.successSubtitle}>
            {booking.isGroupBooking 
              ? `${booking.totalPeople || 1} ${booking.totalPeople === 1 ? 'person has' : 'people have'} been successfully booked`
              : 'Your appointment has been successfully booked'
            }
          </Text>
          {booking.isGroupBooking && (
            <View style={styles.groupBookingBadge}>
              <Ionicons name="people" size={16} color="#fff" />
              <Text style={styles.groupBookingBadgeText}>Group Booking</Text>
            </View>
          )}
        </View>

        {/* Reference Card */}
        <Card style={styles.referenceCard}>
          <Card.Content style={styles.referenceContent}>
            <Text variant="labelMedium" style={styles.referenceLabel}>
              {booking.isGroupBooking ? 'Group Reference' : 'Booking Reference'}
            </Text>
            <Text variant="headlineMedium" style={styles.referenceNumber}>
              {booking.isGroupBooking ? generateGroupReference() : generateReference()}
            </Text>
            <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
              <Ionicons name="share-outline" size={20} color={COLORS.accentGold} />
              <Text variant="bodyMedium" style={styles.shareText}>Share Booking</Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Booking Details Card */}
        <Card style={styles.detailsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Booking Details</Text>
            
            {/* Salon Info */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="storefront-outline" size={20} color={COLORS.primaryGreen} />
              </View>
              <View style={styles.detailContent}>
                <Text variant="bodySmall" style={styles.detailLabel}>Salon</Text>
                <Text variant="bodyLarge" style={styles.detailValue}>
                  {booking.salon.businessName}
                </Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Services */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="cut-outline" size={20} color={COLORS.primaryGreen} />
              </View>
              <View style={styles.detailContent}>
                <Text variant="bodySmall" style={styles.detailLabel}>Services</Text>
                {booking.services.map((service: any) => (
                  <Text key={service.id} variant="bodyMedium" style={styles.serviceText}>
                    {service.name}
                  </Text>
                ))}
              </View>
            </View>

            {/* Guests - for group bookings */}
            {booking.isGroupBooking && booking.guests && booking.guests.length > 0 && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="people-outline" size={20} color={COLORS.primaryGreen} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text variant="bodySmall" style={styles.detailLabel}>
                      Guests ({booking.guests.length})
                    </Text>
                    {booking.guests.map((guest: any, index: number) => {
                      const guestService = guest.service || booking.services.find((s: any) => s.id === guest.serviceId);
                      const staffName = guest.staff?.fullName;
                      return (
                        <View key={guest.id || index} style={styles.guestItem}>
                          <View style={styles.guestHeader}>
                            <Text variant="bodyMedium" style={styles.guestName}>
                              {guest.guestName}
                              {guest.isChild && <Text style={styles.childLabel}> (Child)</Text>}
                            </Text>
                            {guest.checkedIn && (
                              <View style={styles.checkedInBadge}>
                                <Ionicons name="checkmark-circle" size={14} color={COLORS.primaryGreen} />
                                <Text style={styles.checkedInText}>Checked In</Text>
                              </View>
                            )}
                          </View>
                          <Text variant="bodySmall" style={styles.guestService}>
                            {guestService?.name || 'Service'}
                            {staffName && <Text style={styles.staffName}> • {staffName}</Text>}
                          </Text>
                          {guest.specialInstructions && (
                            <Text variant="bodySmall" style={styles.specialInstructions}>
                              Note: {guest.specialInstructions}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            <Divider style={styles.divider} />

            {/* Date */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.primaryGreen} />
              </View>
              <View style={styles.detailContent}>
                <Text variant="bodySmall" style={styles.detailLabel}>Date</Text>
                <Text variant="bodyLarge" style={styles.detailValue}>
                  {formatDate(booking.scheduledDate)}
                </Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Time */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="time-outline" size={20} color={COLORS.primaryGreen} />
              </View>
              <View style={styles.detailContent}>
                <Text variant="bodySmall" style={styles.detailLabel}>Time</Text>
                <Text variant="bodyLarge" style={styles.detailValue}>
                  {formatTime(booking.scheduledTime)}
                </Text>
              </View>
            </View>

            {booking.worker && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="person-outline" size={20} color={COLORS.primaryGreen} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text variant="bodySmall" style={styles.detailLabel}>Stylist</Text>
                    <Text variant="bodyLarge" style={styles.detailValue}>
                      {booking.worker.name}
                    </Text>
                  </View>
                </View>
              </>
            )}

            <Divider style={styles.divider} />

            {/* Total */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="wallet-outline" size={20} color={COLORS.primaryGreen} />
              </View>
              <View style={styles.detailContent}>
                <Text variant="bodySmall" style={styles.detailLabel}>Total Amount</Text>
                <Text variant="titleLarge" style={styles.totalAmount}>
                  GH₵ {booking.totalAmount.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Escrow Info */}
            {booking.escrow && booking.escrow.status === 'HELD' && (
              <View style={styles.escrowInfoContainer}>
                <View style={styles.escrowIconRow}>
                  <Ionicons name="shield-checkmark" size={18} color={COLORS.primaryGreen} />
                  <Text variant="bodyMedium" style={styles.escrowTitle}>Secure Payment</Text>
                </View>
                <Text variant="bodySmall" style={styles.escrowMessage}>
                  Your payment of GH₵ {booking.escrow.amountHeld.toFixed(2)} is held securely until service completion.
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Location Card */}
        <Card style={styles.locationCard}>
          <Card.Content>
            <View style={styles.locationRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="location-outline" size={20} color={COLORS.primaryGreen} />
              </View>
              <View style={styles.locationText}>
                <Text variant="bodySmall" style={styles.detailLabel}>Address</Text>
                <Text variant="bodyMedium" style={styles.detailValue}>{booking.salon.address}</Text>
                <Text variant="bodyMedium" style={styles.detailValue}>{booking.salon.city}</Text>
              </View>
              <TouchableOpacity style={styles.directionsButton}>
                <Ionicons name="navigate" size={20} color="#fff" />
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
          buttonColor={COLORS.primaryGreen}
        >
          View My Bookings
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('HomeMain')}
          style={styles.secondaryButton}
          contentStyle={styles.buttonContent}
          textColor={COLORS.primaryGreen}
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
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
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
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 200,
  },
  // Success Section
  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successTitle: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  successSubtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  groupBookingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    gap: 6,
    marginTop: 12,
  },
  groupBookingBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  // Reference Card
  referenceCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.primaryGreen,
    shadowColor: COLORS.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  referenceContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  referenceLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  referenceNumber: {
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 3,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    gap: 6,
  },
  shareText: {
    color: COLORS.accentGold,
    fontWeight: '600',
  },
  // Details Card
  detailsCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 20,
    color: COLORS.textPrimary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${COLORS.primaryGreen}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  serviceText: {
    marginTop: 4,
    color: COLORS.textPrimary,
  },
  guestItem: {
    marginTop: 8,
    paddingLeft: 4,
  },
  guestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guestName: {
    fontWeight: '500',
    color: COLORS.textPrimary,
    flex: 1,
  },
  childLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  guestService: {
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  staffName: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  specialInstructions: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
    paddingLeft: 4,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.accentGold,
  },
  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primaryGreen}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  checkedInText: {
    fontSize: 11,
    color: COLORS.primaryGreen,
    fontWeight: '500',
  },
  escrowInfoContainer: {
    backgroundColor: `${COLORS.primaryGreen}08`,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: `${COLORS.primaryGreen}20`,
  },
  escrowIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  escrowTitle: {
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },
  escrowMessage: {
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  divider: {
    marginVertical: 4,
    backgroundColor: COLORS.border,
  },
  totalAmount: {
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginTop: 2,
  },
  // Location Card
  locationCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    marginLeft: 12,
    flex: 1,
  },
  directionsButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.cardBackground,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  primaryButton: {
    marginBottom: 12,
    borderRadius: 12,
  },
  secondaryButton: {
    borderColor: COLORS.primaryGreen,
    borderRadius: 12,
    borderWidth: 2,
  },
  buttonContent: {
    paddingVertical: 10,
  },
});

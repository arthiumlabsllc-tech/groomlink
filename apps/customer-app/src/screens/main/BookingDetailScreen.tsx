import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { bookingApi } from '../../api/booking';
import { MainStackParamList } from '../../types/navigation';
import { RefundPreview } from '../../types';

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

type BookingDetailRouteProp = RouteProp<MainStackParamList, 'BookingDetail'>;

export default function BookingDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<BookingDetailRouteProp>();
  const queryClient = useQueryClient();
  const { bookingId } = route.params;

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [groupMembersExpanded, setGroupMembersExpanded] = useState(true);

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingApi.getBookingById(bookingId),
  });

  const { data: refundPreview, isLoading: refundLoading } = useQuery({
    queryKey: ['refund-preview', bookingId],
    queryFn: () => bookingApi.getRefundPreview(bookingId),
    enabled: cancelModalVisible,
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingApi.cancelBooking(bookingId, cancelReason || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      setCancelModalVisible(false);
      Alert.alert('Booking Cancelled', 'Your booking has been cancelled successfully.');
    },
    onError: (error: any) => {
      Alert.alert('Cancellation Failed', error.response?.data?.message || 'Please try again');
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ date, startTime }: { date: string; startTime: string }) =>
      bookingApi.rescheduleBooking(bookingId, date, startTime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      Alert.alert('Booking Rescheduled', 'Your booking has been rescheduled successfully.');
    },
    onError: (error: any) => {
      Alert.alert('Reschedule Failed', error.response?.data?.message || 'Please try again');
    },
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

  const handleCancelPress = () => {
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = () => {
    cancelMutation.mutate();
  };

  const handleReschedulePress = () => {
    Alert.alert(
      'Reschedule Booking',
      'You will be redirected to select a new date and time.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          onPress: () => {
            // Navigate to booking screen with existing details
            navigation.navigate('Booking', {
              salonId: booking?.salon.id,
              workerId: booking?.worker?.id,
              services: booking?.services.map(s => s.id),
            });
          }
        },
      ]
    );
  };

  const canCancel = booking && (booking.status === 'PENDING' || booking.status === 'CONFIRMED');
  const canReschedule = booking && booking.status === 'CONFIRMED';

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'FULL': return COLORS.primaryGreen;
      case 'PARTIAL': return COLORS.accentGold;
      case 'NONE': return COLORS.accentRed;
      default: return COLORS.textSecondary;
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'FULL': return 'Full Refund';
      case 'PARTIAL': return 'Partial Refund';
      case 'NONE': return 'No Refund';
      default: return tier;
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
        {/* Status Header */}
        <View style={[styles.statusHeader, { backgroundColor: `${STATUS_COLORS[booking.status]}15` }]}>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[booking.status] }]} />
          <Text variant="titleMedium" style={[styles.statusText, { color: STATUS_COLORS[booking.status] }]}>
            {STATUS_LABELS[booking.status] || booking.status}
          </Text>
        </View>

        {/* Reference Card */}
        <Card style={styles.referenceCard}>
          <Card.Content style={styles.referenceContent}>
            <Text variant="labelMedium" style={styles.referenceLabel}>Booking Reference</Text>
            <Text variant="headlineMedium" style={styles.referenceNumber}>
              {generateReference()}
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
                  <View key={service.id} style={styles.serviceRow}>
                    <Text variant="bodyMedium" style={styles.serviceText}>
                      {service.name}
                    </Text>
                    <Text variant="bodyMedium" style={styles.servicePrice}>
                      GH₵ {service.price.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Group Members Section - for group bookings */}
            {booking.isGroupBooking && booking.guests && booking.guests.length > 0 && (
              <>
                <Divider style={styles.divider} />
                <TouchableOpacity 
                  style={styles.groupMembersHeader}
                  onPress={() => setGroupMembersExpanded(!groupMembersExpanded)}
                  activeOpacity={0.7}
                >
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="people-outline" size={20} color={COLORS.primaryGreen} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text variant="bodySmall" style={styles.detailLabel}>
                      Group Members ({booking.guests.length})
                    </Text>
                    {booking.totalPeople && (
                      <Text variant="bodySmall" style={styles.groupRefText}>
                        Ref: {booking.groupReference || booking.groupBookingRef}
                      </Text>
                    )}
                  </View>
                  <Ionicons 
                    name={groupMembersExpanded ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={COLORS.textSecondary} 
                  />
                </TouchableOpacity>

                {groupMembersExpanded && (
                  <View style={styles.groupMembersList}>
                    {booking.guests.map((guest: any, index: number) => {
                      const guestService = guest.service || booking.services.find((s: any) => s.id === guest.serviceId);
                      return (
                        <View key={guest.id || index} style={styles.groupMemberCard}>
                          <View style={styles.memberHeader}>
                            <View style={styles.memberAvatar}>
                              <Text style={styles.memberInitial}>
                                {guest.guestName?.charAt(0)?.toUpperCase() || 'G'}
                              </Text>
                            </View>
                            <View style={styles.memberInfo}>
                              <Text variant="bodyMedium" style={styles.memberName}>
                                {guest.guestName}
                                {guest.isChild && <Text style={styles.childBadge}> Child</Text>}
                              </Text>
                              <Text variant="bodySmall" style={styles.memberService}>
                                {guestService?.name || 'Service'}
                              </Text>
                            </View>
                            {guest.checkedIn && (
                              <View style={styles.checkedInBadge}>
                                <Ionicons name="checkmark-circle" size={14} color={COLORS.primaryGreen} />
                                <Text style={styles.checkedInText}>In</Text>
                              </View>
                            )}
                          </View>
                          {guest.staff && (
                            <View style={styles.memberStaffRow}>
                              <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} />
                              <Text variant="bodySmall" style={styles.memberStaffText}>
                                {guest.staff.fullName}
                              </Text>
                            </View>
                          )}
                          {guest.specialInstructions && (
                            <Text variant="bodySmall" style={styles.memberInstructions}>
                              "{guest.specialInstructions}"
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
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

            {/* Payment Status - Escrow Info */}
            {booking.escrow && (
              <View style={styles.escrowCard}>
                <View style={styles.escrowHeader}>
                  <Ionicons name="shield-checkmark" size={18} color={COLORS.primaryGreen} />
                  <Text variant="bodyMedium" style={styles.escrowTitle}>Payment Status</Text>
                </View>
                <View style={styles.escrowDetails}>
                  <View style={styles.escrowRow}>
                    <Text variant="bodySmall" style={styles.escrowLabel}>Status</Text>
                    <View style={[styles.escrowStatusBadge, 
                      booking.escrow.status === 'HELD' && styles.escrowStatusHeld,
                      booking.escrow.status === 'RELEASED' && styles.escrowStatusReleased,
                      booking.escrow.status === 'REFUNDED' && styles.escrowStatusRefunded,
                    ]}>
                      <Text style={[styles.escrowStatusText,
                        booking.escrow.status === 'HELD' && styles.escrowStatusTextHeld,
                        booking.escrow.status === 'RELEASED' && styles.escrowStatusTextReleased,
                        booking.escrow.status === 'REFUNDED' && styles.escrowStatusTextRefunded,
                      ]}>
                        {booking.escrow.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.escrowRow}>
                    <Text variant="bodySmall" style={styles.escrowLabel}>Amount Held</Text>
                    <Text variant="bodyMedium" style={styles.escrowAmount}>
                      GH₵ {booking.escrow.amountHeld.toFixed(2)}
                    </Text>
                  </View>
                  {booking.escrow.status === 'HELD' && (
                    <Text variant="bodySmall" style={styles.escrowNote}>
                      Payment is securely held until service completion
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Cancellation Deadline */}
            {booking.cancellationDeadline && booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' && (
              <View style={styles.deadlineCard}>
                <View style={styles.deadlineHeader}>
                  <Ionicons name="alert-circle-outline" size={16} color={COLORS.accentGold} />
                  <Text variant="bodySmall" style={styles.deadlineTitle}>Cancellation Deadline</Text>
                </View>
                <Text variant="bodyMedium" style={styles.deadlineText}>
                  {formatDate(booking.cancellationDeadline)} at {formatTime(booking.cancellationDeadline.split('T')[1]?.substring(0, 5) || '00:00')}
                </Text>
                {booking.refundPercentage !== undefined && (
                  <Text variant="bodySmall" style={styles.refundHint}>
                    {booking.refundPercentage === 100 
                      ? 'Full refund available' 
                      : booking.refundPercentage > 0 
                        ? `${booking.refundPercentage}% refund available`
                        : 'No refund available'}
                  </Text>
                )}
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

        {/* Notes */}
        {booking.notes && (
          <Card style={styles.notesCard}>
            <Card.Content>
              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="document-text-outline" size={20} color={COLORS.primaryGreen} />
                </View>
                <View style={styles.detailContent}>
                  <Text variant="bodySmall" style={styles.detailLabel}>Notes</Text>
                  <Text variant="bodyMedium" style={styles.detailValue}>{booking.notes}</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {canCancel && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancelPress}
            >
              <Ionicons name="close-circle-outline" size={20} color={COLORS.accentRed} />
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}
          
          {canReschedule && (
            <TouchableOpacity 
              style={styles.rescheduleButton}
              onPress={handleReschedulePress}
            >
              <Ionicons name="calendar-outline" size={20} color={COLORS.primaryGreen} />
              <Text style={styles.rescheduleButtonText}>Reschedule</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Cancel Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={cancelModalVisible}
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={styles.modalTitle}>Cancel Booking</Text>
              <TouchableOpacity 
                onPress={() => setCancelModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {refundLoading ? (
              <View style={styles.refundLoadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primaryGreen} />
                <Text variant="bodyMedium" style={styles.refundLoadingText}>
                  Calculating refund...
                </Text>
              </View>
            ) : refundPreview ? (
              <View style={styles.refundPreviewContainer}>
                <View style={[styles.tierBadge, { backgroundColor: `${getTierColor(refundPreview.tier)}20` }]}>
                  <Text style={[styles.tierText, { color: getTierColor(refundPreview.tier) }]}>
                    {getTierLabel(refundPreview.tier)}
                  </Text>
                </View>
                
                <View style={styles.refundDetails}>
                  <View style={styles.refundRow}>
                    <Text variant="bodyMedium" style={styles.refundLabel}>Refund Amount</Text>
                    <Text variant="titleMedium" style={[styles.refundValue, { color: getTierColor(refundPreview.tier) }]}>
                      GH₵ {refundPreview.refundAmount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.refundRow}>
                    <Text variant="bodySmall" style={styles.refundSubLabel}>Refund Percentage</Text>
                    <Text variant="bodySmall" style={styles.refundSubValue}>
                      {refundPreview.refundPercentage}%
                    </Text>
                  </View>
                  <View style={styles.refundRow}>
                    <Text variant="bodySmall" style={styles.refundSubLabel}>Hours Until Booking</Text>
                    <Text variant="bodySmall" style={styles.refundSubValue}>
                      {Math.round(refundPreview.hoursUntilBooking)}h
                    </Text>
                  </View>
                </View>

                <Divider style={styles.modalDivider} />

                <Text variant="bodySmall" style={styles.reasonLabel}>
                  Reason for cancellation (optional)
                </Text>
                <TextInput
                  style={styles.reasonInput}
                  multiline
                  numberOfLines={3}
                  placeholder="Tell us why you're cancelling..."
                  value={cancelReason}
                  onChangeText={setCancelReason}
                />

                <Button
                  mode="contained"
                  onPress={handleConfirmCancel}
                  loading={cancelMutation.isPending}
                  disabled={cancelMutation.isPending}
                  style={[styles.confirmCancelButton, { backgroundColor: COLORS.accentRed }]}
                  contentStyle={styles.confirmCancelButtonContent}
                >
                  {cancelMutation.isPending 
                    ? 'Cancelling...' 
                    : `Confirm Cancellation${refundPreview.refundAmount > 0 ? ` (GH₵ ${refundPreview.refundAmount.toFixed(2)} refund)` : ''}`
                  }
                </Button>
              </View>
            ) : (
              <Text variant="bodyMedium" style={styles.errorText}>
                Failed to load refund preview
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: COLORS.accentGold,
  CONFIRMED: COLORS.primaryGreen,
  IN_PROGRESS: '#2196F3',
  COMPLETED: '#6B7280',
  CANCELLED: COLORS.accentRed,
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

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
  // Status Header
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontWeight: '600',
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
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  serviceText: {
    color: COLORS.textPrimary,
    flex: 1,
  },
  servicePrice: {
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  // Group Members
  groupMembersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  groupRefText: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  groupMembersList: {
    marginTop: 8,
    marginLeft: 52,
  },
  groupMemberCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitial: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  memberInfo: {
    marginLeft: 10,
    flex: 1,
  },
  memberName: {
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  childBadge: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  memberService: {
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primaryGreen}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  checkedInText: {
    fontSize: 11,
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  memberStaffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  memberStaffText: {
    color: COLORS.textSecondary,
  },
  memberInstructions: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.accentGold,
  },
  // Escrow Card
  escrowCard: {
    backgroundColor: `${COLORS.primaryGreen}08`,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: `${COLORS.primaryGreen}20`,
  },
  escrowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  escrowTitle: {
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },
  escrowDetails: {
    gap: 8,
  },
  escrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  escrowLabel: {
    color: COLORS.textSecondary,
  },
  escrowAmount: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  escrowStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  escrowStatusHeld: {
    backgroundColor: `${COLORS.accentGold}20`,
  },
  escrowStatusReleased: {
    backgroundColor: `${COLORS.primaryGreen}20`,
  },
  escrowStatusRefunded: {
    backgroundColor: `${COLORS.accentRed}15`,
  },
  escrowStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  escrowStatusTextHeld: {
    color: '#B8860B',
  },
  escrowStatusTextReleased: {
    color: COLORS.primaryGreen,
  },
  escrowStatusTextRefunded: {
    color: COLORS.accentRed,
  },
  escrowNote: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  // Deadline Card
  deadlineCard: {
    backgroundColor: `${COLORS.accentGold}10`,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: `${COLORS.accentGold}30`,
  },
  deadlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  deadlineTitle: {
    fontWeight: '600',
    color: '#B8860B',
  },
  deadlineText: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  refundHint: {
    color: COLORS.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
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
  // Notes Card
  notesCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.accentRed}10`,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: `${COLORS.accentRed}30`,
    gap: 8,
  },
  cancelButtonText: {
    color: COLORS.accentRed,
    fontWeight: '600',
    fontSize: 15,
  },
  rescheduleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.primaryGreen}10`,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: `${COLORS.primaryGreen}30`,
    gap: 8,
  },
  rescheduleButtonText: {
    color: COLORS.primaryGreen,
    fontWeight: '600',
    fontSize: 15,
  },
  bottomPadding: {
    height: 100,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  modalCloseButton: {
    padding: 4,
  },
  refundLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  refundLoadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
  refundPreviewContainer: {
    gap: 16,
  },
  tierBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tierText: {
    fontWeight: '600',
    fontSize: 14,
  },
  refundDetails: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
  },
  refundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  refundLabel: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  refundValue: {
    fontWeight: 'bold',
  },
  refundSubLabel: {
    color: COLORS.textSecondary,
  },
  refundSubValue: {
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  modalDivider: {
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  reasonLabel: {
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  confirmCancelButton: {
    borderRadius: 12,
    marginTop: 8,
  },
  confirmCancelButtonContent: {
    paddingVertical: 12,
  },
  errorText: {
    color: COLORS.accentRed,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

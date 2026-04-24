import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  Button,
  Chip,
  Surface,
  Divider,
  ActivityIndicator,
  Dialog,
  Portal,
  TextInput,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { bookingsApi, BookingDetail } from '../../api/bookings';
import { MainStackParamList, MainNavigationProp } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';

type BookingDetailRouteProp = RouteProp<MainStackParamList, 'BookingDetail'>;

export default function BookingDetailScreen() {
  const navigation = useNavigation<MainNavigationProp>();
  const route = useRoute<BookingDetailRouteProp>();
  const { bookingId } = route.params;
  const queryClient = useQueryClient();
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Fetch booking details
  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      console.log('[BookingDetail] Fetching booking:', bookingId);
      try {
        const result = await bookingsApi.getBookingById(bookingId);
        console.log('[BookingDetail] Booking loaded successfully:', result?.id);
        return result;
      } catch (err: any) {
        const apiError = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message;
        const statusCode = err?.response?.status;
        console.warn('[BookingDetail] Failed to load booking:', {
          bookingId,
          statusCode,
          apiError,
          fullError: err?.response?.data,
        });
        throw err;
      }
    },
    enabled: !!bookingId,
  });

  // Confirm booking mutation
  const confirmMutation = useMutation({
    mutationFn: () => bookingsApi.confirmBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
      Alert.alert('Success', 'Booking has been confirmed.');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to confirm booking.';
      Alert.alert('Error', msg);
    },
  });

  // Complete booking mutation
  const completeMutation = useMutation({
    mutationFn: () => bookingsApi.completeBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
      Alert.alert('Success', 'Booking has been marked as completed.');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to complete booking.';
      Alert.alert('Error', msg);
    },
  });

  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: (reason: string) => bookingsApi.cancelBooking(bookingId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
      setCancelDialogVisible(false);
      setCancelReason('');
      Alert.alert('Success', 'Booking has been cancelled.');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to cancel booking.';
      Alert.alert('Error', msg);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '#FCD116';
      case 'CONFIRMED':
        return '#006B3F';
      case 'IN_PROGRESS':
        return '#3B82F6';
      case 'COMPLETED':
        return '#10B981';
      case 'CANCELLED':
        return '#EF4444';
      default:
        return '#9CA3AF';
    }
  };

  const getStatusTextColor = (status: string) => {
    return status === 'PENDING' ? '#111827' : '#FFFFFF';
  };

  const formatTime = (time: string) => {
    if (!time || typeof time !== 'string' || !time.includes(':')) return time || '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');
  };

  const handleCancel = () => {
    if (cancelReason.trim()) {
      cancelMutation.mutate(cancelReason.trim());
    }
  };

  const handleComplete = () => {
    Alert.alert(
      'Mark Service Complete',
      'Are you sure you want to mark this service as complete? This will trigger the escrow release process.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Complete',
          style: 'default',
          onPress: () => completeMutation.mutate(),
        },
      ]
    );
  };

  const handleCheckIn = () => {
    navigation.navigate('QRScanner', { bookingId });
  };

  const isAppointmentTimePassed = () => {
    if (!booking) return false;
    const appointmentDateTime = new Date(`${booking.date}T${booking.endTime}`);
    return new Date() >= appointmentDateTime;
  };

  const getCompletionMethodLabel = (method: string) => {
    switch (method) {
      case 'MANUAL':
        return 'Manual';
      case 'AUTO':
        return 'Auto';
      case 'QR':
        return 'QR Check-in';
      case 'CUSTOMER':
        return 'Customer Confirmed';
      default:
        return method;
    }
  };

  const getCompletionMethodColor = (method: string) => {
    switch (method) {
      case 'MANUAL':
        return '#3B82F6';
      case 'AUTO':
        return '#8B5CF6';
      case 'QR':
        return '#10B981';
      case 'CUSTOMER':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const renderActionButtons = () => {
    if (!booking) return null;

    switch (booking.status) {
      case 'PENDING':
        return (
          <View style={styles.actionButtons}>
            <Button
              mode="contained"
              onPress={() => confirmMutation.mutate()}
              loading={confirmMutation.isPending}
              disabled={confirmMutation.isPending}
              style={styles.confirmButton}
              buttonColor="#006B3F"
              contentStyle={styles.buttonContent}
              theme={{ roundness: 12 }}
              icon="check"
            >
              Confirm Booking
            </Button>
            <Button
              mode="outlined"
              onPress={() => setCancelDialogVisible(true)}
              style={styles.cancelButton}
              textColor="#CE1126"
              contentStyle={styles.buttonContent}
              theme={{ roundness: 12 }}
              icon="close"
            >
              Decline
            </Button>
          </View>
        );
      case 'CONFIRMED':
        const canComplete = isAppointmentTimePassed();
        return (
          <View style={styles.actionButtons}>
            {/* Check In Button - Show if not checked in */}
            {!booking.checkedIn && (
              <Button
                mode="contained"
                onPress={handleCheckIn}
                style={styles.checkInButton}
                buttonColor="#3B82F6"
                contentStyle={styles.buttonContent}
                theme={{ roundness: 12 }}
                icon="qrcode-scan"
              >
                Check In Customer
              </Button>
            )}
            
            {/* Checked In Status - Show if checked in */}
            {booking.checkedIn && (
              <View style={styles.checkedInNotice}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <View style={styles.checkedInInfo}>
                  <Text style={styles.checkedInText}>Customer Checked In</Text>
                  {booking.queuePosition && (
                    <Text style={styles.queuePositionText}>
                      Queue Position: #{booking.queuePosition}
                    </Text>
                  )}
                  {booking.checkedInAt && (
                    <Text style={styles.checkedInTimeText}>
                      at {format(parseISO(booking.checkedInAt), 'h:mm a')}
                    </Text>
                  )}
                </View>
              </View>
            )}
            
            {canComplete ? (
              <Button
                mode="contained"
                onPress={handleComplete}
                loading={completeMutation.isPending}
                disabled={completeMutation.isPending}
                style={styles.completeButton}
                buttonColor="#10B981"
                contentStyle={styles.buttonContent}
                theme={{ roundness: 12 }}
                icon="check-circle"
              >
                {completeMutation.isPending ? 'Processing...' : 'Mark Service Complete'}
              </Button>
            ) : (
              <View style={styles.waitingNotice}>
                <Ionicons name="time-outline" size={20} color="#6B7280" />
                <Text variant="bodyMedium" style={styles.waitingText}>
                  Completion available after appointment time
                </Text>
              </View>
            )}
            <Button
              mode="outlined"
              onPress={() => setCancelDialogVisible(true)}
              style={styles.cancelButton}
              textColor="#CE1126"
              contentStyle={styles.buttonContent}
              theme={{ roundness: 12 }}
            >
              Cancel Booking
            </Button>
          </View>
        );
      case 'COMPLETED':
        return (
          <View style={styles.completionSection}>
            <View style={styles.readOnlyNotice}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text variant="bodyMedium" style={styles.readOnlyText}>
                This booking has been completed.
              </Text>
            </View>
            {booking.serviceCompleted && (
              <View style={styles.completionDetails}>
                {booking.completionMethod && (
                  <View style={styles.completionDetailRow}>
                    <Text style={styles.completionLabel}>Method</Text>
                    <View style={[styles.methodBadge, { backgroundColor: getCompletionMethodColor(booking.completionMethod) + '20' }]}>
                      <Text style={[styles.methodBadgeText, { color: getCompletionMethodColor(booking.completionMethod) }]}>
                        {getCompletionMethodLabel(booking.completionMethod)}
                      </Text>
                    </View>
                  </View>
                )}
                {booking.serviceCompletedAt && (
                  <View style={styles.completionDetailRow}>
                    <Text style={styles.completionLabel}>Completed At</Text>
                    <Text style={styles.completionValue}>
                      {format(parseISO(booking.serviceCompletedAt), 'MMM d, yyyy h:mm a')}
                    </Text>
                  </View>
                )}
                {booking.customerConfirmed !== undefined && (
                  <View style={styles.completionDetailRow}>
                    <Text style={styles.completionLabel}>Customer Confirmed</Text>
                    <View style={[styles.confirmBadge, { backgroundColor: booking.customerConfirmed ? '#10B98120' : '#6B728020' }]}>
                      <Ionicons 
                        name={booking.customerConfirmed ? 'checkmark-circle' : 'help-circle'} 
                        size={14} 
                        color={booking.customerConfirmed ? '#10B981' : '#6B7280'} 
                      />
                      <Text style={[styles.confirmBadgeText, { color: booking.customerConfirmed ? '#10B981' : '#6B7280' }]}>
                        {booking.customerConfirmed ? 'Yes' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      case 'CANCELLED':
        return (
          <View style={[styles.readOnlyNotice, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="close-circle" size={24} color="#EF4444" />
            <Text variant="bodyMedium" style={[styles.readOnlyText, { color: '#EF4444' }]}>
              This booking has been cancelled.
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006B3F" />
      </View>
    );
  }

  if (error || !booking) {
    const errorMessage = error
      ? (error as any)?.response?.data?.error?.message || (error as any)?.response?.data?.message || (error as any)?.message || 'Failed to load booking details.'
      : !bookingId ? 'No booking ID provided.' : 'Booking not found.';
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
        <Text variant="titleMedium" style={styles.errorText}>
          {errorMessage}
        </Text>
        <View style={styles.errorButtons}>
          <Button
            mode="contained"
            onPress={() => queryClient.invalidateQueries({ queryKey: ['booking', bookingId] })}
            textColor="#FFFFFF"
            buttonColor="#006B3F"
            theme={{ roundness: 10 }}
            style={styles.retryButton}
          >
            Retry
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            textColor="#006B3F"
            theme={{ roundness: 10 }}
          >
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
            <Text style={[styles.statusText, { color: getStatusTextColor(booking.status) }]}>
              {booking.status}
            </Text>
          </View>
        </View>

        {/* Customer Info */}
        <Surface style={styles.section} elevation={0}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color="#006B3F" />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Customer Information
            </Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.customerRow}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {(booking.customer?.firstName?.[0] ?? 'U')}{(booking.customer?.lastName?.[0] ?? '')}
              </Text>
            </View>
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>
                {booking.customer.firstName} {booking.customer.lastName}
              </Text>
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={14} color="#6B7280" />
                <Text style={styles.contactText}>{booking.customer.phoneNumber}</Text>
              </View>
            </View>
          </View>
        </Surface>

        {/* Service Details */}
        <Surface style={styles.section} elevation={0}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cut" size={20} color="#006B3F" />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Service Details
            </Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.serviceItem}>
            <View style={styles.serviceRow}>
              <Text style={styles.serviceName}>{booking.service.name}</Text>
              <Text style={styles.servicePrice}>GH₵{parseFloat(String(booking.service.price)).toLocaleString()}</Text>
            </View>
            <Text style={styles.serviceDuration}>
              <Ionicons name="time-outline" size={14} color="#6B7280" /> {booking.service.duration} minutes
            </Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>GH₵{parseFloat(String(booking.finalAmount || 0)).toLocaleString()}</Text>
          </View>
        </Surface>

        {/* Date & Time */}
        <Surface style={styles.section} elevation={0}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={20} color="#006B3F" />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Appointment Time
            </Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.dateTimeGrid}>
            <View style={styles.dateTimeItem}>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text style={styles.dateTimeLabel}>Date</Text>
              <Text style={styles.dateTimeValue}>{formatDate(booking.date)}</Text>
            </View>
            <View style={styles.dateTimeItem}>
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <Text style={styles.dateTimeLabel}>Time</Text>
              <Text style={styles.dateTimeValue}>
                {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
              </Text>
            </View>
          </View>
          {booking.worker && (
            <View style={styles.workerRow}>
              <Ionicons name="person-outline" size={16} color="#6B7280" />
              <Text style={styles.workerLabel}>Stylist:</Text>
              <Text style={styles.workerName}>{booking.worker.fullName}</Text>
            </View>
          )}
        </Surface>

        {/* Notes */}
        {booking.customerNotes && (
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color="#006B3F" />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Customer Notes
              </Text>
            </View>
            <Divider style={styles.divider} />
            <Text style={styles.notesText}>
              "{booking.customerNotes}"
            </Text>
          </Surface>
        )}

        {/* Payment Status */}
        {booking.payment && (
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="card" size={20} color="#006B3F" />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Payment Status
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Status</Text>
              <Chip
                mode="flat"
                style={[
                  styles.paymentChip,
                  { backgroundColor: booking.payment.status === 'SUCCESS' ? '#10B981' : '#FCD116' },
                ]}
                textStyle={styles.paymentChipText}
              >
                {booking.payment.status}
              </Chip>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Provider</Text>
              <Text style={styles.paymentValue}>{booking.payment.provider}</Text>
            </View>
          </Surface>
        )}

        {/* Escrow Details */}
        {booking.escrow && (
          <Surface style={[styles.section, styles.escrowSection]} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="wallet" size={20} color="#006B3F" />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Escrow Details
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.escrowRow}>
              <Text style={styles.escrowLabel}>Status</Text>
              <Chip
                mode="flat"
                style={[
                  styles.escrowChip,
                  {
                    backgroundColor:
                      booking.escrow.status === 'HELD' ? '#3B82F6' :
                      booking.escrow.status === 'RELEASED' ? '#10B981' :
                      booking.escrow.status === 'REFUNDED' ? '#9CA3AF' :
                      '#6B7280'
                  },
                ]}
                textStyle={styles.escrowChipText}
              >
                {booking.escrow.status}
              </Chip>
            </View>
            <View style={styles.escrowRow}>
              <Text style={styles.escrowLabel}>Amount Held</Text>
              <Text style={styles.escrowValue}>GH₵{parseFloat(String(booking.escrow.amountHeld || 0)).toLocaleString()}</Text>
            </View>
            <View style={styles.escrowRow}>
              <Text style={styles.escrowLabel}>Platform Fee</Text>
              <Text style={styles.escrowDeduction}>- GH₵{parseFloat(String(booking.escrow.platformFee || 0)).toLocaleString()}</Text>
            </View>
            <View style={[styles.escrowRow, styles.escrowTotalRow]}>
              <Text style={styles.escrowTotalLabel}>Your Share</Text>
              <Text style={styles.escrowTotalValue}>GH₵{parseFloat(String(booking.escrow.providerAmount || 0)).toLocaleString()}</Text>
            </View>
            {booking.refundEligible !== undefined && (
              <View style={styles.refundInfo}>
                <Ionicons
                  name={booking.refundEligible ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={booking.refundEligible ? '#10B981' : '#F59E0B'}
                />
                <Text style={[
                  styles.refundText,
                  { color: booking.refundEligible ? '#10B981' : '#F59E0B' }
                ]}>
                  {booking.refundEligible ? 'Eligible for refund' : 'Refund window has passed'}
                </Text>
              </View>
            )}
          </Surface>
        )}

        {/* Group Members */}
        {booking.isGroupBooking && booking.guests && booking.guests.length > 0 && (
          <Surface style={[styles.section, styles.groupSection]} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={20} color="#7C3AED" />
              <Text variant="titleMedium" style={[styles.sectionTitle, styles.groupTitle]}>
                Group Members ({booking.guests.length})
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.guestsList}>
              {booking.guests.map((guest, index) => (
                <View key={guest.id} style={styles.guestCard}>
                  <View style={styles.guestHeader}>
                    <View style={styles.guestNameRow}>
                      <View style={styles.guestNumber}>
                        <Text style={styles.guestNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.guestName}>{guest.guestName}</Text>
                      {guest.isChild && (
                        <Chip mode="flat" style={styles.childChip} textStyle={styles.childChipText}>
                          Child
                        </Chip>
                      )}
                    </View>
                    {guest.checkedIn ? (
                      <View style={styles.checkInBadge}>
                        <Ionicons name="checkmark" size={12} color="#10B981" />
                        <Text style={styles.checkInText}>Checked In</Text>
                      </View>
                    ) : (
                      <View style={styles.pendingBadge}>
                        <Ionicons name="time-outline" size={12} color="#6B7280" />
                        <Text style={styles.pendingText}>Pending</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.guestDetails}>
                    <View style={styles.guestDetailItem}>
                      <Ionicons name="cut-outline" size={14} color="#6B7280" />
                      <Text style={styles.guestDetailText} numberOfLines={1}>
                        {guest.service?.name}
                      </Text>
                    </View>
                    {guest.staff && (
                      <View style={styles.guestDetailItem}>
                        <Ionicons name="person-outline" size={14} color="#6B7280" />
                        <Text style={styles.guestDetailText} numberOfLines={1}>
                          {guest.staff.fullName}
                        </Text>
                      </View>
                    )}
                    {guest.guestPhone && (
                      <View style={styles.guestDetailItem}>
                        <Ionicons name="call-outline" size={14} color="#6B7280" />
                        <Text style={styles.guestDetailText}>{guest.guestPhone}</Text>
                      </View>
                    )}
                    {guest.guestAgeGroup && (
                      <View style={styles.guestDetailItem}>
                        <Text style={styles.guestDetailLabel}>Age:</Text>
                        <Text style={styles.guestDetailText}>{guest.guestAgeGroup}</Text>
                      </View>
                    )}
                  </View>
                  {guest.specialInstructions && (
                    <View style={styles.specialInstructions}>
                      <Text style={styles.specialInstructionsLabel}>Note:</Text>
                      <Text style={styles.specialInstructionsText}>{guest.specialInstructions}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
            {booking.groupBookingRef && (
              <Text style={styles.groupRef}>Group Ref: {booking.groupBookingRef}</Text>
            )}
          </Surface>
        )}

        {/* Review */}
        {booking.review && (() => {
          const review = booking.review!;
          return (
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="star" size={20} color="#FCD116" />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Customer Review
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.ratingRow}>
              <Text style={styles.ratingValue}>{review.rating}</Text>
              <Text style={styles.ratingMax}>/5</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= review.rating ? 'star' : 'star-outline'}
                    size={20}
                    color="#FCD116"
                  />
                ))}
              </View>
            </View>
            {review.comment && (
              <Text style={styles.reviewComment}>
                "{review.comment}"
              </Text>
            )}
          </Surface>
          );
        })()}

        {/* Action Buttons */}
        {renderActionButtons()}
      </ScrollView>

      {/* Cancel Dialog */}
      <Portal>
        <Dialog
          visible={cancelDialogVisible}
          onDismiss={() => setCancelDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Cancel Booking</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              Please provide a reason for cancelling this booking.
            </Text>
            <TextInput
              mode="outlined"
              placeholder="Enter reason..."
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
              style={styles.reasonInput}
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              theme={{ roundness: 10 }}
            />
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              onPress={() => setCancelDialogVisible(false)}
              textColor="#6B7280"
            >
              Go Back
            </Button>
            <Button
              onPress={handleCancel}
              loading={cancelMutation.isPending}
              disabled={cancelMutation.isPending || !cancelReason.trim()}
              textColor="#CE1126"
            >
              Cancel Booking
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  retryButton: {
    minWidth: 100,
  },
  errorText: {
    color: '#6B7280',
    marginBottom: 16,
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#111827',
  },
  divider: {
    marginBottom: 14,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#006B3F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 14,
    color: '#6B7280',
  },
  serviceItem: {
    marginBottom: 10,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceName: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },
  servicePrice: {
    fontSize: 16,
    color: '#006B3F',
    fontWeight: '600',
  },
  serviceDuration: {
    color: '#6B7280',
    fontSize: 13,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
  },
  totalLabel: {
    fontWeight: '600',
    color: '#111827',
    fontSize: 15,
  },
  totalValue: {
    fontWeight: 'bold',
    color: '#006B3F',
    fontSize: 18,
  },
  dateTimeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
  },
  dateTimeLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
    marginBottom: 2,
  },
  dateTimeValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    textAlign: 'center',
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  workerLabel: {
    color: '#6B7280',
  },
  workerName: {
    color: '#111827',
    fontWeight: '500',
  },
  notesText: {
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 22,
    fontSize: 14,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentLabel: {
    color: '#6B7280',
  },
  paymentValue: {
    color: '#111827',
    fontWeight: '500',
  },
  paymentChip: {
    height: 28,
    justifyContent: 'center',
    borderRadius: 6,
  },
  paymentChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FCD116',
  },
  ratingMax: {
    fontSize: 20,
    color: '#6B7280',
    marginRight: 12,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    color: '#374151',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 22,
  },
  actionButtons: {
    marginTop: 16,
    gap: 12,
  },
  confirmButton: {
    borderRadius: 12,
  },
  completeButton: {
    borderRadius: 12,
  },
  cancelButton: {
    borderRadius: 12,
    borderColor: '#CE1126',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  readOnlyNotice: {
    marginTop: 16,
    padding: 20,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  readOnlyText: {
    color: '#10B981',
    fontWeight: '500',
  },
  dialog: {
    borderRadius: 16,
  },
  dialogTitle: {
    fontWeight: '600',
  },
  dialogText: {
    marginBottom: 16,
    color: '#6B7280',
  },
  reasonInput: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
  },
  dialogActions: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  // Escrow styles
  escrowSection: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  escrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  escrowLabel: {
    color: '#6B7280',
    fontSize: 14,
  },
  escrowValue: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 14,
  },
  escrowDeduction: {
    color: '#6B7280',
    fontSize: 14,
  },
  escrowTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#BFDBFE',
    paddingTop: 10,
    marginTop: 6,
  },
  escrowTotalLabel: {
    color: '#1E40AF',
    fontWeight: '600',
    fontSize: 14,
  },
  escrowTotalValue: {
    color: '#1E40AF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  escrowChip: {
    height: 28,
    justifyContent: 'center',
    borderRadius: 6,
  },
  escrowChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  refundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#BFDBFE',
  },
  refundText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Group booking styles
  groupSection: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  groupTitle: {
    color: '#7C3AED',
  },
  guestsList: {
    gap: 10,
  },
  guestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  guestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  guestNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  guestNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E9D5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestNumberText: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: 'bold',
  },
  guestName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  childChip: {
    height: 20,
    backgroundColor: '#FEF3C7',
  },
  childChipText: {
    fontSize: 10,
    color: '#D97706',
  },
  checkInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  checkInText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  guestDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  guestDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: '45%',
  },
  guestDetailLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  guestDetailText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  specialInstructions: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  specialInstructionsLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  specialInstructionsText: {
    fontSize: 13,
    color: '#374151',
    marginTop: 2,
  },
  groupRef: {
    fontSize: 12,
    color: '#7C3AED',
    marginTop: 12,
  },
  // Completion styles
  completionSection: {
    marginTop: 16,
  },
  completionDetails: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  completionDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  completionLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  completionValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  methodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  methodBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  confirmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confirmBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  waitingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 12,
  },
  waitingText: {
    color: '#6B7280',
    fontWeight: '500',
  },
  // Check-in styles
  checkInButton: {
    borderRadius: 12,
  },
  checkedInNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  checkedInInfo: {
    flex: 1,
  },
  checkedInText: {
    color: '#059669',
    fontWeight: '600',
    fontSize: 15,
  },
  queuePositionText: {
    color: '#10B981',
    fontWeight: '500',
    fontSize: 14,
    marginTop: 2,
  },
  checkedInTimeText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
});

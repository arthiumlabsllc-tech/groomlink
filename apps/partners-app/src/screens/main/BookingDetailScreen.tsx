import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
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
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

type BookingDetailRouteProp = RouteProp<MainStackParamList, 'BookingDetail'>;

export default function BookingDetailScreen() {
  const navigation = useNavigation<MainNavigationProp>();
  const route = useRoute<BookingDetailRouteProp>();
  const { bookingId } = route.params;
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
      Alert.alert(
        'Success',
        'Service marked complete. The customer has been notified to confirm — payment will be released when they confirm, or automatically after 48 hours.'
      );
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to complete booking.';
      Alert.alert('Error', msg);
    },
  });

  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: (reason: string) => bookingsApi.cancelBooking(bookingId, reason),
    onSuccess: (responseData: any) => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
      setCancelDialogVisible(false);
      setCancelReason('');
      // Extract refund details from cancelBookingWithRefund response (customer-cancel path)
      const breakdown = responseData?.data?.refundBreakdown;
      if (breakdown) {
        const tierLabel = breakdown.tier === 'FREE' ? 'full' : breakdown.tier === 'PARTIAL' ? 'partial' : 'no';
        const pct = breakdown.refundPercentage ?? 0;
        const amt = breakdown.refundAmount ?? 0;
        Alert.alert(
          'Booking Cancelled',
          `Booking cancelled. Customer will receive ${tierLabel} refund of GH\u20B5${amt.toFixed(2)} (${pct}%).`,
        );
      } else {
        // Provider-cancel path returns { cancellationRecord, penalty }
        Alert.alert('Success', 'Booking has been cancelled. A full refund will be issued to the customer within 3-5 business days.');
      }
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to cancel booking.';
      Alert.alert('Error', msg);
    },
  });

  // One-Click Refund mutation
  const refundMutation = useMutation({
    mutationFn: () => bookingsApi.oneClickRefund(bookingId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
      Alert.alert(
        'Refund Initiated',
        `GH\u20B5${data.refundAmount?.toFixed(2) || '0.00'} will be back in the customer\'s account within 24 hours.`,
        [{ text: 'OK' }]
      );
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to process refund.';
      Alert.alert('Refund Error', msg);
    },
  });

  const handleOneClickRefund = () => {
    Alert.alert(
      'Initiate Refund',
      'This will refund the full amount to the customer\'s original payment method (MoMo or Card).\n\nProceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refund',
          style: 'default',
          onPress: () => refundMutation.mutate(),
        },
      ]
    );
  };

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
      case 'NO_SHOW':
        return '#F59E0B';
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
      'Mark this service as complete? The customer will be notified to confirm completion. Payment is released when the customer confirms, or automatically after 48 hours.',
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

  const handleMarkNoShow = () => {
    Alert.alert(
      'Mark as No-Show',
      'Mark this customer as a no-show? This will affect their account standing and result in zero refund.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark No-Show',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingsApi.markNoShow(booking!.id);
              queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
              queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
              Alert.alert('Success', 'Customer marked as no-show');
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.message || 'Failed to mark no-show');
            }
          },
        },
      ]
    );
  };

  const handleCheckIn = () => {
    navigation.navigate('QRScanner', { bookingId });
  };

  const handleGuestCheckIn = (guestId: string, guestName: string) => {
    Alert.alert(
      'Check In Guest',
      `Confirm that ${guestName} has arrived and is ready for their service?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check In',
          style: 'default',
          onPress: async () => {
            try {
              await bookingsApi.checkInGuest(guestId);
              queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
              queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
              queryClient.invalidateQueries({ queryKey: ['queue'] });
              Alert.alert('Guest Checked In', `${guestName} has been checked in successfully.`);
            } catch (error: any) {
              Alert.alert('Check-in Failed', error.response?.data?.message || 'Failed to check in guest.');
            }
          },
        },
      ]
    );
  };

  const handleGuestNoShow = (guestId: string, guestName: string) => {
    Alert.alert(
      'Mark as No-Show',
      `Mark ${guestName} as no-show? This means they did not arrive for their appointment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark No-Show',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingsApi.markGuestNoShow(guestId);
              queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
              queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
              queryClient.invalidateQueries({ queryKey: ['queue'] });
              Alert.alert('Guest Marked No-Show', `${guestName} has been marked as no-show.`);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to mark guest as no-show.');
            }
          },
        },
      ]
    );
  };

  const isAppointmentTimePassed = () => {
    if (!booking) return false;
    // booking.date can be date-only or a full ISO timestamp — parse it
    // first, then apply the scheduled end time locally. Concatenating
    // `${booking.date}T${booking.endTime}` produced an invalid Date when
    // the API returned a full ISO string, which hid the Complete button
    // forever.
    const base = parseISO(booking.date);
    if (isNaN(base.getTime())) return false;
    const appointmentEnd = new Date(base);
    if (booking.endTime) {
      const [hours, minutes] = booking.endTime.split(':').map(Number);
      appointmentEnd.setHours(hours || 0, minutes || 0, 0, 0);
    } else {
      // No end time available — only allow completion after end of day
      appointmentEnd.setHours(23, 59, 0, 0);
    }
    return new Date() >= appointmentEnd;
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
      case 'IN_PROGRESS': {
        const canComplete = isAppointmentTimePassed();
        const isInProgress = booking.status === 'IN_PROGRESS';
        return (
          <View style={styles.actionButtons}>
            {/* Check In Button - Show if not checked in (confirmed only) */}
            {!isInProgress && !booking.checkedIn && (
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
            {/* Mark as No-Show Button (not once service is in progress) */}
            {!isInProgress && (
              <Button
                mode="outlined"
                onPress={handleMarkNoShow}
                style={styles.noShowButton}
                textColor="#F59E0B"
                contentStyle={styles.buttonContent}
                theme={{ roundness: 12 }}
                icon="account-cancel"
              >
                Mark as No-Show
              </Button>
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
      }
      case 'NO_SHOW':
        return (
          <View style={styles.noShowSection}>
            <View style={[styles.readOnlyNotice, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="warning" size={24} color="#F59E0B" />
              <Text variant="bodyMedium" style={[styles.readOnlyText, { color: '#F59E0B' }]}>
                Customer was marked as no-show
              </Text>
            </View>
            {booking.noShowFlag && (
              <View style={styles.noShowDetails}>
                <Text style={styles.noShowDetailText}>
                  This booking has been flagged as a no-show. No refund will be issued.
                </Text>
              </View>
            )}
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
          <View style={styles.cancelledSection}>
            <View style={[styles.readOnlyNotice, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="close-circle" size={24} color="#EF4444" />
              <Text variant="bodyMedium" style={[styles.readOnlyText, { color: '#EF4444' }]}>
                This booking has been cancelled.
              </Text>
            </View>
            {/* One-Click Refund Button */}
            <Button
              mode="contained"
              onPress={handleOneClickRefund}
              loading={refundMutation.isPending}
              disabled={refundMutation.isPending}
              style={styles.refundButton}
              buttonColor="#006B3F"
              contentStyle={styles.buttonContent}
              theme={{ roundness: 12 }}
              icon="cash-refund"
            >
              {refundMutation.isPending ? 'Processing...' : 'Refund Customer'}
            </Button>
            <Text variant="bodySmall" style={styles.refundHint}>
              Refunds to customer's original payment method (MoMo/Card)
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
              <Text style={styles.escrowLabel}>Service Price</Text>
              <Text style={styles.escrowValue}>GH₵{(parseFloat(String(booking.escrow.amountHeld || 0)) - parseFloat(String(booking.escrow.bookingFee || 0))).toFixed(2)}</Text>
            </View>
            <View style={styles.escrowRow}>
              <Text style={styles.escrowLabel}>Booking Fee (customer)</Text>
              <Text style={styles.escrowDeduction}>GH₵{parseFloat(String(booking.escrow.bookingFee || 0)).toFixed(2)}</Text>
            </View>
            {booking.escrow.commission != null && (
              <View style={styles.escrowRow}>
                <Text style={styles.escrowLabel}>GroomLink Commission (5%)</Text>
                <Text style={styles.escrowDeduction}>- GH₵{parseFloat(String(booking.escrow.commission)).toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.escrowRow, styles.escrowTotalRow]}>
              <Text style={styles.escrowTotalLabel}>Your Earnings</Text>
              <Text style={styles.escrowTotalValue}>GH₵{parseFloat(String(booking.escrow.providerAmount || 0)).toFixed(2)}</Text>
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
              <Ionicons name="people" size={20} color={theme.accent} />
              <Text variant="titleMedium" style={styles.sectionTitle}>
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
                    {(() => {
                      const guestStatus = guest.status || (guest.checkedIn ? 'CHECKED_IN' : 'PENDING');
                      switch (guestStatus) {
                        case 'CHECKED_IN':
                          return (
                            <View style={styles.checkInBadge}>
                              <Ionicons name="checkmark" size={12} color={theme.success} />
                              <Text style={styles.checkInText}>Checked In</Text>
                            </View>
                          );
                        case 'CANCELLED':
                          return (
                            <View style={[styles.checkInBadge, { backgroundColor: '#FEE2E2' }]}>
                              <Ionicons name="close-circle" size={12} color="#EF4444" />
                              <Text style={[styles.checkInText, { color: '#EF4444' }]}>Cancelled</Text>
                            </View>
                          );
                        case 'NO_SHOW':
                          return (
                            <View style={[styles.checkInBadge, { backgroundColor: '#FEF3C7' }]}>
                              <Ionicons name="alert-circle" size={12} color="#F59E0B" />
                              <Text style={[styles.checkInText, { color: '#F59E0B' }]}>No Show</Text>
                            </View>
                          );
                        default: // PENDING
                          return (
                            <View style={styles.guestActionsRow}>
                              <TouchableOpacity
                                style={styles.guestCheckInButton}
                                onPress={() => handleGuestCheckIn(guest.id, guest.guestName)}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
                                <Text style={styles.guestCheckInButtonText}>Check In</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.guestNoShowButton}
                                onPress={() => handleGuestNoShow(guest.id, guest.guestName)}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="alert-circle-outline" size={14} color="#F59E0B" />
                                <Text style={styles.guestNoShowButtonText}>No Show</Text>
                              </TouchableOpacity>
                            </View>
                          );
                      }
                    })()}
                  </View>
                  <View style={styles.guestDetails}>
                    <View style={styles.guestDetailItem}>
                      <Ionicons name="cut-outline" size={14} color={theme.textSecondary} />
                      <Text style={styles.guestDetailText} numberOfLines={1}>
                        {guest.service?.name}
                      </Text>
                    </View>
                    {guest.staff && (
                      <View style={styles.guestDetailItem}>
                        <Ionicons name="person-outline" size={14} color={theme.textSecondary} />
                        <Text style={styles.guestDetailText} numberOfLines={1}>
                          {guest.staff.fullName}
                        </Text>
                      </View>
                    )}
                    {guest.guestPhone && (
                      <View style={styles.guestDetailItem}>
                        <Ionicons name="call-outline" size={14} color={theme.textSecondary} />
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

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
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
    color: theme.textSecondary,
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
    backgroundColor: theme.surface,
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
    color: theme.text,
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
    backgroundColor: theme.accent,
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
    color: theme.text,
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 14,
    color: theme.textSecondary,
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
    color: theme.text,
    fontWeight: '500',
    flex: 1,
  },
  servicePrice: {
    fontSize: 16,
    color: theme.accent,
    fontWeight: '600',
  },
  serviceDuration: {
    color: theme.textSecondary,
    fontSize: 13,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.successBg,
    padding: 12,
    borderRadius: 10,
  },
  totalLabel: {
    fontWeight: '600',
    color: theme.text,
    fontSize: 15,
  },
  totalValue: {
    fontWeight: 'bold',
    color: theme.accent,
    fontSize: 18,
  },
  dateTimeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.background,
    padding: 14,
    borderRadius: 12,
  },
  dateTimeLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 6,
    marginBottom: 2,
  },
  dateTimeValue: {
    fontSize: 14,
    color: theme.text,
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
    color: theme.textSecondary,
  },
  workerName: {
    color: theme.text,
    fontWeight: '500',
  },
  notesText: {
    color: theme.text,
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
    color: theme.textSecondary,
  },
  paymentValue: {
    color: theme.text,
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
    color: theme.textSecondary,
    marginRight: 12,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    color: theme.text,
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
    borderColor: theme.danger,
  },
  buttonContent: {
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  readOnlyNotice: {
    marginTop: 16,
    padding: 20,
    backgroundColor: theme.successBg,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  readOnlyText: {
    color: theme.success,
    fontWeight: '500',
  },
  cancelledSection: {
    marginTop: 16,
  },
  refundButton: {
    marginTop: 16,
  },
  refundHint: {
    textAlign: 'center',
    color: theme.textSecondary,
    marginTop: 8,
  },
  dialog: {
    borderRadius: 16,
  },
  dialogTitle: {
    fontWeight: '600',
  },
  dialogText: {
    marginBottom: 16,
    color: theme.textSecondary,
  },
  reasonInput: {
    marginTop: 4,
    backgroundColor: theme.surface,
  },
  dialogActions: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  // Escrow styles
  escrowSection: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  escrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  escrowLabel: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  escrowValue: {
    color: theme.text,
    fontWeight: '600',
    fontSize: 14,
  },
  escrowDeduction: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  escrowTotalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 10,
    marginTop: 6,
  },
  escrowTotalLabel: {
    color: theme.accent,
    fontWeight: '600',
    fontSize: 14,
  },
  escrowTotalValue: {
    color: theme.accent,
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
    borderTopColor: theme.border,
  },
  refundText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Group booking styles
  groupSection: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  groupTitle: {
    color: theme.accent,
  },
  guestsList: {
    gap: 10,
  },
  guestCard: {
    backgroundColor: theme.background,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
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
    backgroundColor: theme.accentBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestNumberText: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: 'bold',
  },
  guestName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  childChip: {
    height: 20,
    backgroundColor: theme.warningBg,
  },
  childChipText: {
    fontSize: 10,
    color: theme.warning,
  },
  checkInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  checkInText: {
    fontSize: 11,
    color: theme.success,
    fontWeight: '500',
  },
  guestCheckInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  guestCheckInButtonText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  guestActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guestNoShowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  guestNoShowButtonText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 11,
    color: theme.textSecondary,
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
    color: theme.textSecondary,
  },
  guestDetailText: {
    fontSize: 13,
    color: theme.text,
    flex: 1,
  },
  specialInstructions: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  specialInstructionsLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  specialInstructionsText: {
    fontSize: 13,
    color: theme.text,
    marginTop: 2,
  },
  groupRef: {
    fontSize: 12,
    color: '#7C3AED',
    marginTop: 12,
  },
  noShowButton: {
    borderRadius: 12,
    borderColor: '#F59E0B',
  },
  noShowSection: {
    marginTop: 16,
  },
  noShowDetails: {
    marginTop: 12,
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  noShowDetailText: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 20,
  },
  // Completion styles
  completionSection: {
    marginTop: 16,
  },
  completionDetails: {
    marginTop: 12,
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.successBg,
  },
  completionDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  completionLabel: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  completionValue: {
    fontSize: 13,
    color: theme.text,
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
    backgroundColor: theme.surfaceVariant,
    padding: 14,
    borderRadius: 12,
  },
  waitingText: {
    color: theme.textSecondary,
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
    backgroundColor: theme.successBg,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.successBg,
  },
  checkedInInfo: {
    flex: 1,
  },
  checkedInText: {
    color: theme.success,
    fontWeight: '600',
    fontSize: 15,
  },
  queuePositionText: {
    color: theme.success,
    fontWeight: '500',
    fontSize: 14,
    marginTop: 2,
  },
  checkedInTimeText: {
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});

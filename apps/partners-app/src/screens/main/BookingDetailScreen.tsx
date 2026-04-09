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
import { MainStackParamList } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';

type BookingDetailRouteProp = RouteProp<MainStackParamList, 'BookingDetail'>;

export default function BookingDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<BookingDetailRouteProp>();
  const { bookingId } = route.params;
  const queryClient = useQueryClient();
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Fetch booking details
  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsApi.getBookingById(bookingId),
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
      Alert.alert('Error', error.response?.data?.message || 'Failed to confirm booking.');
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
      Alert.alert('Error', error.response?.data?.message || 'Failed to complete booking.');
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
      Alert.alert('Error', error.response?.data?.message || 'Failed to cancel booking.');
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
        return (
          <View style={styles.actionButtons}>
            <Button
              mode="contained"
              onPress={() => completeMutation.mutate()}
              loading={completeMutation.isPending}
              disabled={completeMutation.isPending}
              style={styles.completeButton}
              buttonColor="#10B981"
              contentStyle={styles.buttonContent}
              theme={{ roundness: 12 }}
              icon="check-circle"
            >
              Mark Complete
            </Button>
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
          <View style={styles.readOnlyNotice}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text variant="bodyMedium" style={styles.readOnlyText}>
              This booking has been completed.
            </Text>
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
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
        <Text variant="titleMedium" style={styles.errorText}>
          Failed to load booking details.
        </Text>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          textColor="#006B3F"
          theme={{ roundness: 10 }}
        >
          Go Back
        </Button>
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
                {booking.customer.firstName[0]}{booking.customer.lastName[0]}
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
              <Text style={styles.servicePrice}>GH₵{booking.service.price.toLocaleString()}</Text>
            </View>
            <Text style={styles.serviceDuration}>
              <Ionicons name="time-outline" size={14} color="#6B7280" /> {booking.service.duration} minutes
            </Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>GH₵{booking.finalAmount.toLocaleString()}</Text>
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

        {/* Review */}
        {booking.review && (
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="star" size={20} color="#FCD116" />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Customer Review
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.ratingRow}>
              <Text style={styles.ratingValue}>{booking.review.rating}</Text>
              <Text style={styles.ratingMax}>/5</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= booking.review.rating ? 'star' : 'star-outline'}
                    size={20}
                    color="#FCD116"
                  />
                ))}
              </View>
            </View>
            {booking.review.comment && (
              <Text style={styles.reviewComment}>
                "{booking.review.comment}"
              </Text>
            )}
          </Surface>
        )}

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
  errorText: {
    color: '#6B7280',
    marginBottom: 16,
    marginTop: 12,
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
});

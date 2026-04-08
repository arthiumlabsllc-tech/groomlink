import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
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
            >
              Confirm Booking
            </Button>
            <Button
              mode="outlined"
              onPress={() => setCancelDialogVisible(true)}
              style={styles.cancelButton}
              textColor="#EF4444"
              contentStyle={styles.buttonContent}
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
            >
              Mark Complete
            </Button>
            <Button
              mode="outlined"
              onPress={() => setCancelDialogVisible(true)}
              style={styles.cancelButton}
              textColor="#EF4444"
              contentStyle={styles.buttonContent}
            >
              Cancel Booking
            </Button>
          </View>
        );
      case 'COMPLETED':
        return (
          <View style={styles.readOnlyNotice}>
            <Text variant="bodyMedium" style={styles.readOnlyText}>
              This booking has been completed.
            </Text>
          </View>
        );
      case 'CANCELLED':
        return (
          <View style={styles.readOnlyNotice}>
            <Text variant="bodyMedium" style={styles.readOnlyText}>
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
        <Text variant="titleMedium" style={styles.errorText}>
          Failed to load booking details.
        </Text>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          textColor="#006B3F"
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
          <Chip
            mode="flat"
            style={[styles.statusChip, { backgroundColor: getStatusColor(booking.status) }]}
            textStyle={styles.statusText}
          >
            {booking.status}
          </Chip>
        </View>

        {/* Customer Info */}
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Customer Information
          </Text>
          <Divider style={styles.divider} />
          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.infoLabel}>Name:</Text>
            <Text variant="bodyMedium" style={styles.infoValue}>
              {booking.customer.firstName} {booking.customer.lastName}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.infoLabel}>Phone:</Text>
            <Text variant="bodyMedium" style={styles.infoValue}>
              {booking.customer.phoneNumber}
            </Text>
          </View>
        </Surface>

        {/* Service Details */}
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Service Details
          </Text>
          <Divider style={styles.divider} />
          <View style={styles.serviceItem}>
            <View style={styles.serviceRow}>
              <Text variant="bodyLarge" style={styles.serviceName}>
                {booking.service.name}
              </Text>
              <Text variant="bodyLarge" style={styles.servicePrice}>
                GH₵{booking.service.price.toLocaleString()}
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.serviceDuration}>
              Duration: {booking.service.duration} minutes
            </Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.totalRow}>
            <Text variant="titleMedium" style={styles.totalLabel}>Total:</Text>
            <Text variant="titleMedium" style={styles.totalValue}>
              GH₵{booking.finalAmount.toLocaleString()}
            </Text>
          </View>
        </Surface>

        {/* Date & Time */}
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Appointment Time
          </Text>
          <Divider style={styles.divider} />
          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.infoLabel}>Date:</Text>
            <Text variant="bodyMedium" style={styles.infoValue}>
              {formatDate(booking.date)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.infoLabel}>Time:</Text>
            <Text variant="bodyMedium" style={styles.infoValue}>
              {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
            </Text>
          </View>
          {booking.worker && (
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Stylist:</Text>
              <Text variant="bodyMedium" style={styles.infoValue}>
                {booking.worker.fullName}
              </Text>
            </View>
          )}
        </Surface>

        {/* Notes */}
        {booking.customerNotes && (
          <Surface style={styles.section} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Customer Notes
            </Text>
            <Divider style={styles.divider} />
            <Text variant="bodyMedium" style={styles.notesText}>
              {booking.customerNotes}
            </Text>
          </Surface>
        )}

        {/* Payment Status */}
        {booking.payment && (
          <Surface style={styles.section} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Payment Status
            </Text>
            <Divider style={styles.divider} />
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Status:</Text>
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
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Provider:</Text>
              <Text variant="bodyMedium" style={styles.infoValue}>
                {booking.payment.provider}
              </Text>
            </View>
          </Surface>
        )}

        {/* Review */}
        {booking.review && (
          <Surface style={styles.section} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Customer Review
            </Text>
            <Divider style={styles.divider} />
            <View style={styles.ratingRow}>
              <Text variant="headlineMedium" style={styles.ratingValue}>
                {booking.review.rating}
              </Text>
              <Text variant="bodyMedium" style={styles.ratingMax}>/5</Text>
            </View>
            {booking.review.comment && (
              <Text variant="bodyMedium" style={styles.reviewComment}>
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
        >
          <Dialog.Title>Cancel Booking</Dialog.Title>
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
            />
          </Dialog.Content>
          <Dialog.Actions>
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
              textColor="#EF4444"
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
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusChip: {
    height: 36,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    color: '#6B7280',
  },
  infoValue: {
    color: '#111827',
    fontWeight: '500',
  },
  serviceItem: {
    marginBottom: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceName: {
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },
  servicePrice: {
    color: '#006B3F',
    fontWeight: '600',
  },
  serviceDuration: {
    color: '#6B7280',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontWeight: 'bold',
    color: '#111827',
  },
  totalValue: {
    fontWeight: 'bold',
    color: '#006B3F',
  },
  notesText: {
    color: '#374151',
    fontStyle: 'italic',
  },
  paymentChip: {
    height: 28,
    justifyContent: 'center',
  },
  paymentChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  ratingValue: {
    fontWeight: 'bold',
    color: '#FCD116',
  },
  ratingMax: {
    color: '#6B7280',
  },
  reviewComment: {
    color: '#374151',
    fontStyle: 'italic',
    marginTop: 8,
  },
  actionButtons: {
    marginTop: 16,
    gap: 12,
  },
  confirmButton: {
    borderRadius: 8,
  },
  completeButton: {
    borderRadius: 8,
  },
  cancelButton: {
    borderRadius: 8,
    borderColor: '#EF4444',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  readOnlyNotice: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  readOnlyText: {
    color: '#6B7280',
  },
  dialogText: {
    marginBottom: 12,
  },
  reasonInput: {
    marginTop: 8,
  },
});

import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { RefundPreview, QueuePositionResponse } from '../../types';
import { autoCheckinService } from '../../services/AutoCheckinService';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

// Design System Colors - theme-aware factory
const createColors = (t: AppTheme) => ({
  primaryGreen: '#006B3F',
  accentGold: '#FCD116',
  accentRed: '#CE1126',
  dark: '#1a1a2e',
  background: t.background,
  cardBackground: t.surface,
  textPrimary: t.text,
  textSecondary: t.textSecondary,
  border: t.border,
});

type BookingDetailRouteProp = RouteProp<MainStackParamList, 'BookingDetail'>;

export default function BookingDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<BookingDetailRouteProp>();
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { bookingId } = route.params;

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [groupMembersExpanded, setGroupMembersExpanded] = useState(true);
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [autoCheckinLoading, setAutoCheckinLoading] = useState(false);

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingApi.getBookingById(bookingId),
  });

  // Fetch queue position for confirmed bookings
  const { data: queuePositionData } = useQuery({
    queryKey: ['queue-position', bookingId],
    queryFn: () => bookingApi.getQueuePosition(bookingId),
    enabled: booking?.status === 'CONFIRMED',
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

  const confirmCompletionMutation = useMutation({
    mutationFn: () => bookingApi.confirmCompletion(bookingId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      Alert.alert(
        'Service Confirmed',
        'Payment has been released to the salon. Thank you!',
        [
          {
            text: 'Rate Now',
            onPress: () => navigation.navigate('RateBooking', { bookingId }),
          },
          {
            text: 'Later',
            style: 'cancel',
          },
        ]
      );
    },
    onError: (error: any) => {
      Alert.alert('Confirmation Failed', error.response?.data?.message || 'Please try again');
    },
  });

  const raiseDisputeMutation = useMutation({
    mutationFn: (reason: string) => bookingApi.raiseDispute(bookingId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      setDisputeModalVisible(false);
      setDisputeReason('');
      Alert.alert(
        'Dispute Raised',
        'Your dispute has been submitted. Our team will review it shortly.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    },
    onError: (error: any) => {
      Alert.alert('Dispute Failed', error.response?.data?.message || 'Please try again');
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

  const formatTime = (time: string | undefined | null) => {
    if (!time) return 'N/A';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    const [hours, minutes] = parts;
    const hour = parseInt(hours);
    if (isNaN(hour)) return time;
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
        `Date: ${formatDate(booking.scheduledDate || booking.date || '')}\n` +
        `Time: ${formatTime(booking.scheduledTime || booking.startTime)}\n` +
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
              services: booking?.services?.map(s => s.id) || ((booking as any)?.service ? [(booking as any).service.id] : []),
            });
          }
        },
      ]
    );
  };

  const canCancel = booking && (booking.status === 'PENDING' || booking.status === 'CONFIRMED');
  const canReschedule = booking && booking.status === 'CONFIRMED';

  // Check if booking needs customer completion confirmation
  // After new flow: salon marks service done (status=COMPLETED, serviceCompleted=true)
  // but escrow is held until customer confirms
  const needsCompletionConfirmation = booking && 
    booking.status === 'COMPLETED' && 
    booking.serviceCompleted &&
    !booking.customerConfirmed &&
    !booking.disputeRaised;

  // Check if booking is confirmed and upcoming (for QR code)
  const isPastBooking = booking && new Date(booking.scheduledDate || booking.date || '') < new Date();
  const isUpcomingConfirmed = booking && 
    booking.status === 'CONFIRMED' && 
    !isPastBooking;

  const handleConfirmCompletion = () => {
    Alert.alert(
      'Confirm Service Completion',
      'Are you sure your service was completed satisfactorily? This will release payment to the provider.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Confirm', 
          onPress: () => confirmCompletionMutation.mutate(),
          style: 'default',
        },
      ]
    );
  };

  const handleRaiseDispute = () => {
    setDisputeModalVisible(true);
  };

  const handleSubmitDispute = () => {
    if (!disputeReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the dispute');
      return;
    }
    raiseDisputeMutation.mutate(disputeReason);
  };

  const handleShowQRCode = () => {
    navigation.navigate('BookingQRCode', { bookingId });
  };

  const handleAutoCheckIn = async () => {
    if (!booking) return;
    
    setAutoCheckinLoading(true);
    try {
      const result = await autoCheckinService.performAutoCheckIn(booking);
      if (result.success) {
        Alert.alert(
          'Checked In!',
          result.message,
          [
            {
              text: 'OK',
              onPress: () => {
                queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
                queryClient.invalidateQueries({ queryKey: ['bookings'] });
                queryClient.invalidateQueries({ queryKey: ['queue-position', bookingId] });
              },
            },
          ]
        );
      } else {
        Alert.alert('Check-In Failed', result.message);
      }
    } catch (error: any) {
      Alert.alert('Check-In Failed', error.message || 'Please try again or check in with salon staff.');
    } finally {
      setAutoCheckinLoading(false);
    }
  };

  const getCompletionMethodLabel = (method?: string) => {
    switch (method) {
      case 'QR_CHECKIN': return 'QR Code Check-in';
      case 'CUSTOMER_CONFIRMED': return 'Customer Confirmed';
      case 'AUTO_COMPLETED': return 'Auto-completed';
      case 'PROVIDER_MARKED': return 'Provider Marked';
      default: return method || 'Unknown';
    }
  };

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

        {/* Queue Position Card - for confirmed bookings */}
        {booking.status === 'CONFIRMED' && queuePositionData && (
          <Card style={styles.queueCard}>
            <Card.Content style={styles.queueCardContent}>
              {queuePositionData.queuePosition !== null && (
                <View style={styles.queuePositionSection}>
                  <Text variant="labelSmall" style={styles.queuePositionLabel}>Your Position</Text>
                  <View style={styles.queuePositionBadge}>
                    <Text style={styles.queuePositionNumber}>#{queuePositionData.queuePosition}</Text>
                  </View>
                </View>
              )}
              <View style={styles.queueInfoSection}>
                <View style={styles.queueInfoRow}>
                  <Ionicons 
                    name={queuePositionData.checkedIn ? "checkmark-circle" : "ellipse-outline"} 
                    size={18} 
                    color={queuePositionData.checkedIn ? COLORS.primaryGreen : COLORS.textSecondary} 
                  />
                  <Text variant="bodyMedium" style={[
                    styles.queueInfoText,
                    queuePositionData.checkedIn && { color: COLORS.primaryGreen, fontWeight: '600' }
                  ]}>
                    {queuePositionData.checkedIn ? 'Checked In' : 'Not Checked In'}
                  </Text>
                </View>
                {queuePositionData.checkedIn && queuePositionData.estimatedWaitMinutes && (
                  <View style={styles.queueInfoRow}>
                    <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
                    <Text variant="bodyMedium" style={styles.queueInfoText}>
                      Est. wait: ~{queuePositionData.estimatedWaitMinutes} min
                    </Text>
                  </View>
                )}
                {!queuePositionData.checkedIn && queuePositionData.peopleAhead !== undefined && queuePositionData.peopleAhead > 0 && (
                  <View style={styles.queueInfoRow}>
                    <Ionicons name="people-outline" size={18} color={COLORS.textSecondary} />
                    <Text variant="bodyMedium" style={styles.queueInfoText}>
                      {queuePositionData.peopleAhead} people ahead
                    </Text>
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Auto Check-In Button - for confirmed bookings not yet checked in */}
        {booking.status === 'CONFIRMED' && queuePositionData && !queuePositionData.checkedIn && (
          <Card style={styles.autoCheckinCard}>
            <Card.Content>
              <TouchableOpacity
                style={styles.autoCheckinButton}
                onPress={handleAutoCheckIn}
                disabled={autoCheckinLoading}
              >
                {autoCheckinLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <View style={styles.autoCheckinIconContainer}>
                      <Ionicons name="location" size={24} color="#fff" />
                    </View>
                    <View style={styles.autoCheckinTextContainer}>
                      <Text variant="titleSmall" style={styles.autoCheckinTitle}>
                        Auto Check-In
                      </Text>
                      <Text variant="bodySmall" style={styles.autoCheckinSubtitle}>
                        Tap to check in automatically when you're at the salon
                      </Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </Card.Content>
          </Card>
        )}

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
                {(booking.services || (booking as any).service ? [(booking as any).service] : []).map((service: any) => (
                  <View key={service.id} style={styles.serviceRow}>
                    <Text variant="bodyMedium" style={styles.serviceText}>
                      {service.name}
                    </Text>
                    <Text variant="bodyMedium" style={styles.servicePrice}>
                      GH₵ {parseFloat(String(service.price)).toFixed(2)}
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
                      const guestService = guest.service || (booking.services || []).find((s: any) => s.id === guest.serviceId);
                      const guestStatus = guest.status || (guest.checkedIn ? 'CHECKED_IN' : 'PENDING');
                      const canCancel = guestStatus === 'PENDING' && booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED';

                      const getStatusBadge = () => {
                        switch (guestStatus) {
                          case 'CHECKED_IN':
                            return { icon: 'checkmark-circle', color: COLORS.primaryGreen, label: 'Checked In', bgColor: '#E8F5E9' };
                          case 'CANCELLED':
                            return { icon: 'close-circle', color: '#EF4444', label: 'Cancelled', bgColor: '#FEE2E2' };
                          case 'NO_SHOW':
                            return { icon: 'alert-circle', color: '#F59E0B', label: 'No Show', bgColor: '#FEF3C7' };
                          default:
                            return { icon: 'time-outline', color: COLORS.textSecondary, label: 'Pending', bgColor: theme.surface };
                        }
                      };
                      const statusBadge = getStatusBadge();

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
                            <View style={styles.memberStatusContainer}>
                              <View style={[styles.statusBadge, { backgroundColor: statusBadge.bgColor }]}>
                                <Ionicons name={statusBadge.icon as any} size={12} color={statusBadge.color} />
                                <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>{statusBadge.label}</Text>
                              </View>
                              {canCancel && (
                                <TouchableOpacity
                                  style={styles.cancelGuestButton}
                                  onPress={() => {
                                    Alert.alert(
                                      'Cancel Guest',
                                      `Remove ${guest.guestName} from this group booking?`,
                                      [
                                        { text: 'Keep', style: 'cancel' },
                                        {
                                          text: 'Cancel Guest',
                                          style: 'destructive',
                                          onPress: async () => {
                                            try {
                                              await bookingApi.cancelGuest(guest.id);
                                              queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
                                              queryClient.invalidateQueries({ queryKey: ['bookings'] });
                                              Alert.alert('Guest Cancelled', `${guest.guestName} has been removed from the booking.`);
                                            } catch (error: any) {
                                              Alert.alert('Error', error.response?.data?.message || 'Failed to cancel guest.');
                                            }
                                          },
                                        },
                                      ]
                                    );
                                  }}
                                >
                                  <Ionicons name="close" size={14} color="#EF4444" />
                                </TouchableOpacity>
                              )}
                            </View>
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
                  {formatDate(booking.scheduledDate || booking.date || '')}
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
                  {formatTime(booking.scheduledTime || booking.startTime)}
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
                      {booking.worker.fullName}
                    </Text>
                  </View>
                </View>
              </>
            )}

            <Divider style={styles.divider} />

            {/* Payment Method */}
            {booking.payment && (
              <>
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="card-outline" size={20} color={COLORS.primaryGreen} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text variant="bodySmall" style={styles.detailLabel}>Payment Method</Text>
                    <Text variant="bodyLarge" style={styles.detailValue}>
                      {booking.payment.provider === 'MTN_MOMO' ? 'MTN Mobile Money'
                        : booking.payment.provider === 'VODAFONE_CASH' ? 'Vodafone Cash'
                        : booking.payment.provider === 'AIRTELTIGO_MONEY' ? 'AirtelTigo Money'
                        : booking.payment.provider}
                    </Text>
                    <Text variant="bodySmall" style={{ color: COLORS.textSecondary, marginTop: 2 }}>
                      Payment: {booking.payment.status}
                    </Text>
                  </View>
                </View>
                <Divider style={styles.divider} />
              </>
            )}

            {/* Total */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="wallet-outline" size={20} color={COLORS.primaryGreen} />
              </View>
              <View style={styles.detailContent}>
                <Text variant="bodySmall" style={styles.detailLabel}>Total Amount</Text>
                <Text variant="titleLarge" style={styles.totalAmount}>
                  GH₵ {parseFloat(String(booking.totalAmount)).toFixed(2)}
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
                      GH₵ {parseFloat(String(booking.escrow.amountHeld)).toFixed(2)}
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
                  {formatDate(booking.cancellationDeadline)} at {formatTime(booking.cancellationDeadline?.split('T')[1]?.substring(0, 5) || '00:00')}
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

        {/* Service Completion Status - for completed bookings */}
        {booking.serviceCompleted && (
          <Card style={styles.completionCard}>
            <Card.Content>
              <View style={styles.completionHeader}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primaryGreen} />
                <Text variant="titleSmall" style={styles.completionTitle}>
                  Service Completed
                </Text>
              </View>
              <View style={styles.completionDetails}>
                <Text variant="bodySmall" style={styles.completionLabel}>
                  Completion Method
                </Text>
                <Text variant="bodyMedium" style={styles.completionValue}>
                  {getCompletionMethodLabel(booking.completionMethod)}
                </Text>
                {booking.serviceCompletedAt && (
                  <>
                    <Text variant="bodySmall" style={styles.completionLabel}>
                      Completed At
                    </Text>
                    <Text variant="bodyMedium" style={styles.completionValue}>
                      {formatDate(booking.serviceCompletedAt)} at {formatTime(booking.serviceCompletedAt?.split('T')[1]?.substring(0, 5) || '00:00')}
                    </Text>
                  </>
                )}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Rate This Visit - for completed bookings without review */}
        {booking.status === 'COMPLETED' && !booking.review && (
          <Card style={styles.rateCard}>
            <Card.Content style={styles.rateCardContent}>
              <View style={styles.rateIconContainer}>
                <Ionicons name="star" size={28} color={COLORS.accentGold} />
              </View>
              <Text variant="titleSmall" style={styles.rateTitle}>
                Rate This Visit
              </Text>
              <Text variant="bodySmall" style={styles.rateSubtitle}>
                Your service is complete! Would you like to rate your experience?
              </Text>
              <View style={styles.rateButtons}>
                <TouchableOpacity
                  style={styles.rateNowButton}
                  onPress={() => navigation.navigate('RateBooking', { bookingId })}
                >
                  <Ionicons name="star" size={18} color="#FFFFFF" />
                  <Text style={styles.rateNowButtonText}>Rate Now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.maybeLaterButton}
                  onPress={() => {}}
                >
                  <Text style={styles.maybeLaterButtonText}>Maybe Later</Text>
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Already Reviewed - for completed bookings with review */}
        {booking.status === 'COMPLETED' && booking.review && (
          <Card style={styles.reviewedCard}>
            <Card.Content style={styles.reviewedCardContent}>
              <View style={styles.reviewedHeader}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primaryGreen} />
                <Text variant="titleSmall" style={styles.reviewedTitle}>Reviewed</Text>
              </View>
              <View style={styles.reviewedStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= booking.review!.rating ? 'star' : 'star-outline'}
                    size={24}
                    color={star <= booking.review!.rating ? COLORS.accentGold : COLORS.border}
                  />
                ))}
              </View>
              {booking.review.comment && (
                <Text variant="bodySmall" style={styles.reviewedComment}>
                  "{booking.review.comment}"
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Dispute Status - for disputed bookings */}
        {booking.disputeRaised && (
          <Card style={styles.disputeCard}>
            <Card.Content>
              <View style={styles.disputeHeader}>
                <Ionicons name="warning" size={24} color={COLORS.accentRed} />
                <Text variant="titleSmall" style={styles.disputeTitle}>
                  Dispute Raised
                </Text>
              </View>
              <View style={styles.disputeDetails}>
                <Text variant="bodySmall" style={styles.disputeLabel}>
                  Reason
                </Text>
                <Text variant="bodyMedium" style={styles.disputeReason}>
                  {booking.disputeReason || 'No reason provided'}
                </Text>
              </View>
              <View style={styles.disputeBadge}>
                <Text style={styles.disputeBadgeText}>Under Review</Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Service Completion Confirmation - for past appointments */}
        {needsCompletionConfirmation && (
          <Card style={styles.confirmationCard}>
            <Card.Content>
              <View style={styles.confirmationHeader}>
                <Ionicons name="help-circle" size={28} color={COLORS.accentGold} />
                <Text variant="titleSmall" style={styles.confirmationTitle}>
                  Was your service completed?
                </Text>
              </View>
              <Text variant="bodySmall" style={styles.confirmationSubtitle}>
                Please confirm if your appointment was completed satisfactorily
              </Text>
              <View style={styles.confirmationButtons}>
                <TouchableOpacity
                  style={styles.confirmCompleteButton}
                  onPress={handleConfirmCompletion}
                  disabled={confirmCompletionMutation.isPending}
                >
                  {confirmCompletionMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.confirmCompleteButtonText}>
                        Yes, Service Complete
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.disputeButton}
                  onPress={handleRaiseDispute}
                >
                  <Ionicons name="alert-circle" size={18} color={COLORS.accentRed} />
                  <Text style={styles.disputeButtonText}>
                    Issue with Service
                  </Text>
                </TouchableOpacity>
              </View>
              {booking.autoCompletionDeadline && (
                <Text variant="bodySmall" style={styles.autoCompleteNote}>
                  Auto-completes on {formatDate(booking.autoCompletionDeadline)}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {/* QR Code Button - for upcoming confirmed bookings */}
        {isUpcomingConfirmed && (
          <Card style={styles.qrButtonCard}>
            <Card.Content>
              <TouchableOpacity
                style={styles.qrButton}
                onPress={handleShowQRCode}
              >
                <View style={styles.qrButtonIconContainer}>
                  <Ionicons name="qr-code" size={32} color={COLORS.primaryGreen} />
                </View>
                <View style={styles.qrButtonTextContainer}>
                  <Text variant="titleSmall" style={styles.qrButtonTitle}>
                    Show QR Code
                  </Text>
                  <Text variant="bodySmall" style={styles.qrButtonSubtitle}>
                    Tap to display your check-in code
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
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
                  placeholderTextColor={COLORS.textSecondary}
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

      {/* Dispute Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={disputeModalVisible}
        onRequestClose={() => setDisputeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={styles.modalTitle}>Report Issue</Text>
              <TouchableOpacity 
                onPress={() => setDisputeModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.disputeModalContent}>
              <View style={styles.disputeIconContainer}>
                <Ionicons name="alert-circle" size={48} color={COLORS.accentRed} />
              </View>
              
              <Text variant="titleMedium" style={styles.disputeModalTitle}>
                Issue with Service
              </Text>
              
              <Text variant="bodySmall" style={styles.disputeModalDescription}>
                Please describe the issue you experienced. Our support team will review your case and contact you within 24 hours.
              </Text>

              <Text variant="bodySmall" style={styles.reasonLabel}>
                Describe the issue *
              </Text>
              <TextInput
                style={styles.reasonInput}
                multiline
                numberOfLines={4}
                placeholder="e.g., Service was not performed, quality issues, no-show by provider..."
                placeholderTextColor={COLORS.textSecondary}
                value={disputeReason}
                onChangeText={setDisputeReason}
              />

              <Button
                mode="contained"
                onPress={handleSubmitDispute}
                loading={raiseDisputeMutation.isPending}
                disabled={raiseDisputeMutation.isPending}
                style={[styles.confirmCancelButton, { backgroundColor: COLORS.accentRed }]}
                contentStyle={styles.confirmCancelButtonContent}
              >
                {raiseDisputeMutation.isPending 
                  ? 'Submitting...' 
                  : 'Submit Dispute'
                }
              </Button>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#FCD116',
  CONFIRMED: '#006B3F',
  IN_PROGRESS: '#2196F3',
  COMPLETED: '#6B7280',
  CANCELLED: '#CE1126',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const createStyles = (COLORS: ReturnType<typeof createColors>) => StyleSheet.create({
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
  // Queue Position Card
  queueCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  queueCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  queuePositionSection: {
    alignItems: 'center',
    marginRight: 20,
    paddingLeft: 8,
  },
  queuePositionLabel: {
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  queuePositionBadge: {
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  queuePositionNumber: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 24,
  },
  queueInfoSection: {
    flex: 1,
    gap: 8,
  },
  queueInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queueInfoText: {
    color: COLORS.textSecondary,
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
  memberStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cancelGuestButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
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
  // Service Completion Card
  completionCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryGreen,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  completionTitle: {
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },
  completionDetails: {
    gap: 4,
  },
  completionLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  completionValue: {
    color: COLORS.textPrimary,
    fontWeight: '500',
    marginBottom: 8,
  },
  // Rate Card
  rateCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: `${COLORS.accentGold}40`,
  },
  rateCardContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  rateIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.accentGold}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  rateTitle: {
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  rateSubtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  rateButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  rateNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006B3F',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
    flex: 1,
  },
  rateNowButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  maybeLaterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.textSecondary}10`,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
  },
  maybeLaterButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  // Reviewed Card
  reviewedCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryGreen,
  },
  reviewedCardContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  reviewedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  reviewedTitle: {
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },
  reviewedStars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  reviewedComment: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  // Dispute Card
  disputeCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accentRed,
  },
  disputeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  disputeTitle: {
    fontWeight: '600',
    color: COLORS.accentRed,
  },
  disputeDetails: {
    marginBottom: 12,
  },
  disputeLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  disputeReason: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  disputeBadge: {
    backgroundColor: `${COLORS.accentRed}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  disputeBadgeText: {
    color: COLORS.accentRed,
    fontWeight: '600',
    fontSize: 12,
  },
  // Confirmation Card
  confirmationCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: `${COLORS.accentGold}40`,
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  confirmationTitle: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  confirmationSubtitle: {
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  confirmationButtons: {
    gap: 10,
  },
  confirmCompleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  confirmCompleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  disputeButton: {
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
  disputeButtonText: {
    color: COLORS.accentRed,
    fontWeight: '600',
    fontSize: 15,
  },
  autoCompleteNote: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  // QR Code Button Card
  qrButtonCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  qrButtonIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${COLORS.primaryGreen}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrButtonTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  qrButtonTitle: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  qrButtonSubtitle: {
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Auto Check-In Button Card
  autoCheckinCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.primaryGreen,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  autoCheckinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  autoCheckinIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoCheckinTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  autoCheckinTitle: {
    fontWeight: '600',
    color: '#fff',
  },
  autoCheckinSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  // Dispute Modal
  disputeModalContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  disputeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.accentRed}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  disputeModalTitle: {
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  disputeModalDescription: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
});

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  Animated,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  ActivityIndicator,
  Button,
  Divider,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { bookingApi } from '../../api/booking';
import { Booking } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';
import { useResponsiveColumns } from '../../hooks/useResponsiveColumns';
import { a11yBookingLabel } from '../../hooks/useAccessibility';
import { parseLocalDate, isToday, buildAppointmentDateTime } from '../../utils/dateUtils';

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

type TabType = 'upcoming' | 'past';

const UPCOMING_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'];
const PAST_STATUSES = ['COMPLETED', 'CANCELLED', 'NO_SHOW'];

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#FCD116',
  CONFIRMED: '#006B3F',
  IN_PROGRESS: '#2196F3',
  COMPLETED: '#6B7280',
  CANCELLED: '#CE1126',
  NO_SHOW: '#CE1126',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-Show',
};

export default function BookingsScreen() {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { numColumns, isTablet } = useResponsiveColumns();
  const { isAuthenticated, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const animatedValues = useRef<Animated.Value[]>([]).current;

  const { data: bookings, isLoading, error, refetch } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingApi.getMyBookings(),
    retry: false,
    enabled: isAuthenticated,
  });

  // Check if error is an auth error (401)
  const isAuthError = useMemo(() => {
    if (!error) return false;
    if (axios.isAxiosError(error)) {
      return error.response?.status === 401;
    }
    return false;
  }, [error]);

  const errorMessage = useMemo(() => {
    if (isAuthError) {
      return 'Your session has expired. Please log in again.';
    }
    if (axios.isAxiosError(error)) {
      return error.response?.data?.message || 'Failed to load bookings';
    }
    return 'Failed to load bookings';
  }, [error, isAuthError]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // A booking counts as "past" once its appointment time is more than 2
  // hours behind, even if the salon hasn't updated its status yet —
  // otherwise stale appointments linger in the Upcoming tab forever.
  const isPastByTime = useCallback((booking: Booking) => {
    const appointment = buildAppointmentDateTime(
      booking.scheduledDate || booking.date || '',
      booking.scheduledTime || booking.startTime,
    );
    return Date.now() - appointment.getTime() > 2 * 60 * 60 * 1000;
  }, []);

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];

    if (activeTab === 'upcoming') {
      return bookings.filter(
        (booking) => UPCOMING_STATUSES.includes(booking.status) && !isPastByTime(booking)
      );
    }
    return bookings.filter(
      (booking) =>
        PAST_STATUSES.includes(booking.status) ||
        (UPCOMING_STATUSES.includes(booking.status) && isPastByTime(booking))
    );
  }, [bookings, activeTab, isPastByTime]);

  // Staggered entrance animation
  useEffect(() => {
    if (filteredBookings.length > 0) {
      // Ensure we have enough animated values
      while (animatedValues.length < filteredBookings.length) {
        animatedValues.push(new Animated.Value(0));
      }
      // Stagger animation
      const animations = filteredBookings.map((_, i) =>
        Animated.timing(animatedValues[i], {
          toValue: 1,
          duration: 400,
          delay: i * 80,
          useNativeDriver: true,
        })
      );
      Animated.stagger(80, animations).start();
    }
  }, [filteredBookings.length, activeTab]);


  const formatDate = (dateString: string) => {
    // Timezone-safe: parse components explicitly to avoid UTC-shift bug
    const date = parseLocalDate(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()) {
      return 'Today';
    } else if (date.getFullYear() === tomorrow.getFullYear() &&
               date.getMonth() === tomorrow.getMonth() &&
               date.getDate() === tomorrow.getDate()) {
      return 'Tomorrow';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
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

  const handleCancelBooking = useCallback((bookingId: string) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            try {
              const result: any = await bookingApi.cancelBooking(bookingId);
              refetch();
              const refund = result?.refundBreakdown;
              if (refund && refund.refundAmount > 0) {
                Alert.alert('Booking Cancelled', `Cancelled successfully. A refund of GH₵${refund.refundAmount.toFixed(2)} (${refund.refundPercentage}%) will be processed within 3-5 business days.`);
              } else {
                Alert.alert('Booking Cancelled', 'Your booking has been cancelled successfully.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Could not cancel booking');
            }
          },
        },
      ]
    );
  }, [refetch]);

  const handleConfirmCompletion = useCallback((booking: Booking) => {
    Alert.alert(
      'Confirm Service Completion',
      'Is your service done? Confirming will release your payment to the salon.',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, Release Payment',
          onPress: async () => {
            try {
              await bookingApi.confirmCompletion(booking.id);
              refetch();
              Alert.alert(
                'Service Confirmed',
                'Payment has been released to the salon. Thank you!'
              );
            } catch (err: any) {
              Alert.alert(
                'Error',
                err.response?.data?.error?.message ||
                  err.response?.data?.message ||
                  'Could not confirm completion'
              );
            }
          },
        },
      ]
    );
  }, [refetch]);

  const handleRebook = useCallback((item: Booking) => {
    navigation.navigate('Booking', {
      salonId: item.salon?.id || '',
      services: item.services?.map(s => s.id) || [],
    });
  }, [navigation]);

  const renderPastBookingCard = useCallback(({ item, index }: { item: Booking; index: number }) => {
    const cardAnim = animatedValues[index] || new Animated.Value(1);
    const statusColor = STATUS_COLORS[item.status] || COLORS.textSecondary;
    const statusLabel = STATUS_LABELS[item.status] || item.status;
    const isCompleted = item.status === 'COMPLETED';
    const accentColor = isCompleted ? COLORS.primaryGreen : COLORS.accentRed;

    return (
      <Animated.View style={[{
        opacity: cardAnim,
        transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
      }]}>
        <TouchableOpacity
          style={[styles.pastCard, { borderLeftColor: accentColor }]}
          onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={a11yBookingLabel(item)}
          activeOpacity={0.8}
        >
          <View style={styles.pastCardBody}>
            {/* Left: Status column */}
            <View style={[styles.pastStatusColumn, { backgroundColor: `${statusColor}12` }]}>
              <View style={[styles.pastStatusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.pastStatusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>

            {/* Center: Info */}
            <View style={styles.pastInfoColumn}>
              <Text style={styles.pastServiceName} numberOfLines={1}>
                {item.services?.map(s => s.name).join(', ') || 'Service'}
              </Text>
              <Text style={styles.pastSalonName} numberOfLines={1}>
                {item.salon?.businessName || 'Salon'}
              </Text>
              <View style={styles.pastDateTimeRow}>
                <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
                <Text style={styles.pastDateTimeText}>
                  {formatDate(item.scheduledDate || item.date || '')} · {formatTime(item.scheduledTime || item.startTime)}
                </Text>
              </View>
            </View>

            {/* Right: Price + action */}
            <View style={styles.pastRightColumn}>
              <Text style={styles.pastPrice}>
                GH₵ {parseFloat(String(item.totalAmount)).toFixed(2)}
              </Text>
              {isCompleted && !item.review && (
                <TouchableOpacity
                  style={styles.pastRebookBtn}
                  onPress={(e) => { e.stopPropagation(); handleRebook(item); }}
                >
                  <Ionicons name="refresh" size={12} color={COLORS.primaryGreen} />
                  <Text style={styles.pastRebookBtnText}>Rebook</Text>
                </TouchableOpacity>
              )}
              {isCompleted && item.review && (
                <View style={styles.pastReviewedBadge}>
                  <Ionicons name="star" size={11} color={COLORS.accentGold} />
                  <Text style={styles.pastReviewedText}>{item.review.rating}/5</Text>
                </View>
              )}
              {!isCompleted && (
                <TouchableOpacity
                  style={styles.pastViewBtn}
                  onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
                >
                  <Text style={styles.pastViewBtnText}>View</Text>
                  <Ionicons name="chevron-forward" size={12} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [navigation, animatedValues, handleRebook, COLORS]);

  const renderBookingCard = useCallback(({ item, index }: { item: Booking; index: number }) => {
    const cardAnim = animatedValues[index] || new Animated.Value(1);
    const statusColor = STATUS_COLORS[item.status] || COLORS.textSecondary;
    const statusLabel = STATUS_LABELS[item.status] || item.status;
    
    return (
      <Animated.View style={[{ opacity: cardAnim, transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
      <Card
        style={styles.bookingCard}
        onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={a11yBookingLabel(item)}
      >
        <Card.Content style={[styles.cardContent, isTablet && styles.cardContentTablet]}>
          <View style={styles.cardHeader}>
            <View style={styles.salonInfo}>
              <Text variant="titleMedium" style={styles.salonName}>
                {item.salon?.businessName || 'Salon'}
              </Text>
              <View style={styles.dateTimeRow}>
                <Ionicons name="calendar-outline" size={isTablet ? 16 : 14} color={COLORS.textSecondary} />
                <Text variant="bodySmall" style={[styles.dateTimeText, isTablet && styles.dateTimeTextTablet]}>
                  {formatDate(item.scheduledDate || item.date || '')} • {formatTime(item.scheduledTime || item.startTime)}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.servicesRow}>
            <Ionicons name="cut-outline" size={isTablet ? 16 : 14} color={COLORS.textSecondary} />
            <Text variant="bodySmall" style={[styles.servicesText, isTablet && styles.servicesTextTablet]} numberOfLines={2}>
              {item.services?.map(s => s.name).join(', ')}
            </Text>
          </View>

          {item.worker && (
            <View style={styles.workerRow}>
              <Ionicons name="person-outline" size={isTablet ? 16 : 14} color={COLORS.textSecondary} />
              <Text variant="bodySmall" style={[styles.workerText, isTablet && styles.workerTextTablet]}>
                {item.worker.fullName}
              </Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            <Text variant={isTablet ? "titleLarge" : "titleMedium"} style={[styles.totalAmount, isTablet && styles.totalAmountTablet]}>
              GH₵ {parseFloat(String(item.totalAmount)).toFixed(2)}
            </Text>
            {(item.status === 'CONFIRMED' || item.status === 'PENDING') && !item.checkedIn && (
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancelBooking(item.id)}
                >
                  <Ionicons name="close-circle-outline" size={16} color={COLORS.accentRed} />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.viewButton}
                  onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
                >
                  <Text style={styles.viewButtonText}>Details</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.primaryGreen} />
                </TouchableOpacity>
              </View>
            )}
            {item.checkedIn &&
              (item.status === 'CONFIRMED' || item.status === 'IN_PROGRESS') &&
              !item.customerConfirmed &&
              !item.disputeRaised && (
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.completeCardButton}
                  onPress={() => handleConfirmCompletion(item)}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.primaryGreen} />
                  <Text style={styles.completeCardButtonText}>Confirm Done</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.viewButton}
                  onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
                >
                  <Text style={styles.viewButtonText}>Details</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.primaryGreen} />
                </TouchableOpacity>
              </View>
            )}
            {item.status === 'COMPLETED' && !item.review && (
              <View style={styles.pastCardActions}>
                <TouchableOpacity
                  style={styles.rebookButton}
                  onPress={() => handleRebook(item)}
                >
                  <Ionicons name="refresh" size={isTablet ? 16 : 14} color={COLORS.primaryGreen} />
                  <Text style={styles.rebookButtonText}>Rebook</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rateButton}
                  onPress={() => navigation.navigate('RateBooking', { bookingId: item.id })}
                >
                  <Ionicons name="star" size={isTablet ? 16 : 14} color={COLORS.accentGold} />
                  <Text style={styles.rateButtonText}>Rate</Text>
                </TouchableOpacity>
              </View>
            )}
            {item.status === 'COMPLETED' && item.review && (
              <View style={styles.pastCardActions}>
                <TouchableOpacity
                  style={styles.rebookButton}
                  onPress={() => handleRebook(item)}
                >
                  <Ionicons name="refresh" size={isTablet ? 16 : 14} color={COLORS.primaryGreen} />
                  <Text style={styles.rebookButtonText}>Rebook</Text>
                </TouchableOpacity>
                <View style={styles.reviewedBadge}>
                  <Ionicons name="star" size={isTablet ? 16 : 14} color={COLORS.accentGold} />
                  <Text style={styles.reviewedText}>⭐ {item.review.rating}/5</Text>
                </View>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
      </Animated.View>
    );
  }, [navigation, animatedValues, handleCancelBooking, handleConfirmCompletion, handleRebook, isTablet, COLORS]);

  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyStateIconContainer}>
          <Ionicons
            name={activeTab === 'upcoming' ? 'calendar-outline' : 'checkmark-done-outline'}
            size={56}
            color={COLORS.primaryGreen}
          />
        </View>
        <Text variant="titleMedium" style={styles.emptyTitle}>
          No {activeTab} bookings
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtitle}>
          {activeTab === 'upcoming'
            ? 'Ready for a fresh look? Book your next appointment now!'
            : 'Your past appointments will appear here'}
        </Text>
        {activeTab === 'upcoming' && (
          <Button
            mode="contained"
            onPress={() => navigation.getParent()?.navigate('Search')}
            style={styles.bookNowButton}
            icon="magnify"
          >
            Find a Salon
          </Button>
        )}
      </View>
    );
  };

  // Unauthenticated state - show login prompt
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginPromptContainer}>
          <View style={styles.loginPromptIconContainer}>
            <Ionicons name="calendar-outline" size={80} color={COLORS.primaryGreen} />
          </View>
          <Text variant="headlineSmall" style={styles.loginPromptTitle}>
            Login to View Bookings
          </Text>
          <Text variant="bodyMedium" style={styles.loginPromptSubtitle}>
            Sign in to manage your appointments and booking history
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.getParent()?.navigate('Auth')}
            style={styles.loginPromptButton}
            buttonColor={COLORS.primaryGreen}
          >
            Login
          </Button>
        </View>
      </SafeAreaView>
    );
  }
  
  if (error && !isAuthError && !bookings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.accentRed} />
          <Text variant="titleMedium" style={styles.errorTitle}>{errorMessage}</Text>
          <Button mode="contained" onPress={() => refetch()} style={styles.retryButton}>
            Retry
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (isAuthError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="lock-closed-outline" size={64} color={COLORS.accentRed} />
          <Text variant="titleMedium" style={styles.errorTitle}>Session Expired</Text>
          <Text variant="bodyMedium" style={styles.errorSubtitle}>{errorMessage}</Text>
          <Button 
            mode="contained" 
            onPress={() => logout()} 
            style={styles.retryButton}
          >
            Log In Again
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={isDark ? require('../../../assets/logo-full-white.png') : require('../../../assets/logo-full-black.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
        <Text variant="headlineSmall" style={styles.headerTitle}>My Bookings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'upcoming' }}
          accessibilityLabel={`Upcoming bookings tab`}
        >
          <Text
            variant="labelLarge"
            style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}
          >
            Upcoming
          </Text>
          {filteredBookings.length > 0 && activeTab === 'upcoming' && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{filteredBookings.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'past' }}
          accessibilityLabel={`Past bookings tab`}
        >
          <Text
            variant="labelLarge"
            style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}
          >
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {/* Booking List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryGreen} />
        </View>
      ) : (
        <FlatList
          key={`${activeTab}-${numColumns}`}
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={activeTab === 'past' ? renderPastBookingCard : renderBookingCard}
          numColumns={activeTab === 'past' ? 1 : numColumns}
          columnWrapperStyle={activeTab === 'past' ? undefined : (numColumns > 1 ? styles.columnWrapper : undefined)}
          contentContainerStyle={activeTab === 'past' ? styles.pastListContent : styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryGreen]} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (COLORS: ReturnType<typeof createColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 16,
    backgroundColor: COLORS.cardBackground,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerLogo: {
    width: 100,
    height: 30,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primaryGreen,
  },
  tabText: {
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  bookingCard: {
    flex: 1,
    marginBottom: 16,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 0,
  },
  cardContent: {
    padding: 16,
  },
  cardContentTablet: {
    padding: 24,
    gap: 2,
  },
  dateTimeTextTablet: {
    fontSize: 14,
  },
  servicesTextTablet: {
    fontSize: 14,
  },
  workerTextTablet: {
    fontSize: 14,
  },
  totalAmountTablet: {
    fontSize: 22,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  salonInfo: {
    flex: 1,
    marginRight: 12,
  },
  salonName: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  dateTimeText: {
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 12,
    backgroundColor: COLORS.border,
  },
  servicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  servicesText: {
    flex: 1,
    color: COLORS.textSecondary,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  workerText: {
    color: COLORS.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  totalAmount: {
    fontWeight: '700',
    color: COLORS.primaryGreen,
    fontSize: 18,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewButtonText: {
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.accentGold}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  rateButtonText: {
    color: COLORS.accentGold,
    fontWeight: '600',
  },
  reviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primaryGreen}10`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  reviewedText: {
    color: COLORS.primaryGreen,
    fontWeight: '600',
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    marginTop: 16,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  emptySubtitle: {
    marginTop: 8,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  bookNowButton: {
    marginTop: 24,
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
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
  errorSubtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 32,
  },
  retryButton: {
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
  },
  // Login Prompt (unauthenticated)
  loginPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loginPromptIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${COLORS.primaryGreen}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginPromptTitle: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  loginPromptSubtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
    lineHeight: 20,
  },
  loginPromptButton: {
    borderRadius: 12,
    paddingHorizontal: 32,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pastCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.accentRed}10`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  cancelButtonText: {
    color: COLORS.accentRed,
    fontWeight: '600',
    fontSize: 12,
  },
  completeCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primaryGreen}10`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  completeCardButtonText: {
    color: COLORS.primaryGreen,
    fontWeight: '600',
    fontSize: 12,
  },
  rebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primaryGreen}10`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  rebookButtonText: {
    color: COLORS.primaryGreen,
    fontWeight: '600',
    fontSize: 12,
  },
  emptyStateIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${COLORS.primaryGreen}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  // Past bookings - single column layout
  pastListContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  pastCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  pastCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  pastStatusColumn: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
  },
  pastStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pastStatusText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  pastInfoColumn: {
    flex: 1,
    gap: 3,
  },
  pastServiceName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pastSalonName: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  pastDateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  pastDateTimeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  pastRightColumn: {
    alignItems: 'flex-end',
    gap: 6,
    minWidth: 72,
  },
  pastPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryGreen,
  },
  pastRebookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primaryGreen}15`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  pastRebookBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },
  pastReviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.accentGold}18`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  pastReviewedText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accentGold,
  },
  pastViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pastViewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

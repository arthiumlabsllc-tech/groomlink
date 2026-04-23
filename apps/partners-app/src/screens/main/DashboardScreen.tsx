import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import {
  Text,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isToday, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { salonApi } from '../../api/salon';
import { bookingsApi } from '../../api/bookings';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { Booking, MainStackParamList } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubscriptionStatusCard from '../../components/SubscriptionStatusCard';
import { AppTheme } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeContext';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const queryClient = useQueryClient();
  const { theme, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Fetch salon data
  const { data: salon, isLoading: salonLoading } = useQuery({
    queryKey: ['mySalon'],
    queryFn: salonApi.getMySalon,
  });

  // Fetch salon stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['salonStats', salon?.id],
    queryFn: () => (salon ? salonApi.getSalonStats(salon.id) : null),
    enabled: !!salon?.id,
  });

  // Fetch bookings for today
  const { data: bookingsData, isLoading: bookingsLoading, refetch } = useQuery({
    queryKey: ['salonBookings', salon?.id, 'today'],
    queryFn: () =>
      salon
        ? bookingsApi.getSalonBookings({ salonId: salon.id, limit: 50 })
        : null,
    enabled: !!salon?.id,
  });

  const isLoading = salonLoading || statsLoading || bookingsLoading;

  // Filter today's bookings and calculate weekly revenue
  const allBookings = bookingsData?.data || [];
  const todayBookings = allBookings.filter((b: Booking) => isToday(parseISO(b.date)));
  const pendingBookings = allBookings.filter((b: Booking) => b.status === 'PENDING');

  // Calculate this week's revenue
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weeklyRevenue = allBookings
    .filter((b: Booking) => {
      const bookingDate = parseISO(b.date);
      return (
        isWithinInterval(bookingDate, { start: weekStart, end: weekEnd }) &&
        b.status === 'COMPLETED'
      );
    })
    .reduce((sum: number, b: Booking) => sum + (b.finalAmount || 0), 0);

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mySalon'] });
    queryClient.invalidateQueries({ queryKey: ['salonStats'] });
    queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
  }, [queryClient]);

  const navigateToBooking = (bookingId: string) => {
    navigation.navigate('BookingDetail', { bookingId });
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return theme.pendingBg;
      case 'CONFIRMED':
        return theme.successBg;
      case 'COMPLETED':
        return theme.successBg;
      case 'CANCELLED':
        return theme.dangerBg;
      default:
        return theme.surfaceVariant;
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return theme.pending;
      case 'CONFIRMED':
        return theme.success;
      case 'COMPLETED':
        return theme.success;
      case 'CANCELLED':
        return theme.danger;
      default:
        return theme.textSecondary;
    }
  };

  const formatTime = (time: string) => {
    if (!time || typeof time !== 'string' || !time.includes(':')) return time || '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const renderBookingItem = ({ item }: { item: Booking }) => {
    if (!item || !item.id) return null;

    const customerName = `${item.customer?.firstName || ''} ${item.customer?.lastName || ''}`.trim();
    const serviceName = item.service?.name || 'Service';
    const serviceDuration = item.service?.duration || 0;

    return (
      <TouchableOpacity onPress={() => navigateToBooking(item.id)} activeOpacity={0.7}>
        <View style={styles.bookingCard}>
          <View style={styles.bookingTimeColumn}>
            <Text style={styles.bookingTime}>{formatTime(item.startTime)}</Text>
            <Text style={styles.bookingDuration}>{serviceDuration}min</Text>
          </View>
          <View style={styles.bookingDivider} />
          <View style={styles.bookingContent}>
            <View style={styles.bookingHeader}>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>
                  {customerName || 'Unknown Customer'}
                </Text>
                <Text style={styles.serviceName}>{serviceName}</Text>
              </View>
              <Chip
                mode="flat"
                style={[styles.statusChip, { backgroundColor: getStatusBgColor(item.status) }]}
                textStyle={[styles.statusText, { color: getStatusTextColor(item.status) }]}
              >
                {item.status}
              </Chip>
            </View>
            <View style={styles.bookingFooter}>
              <Text style={styles.bookingPrice}>GH₵{(item.finalAmount || 0).toLocaleString()}</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="calendar-outline" size={48} color={theme.textTertiary} />
      </View>
      <Text variant="titleMedium" style={styles.emptyTitle}>
        No Appointments Today
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        Your schedule is clear for today. Enjoy the free time!
      </Text>
    </View>
  );

  if (salonLoading && !salon) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={todayBookings.sort((a: Booking, b: Booking) => (a.startTime || '').localeCompare(b.startTime || ''))}
        keyExtractor={(item) => item.id}
        renderItem={renderBookingItem}
        ListHeaderComponent={
          <>
            {/* Header — like MTN's "Y'ello Isaac!" */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Image
                  source={isDark ? require('../../../assets/logo-white.png') : require('../../../assets/logo-black.png')}
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
                <View>
                  <Text variant="bodyMedium" style={styles.greeting}>
                    {getGreeting()},
                  </Text>
                  <Text variant="headlineMedium" style={styles.salonName}>
                    {salon?.businessName || user?.firstName || 'Partner'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Ionicons name="notifications-outline" size={24} color={theme.text} />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Subscription Card — like MTN's "Loyalty Points" */}
            <SubscriptionStatusCard />

            {/* Overview Section Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
                <Ionicons name="refresh" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Stats Grid — like MTN's "Balances" Airtime/Data cards */}
            <View style={styles.statsGrid}>
              {/* Today's Bookings */}
              <View style={styles.statsCard}>
                <View style={styles.statsCardTop}>
                  <View style={[styles.statsIconCircle, { backgroundColor: theme.successBg }]}>
                    <Ionicons name="calendar-today" size={18} color={theme.success} />
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
                </View>
                <Text style={styles.statsValue}>{todayBookings.length}</Text>
                <Text style={styles.statsLabel}>Today's Bookings</Text>
              </View>

              {/* Weekly Revenue */}
              <View style={styles.statsCard}>
                <View style={styles.statsCardTop}>
                  <View style={[styles.statsIconCircle, { backgroundColor: theme.accentBg }]}>
                    <Ionicons name="cash" size={18} color={theme.accent} />
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
                </View>
                <Text style={styles.statsValue}>GH₵{weeklyRevenue.toLocaleString()}</Text>
                <Text style={styles.statsLabel}>Weekly Revenue</Text>
              </View>

              {/* Pending */}
              <View style={styles.statsCard}>
                <View style={styles.statsCardTop}>
                  <View style={[styles.statsIconCircle, { backgroundColor: theme.pendingBg }]}>
                    <Ionicons name="time" size={18} color={theme.pending} />
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
                </View>
                <Text style={styles.statsValue}>{pendingBookings.length}</Text>
                <Text style={styles.statsLabel}>Pending</Text>
              </View>

              {/* Rating */}
              <View style={styles.statsCard}>
                <View style={styles.statsCardTop}>
                  <View style={[styles.statsIconCircle, { backgroundColor: theme.infoBg }]}>
                    <Ionicons name="star" size={18} color={theme.info} />
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
                </View>
                <Text style={styles.statsValue}>
                  {stats?.averageRating ? stats.averageRating.toFixed(1) : '-'}
                </Text>
                <Text style={styles.statsLabel}>Rating</Text>
              </View>
            </View>

            {/* Quick Actions — like MTN's "Digital Services" horizontal scroll */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActionsScroll}
            >
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => navigation.getParent()?.navigate('Bookings')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIconCircle, { backgroundColor: theme.successBg }]}>
                  <Ionicons name="calendar" size={22} color={theme.success} />
                </View>
                <Text style={styles.quickActionLabel}>View Bookings</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.textTertiary} style={styles.quickActionArrow} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => navigation.getParent()?.navigate('Services')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIconCircle, { backgroundColor: theme.accentBg }]}>
                  <Ionicons name="add-circle" size={22} color={theme.accent} />
                </View>
                <Text style={styles.quickActionLabel}>Add Service</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.textTertiary} style={styles.quickActionArrow} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => navigation.getParent()?.navigate('Staff')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIconCircle, { backgroundColor: theme.infoBg }]}>
                  <Ionicons name="people" size={22} color={theme.info} />
                </View>
                <Text style={styles.quickActionLabel}>Manage Staff</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.textTertiary} style={styles.quickActionArrow} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => navigation.navigate('EditSalon')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIconCircle, { backgroundColor: theme.warningBg }]}>
                  <Ionicons name="create" size={22} color={theme.warning} />
                </View>
                <Text style={styles.quickActionLabel}>Edit Salon</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.textTertiary} style={styles.quickActionArrow} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => navigation.navigate('QRScanner')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIconCircle, { backgroundColor: theme.dangerBg }]}>
                  <Ionicons name="qr-code" size={22} color={theme.danger} />
                </View>
                <Text style={styles.quickActionLabel}>Scan QR</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.textTertiary} style={styles.quickActionArrow} />
              </TouchableOpacity>
            </ScrollView>

            {/* Today's Schedule Header */}
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Today's Schedule</Text>
                <Text style={styles.dateText}>
                  {format(new Date(), 'EEEE, MMMM d')}
                </Text>
              </View>
              {todayBookings.length > 0 && (
                <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Bookings')}>
                  <Text style={styles.seeAllText}>See All →</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            colors={[theme.accent]}
            tintColor={theme.text}
          />
        }
      />
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
  // ─── Header ───
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 36,
    height: 36,
  },
  greeting: {
    color: theme.textSecondary,
  },
  salonName: {
    fontWeight: 'bold',
    color: theme.accent,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.notificationBadge,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // ─── Section Headers ───
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: theme.text,
    fontSize: 18,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    color: theme.textSecondary,
    marginTop: 2,
    fontSize: 13,
  },
  seeAllText: {
    color: theme.accent,
    fontWeight: '600',
    fontSize: 14,
  },
  // ─── Stats Grid ───
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statsCard: {
    width: '47%',
    backgroundColor: theme.surfaceVariant,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  statsCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsValue: {
    fontWeight: 'bold',
    color: theme.text,
    fontSize: 22,
    marginBottom: 2,
  },
  statsLabel: {
    color: theme.textSecondary,
    fontSize: 12,
  },
  // ─── Quick Actions ───
  quickActionsScroll: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
  },
  quickActionCard: {
    width: 100,
    backgroundColor: theme.surfaceVariant,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  quickActionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    color: theme.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  quickActionArrow: {
    marginTop: 4,
  },
  // ─── Booking Cards ───
  listContent: {
    paddingBottom: 24,
  },
  bookingCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.surface,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: theme.border,
  },
  bookingTimeColumn: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingTime: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.accent,
  },
  bookingDuration: {
    fontSize: 11,
    color: theme.textTertiary,
    marginTop: 2,
  },
  bookingDivider: {
    width: 1,
    backgroundColor: theme.border,
    marginHorizontal: 12,
  },
  bookingContent: {
    flex: 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  customerInfo: {
    flex: 1,
    marginRight: 8,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  serviceName: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
  },
  statusChip: {
    height: 26,
    justifyContent: 'center',
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  // ─── Empty State ───
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: theme.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

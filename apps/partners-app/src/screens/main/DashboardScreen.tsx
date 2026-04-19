import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  Surface,
  Divider,
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
import { Booking, MainStackParamList } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubscriptionStatusCard from '../../components/SubscriptionStatusCard';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

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
    .reduce((sum: number, b: Booking) => sum + b.finalAmount, 0);

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mySalon'] });
    queryClient.invalidateQueries({ queryKey: ['salonStats'] });
    queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
  }, [queryClient]);

  const navigateToBooking = (bookingId: string) => {
    navigation.navigate('BookingDetail', { bookingId });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '#FCD116';
      case 'CONFIRMED':
        return '#006B3F';
      case 'COMPLETED':
        return '#10B981';
      case 'CANCELLED':
        return '#EF4444';
      default:
        return '#9CA3AF';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '#111827';
      default:
        return '#FFFFFF';
    }
  };

  const formatTime = (time: string) => {
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

  const renderBookingItem = ({ item }: { item: Booking }) => (
    <TouchableOpacity onPress={() => navigateToBooking(item.id)} activeOpacity={0.7}>
      <Surface style={styles.bookingCard} elevation={0}>
        <View style={styles.bookingTimeColumn}>
          <Text style={styles.bookingTime}>{formatTime(item.startTime)}</Text>
          <Text style={styles.bookingDuration}>{item.service.duration}min</Text>
        </View>
        <View style={styles.bookingDivider} />
        <View style={styles.bookingContent}>
          <View style={styles.bookingHeader}>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>
                {item.customer.firstName} {item.customer.lastName}
              </Text>
              <Text style={styles.serviceName}>{item.service.name}</Text>
            </View>
            <Chip
              mode="flat"
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
              textStyle={[styles.statusText, { color: getStatusTextColor(item.status) }]}
            >
              {item.status}
            </Chip>
          </View>
          <View style={styles.bookingFooter}>
            <Text style={styles.bookingPrice}>GH₵{item.finalAmount.toLocaleString()}</Text>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
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
        <ActivityIndicator size="large" color="#006B3F" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={todayBookings.sort((a: Booking, b: Booking) => a.startTime.localeCompare(b.startTime))}
        keyExtractor={(item) => item.id}
        renderItem={renderBookingItem}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Image
                  source={require('../../assets/logo-black.png')}
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
                onPress={() => {}}
              >
                <Ionicons name="notifications-outline" size={24} color="#111827" />
                {pendingBookings.length > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>{pendingBookings.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Stats Cards - 2x2 Grid */}
            <View style={styles.statsGrid}>
              {/* Today's Bookings */}
              <View style={[styles.statsCard, { borderLeftColor: '#006B3F' }]}>
                <View style={[styles.statsIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="calendar-today" size={20} color="#006B3F" />
                </View>
                <Text variant="labelSmall" style={styles.statsLabel}>
                  Today's Bookings
                </Text>
                <Text variant="headlineSmall" style={[styles.statsValue, { color: '#006B3F' }]}>
                  {todayBookings.length}
                </Text>
              </View>

              {/* Revenue */}
              <View style={[styles.statsCard, { borderLeftColor: '#FCD116' }]}>
                <View style={[styles.statsIcon, { backgroundColor: '#FEF9E7' }]}>
                  <Ionicons name="cash" size={20} color="#D4A017" />
                </View>
                <Text variant="labelSmall" style={styles.statsLabel}>
                  Weekly Revenue
                </Text>
                <Text variant="headlineSmall" style={[styles.statsValue, { color: '#D4A017' }]}>
                  GH₵{weeklyRevenue.toLocaleString()}
                </Text>
              </View>

              {/* Pending */}
              <View style={[styles.statsCard, { borderLeftColor: '#CE1126' }]}>
                <View style={[styles.statsIcon, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="time" size={20} color="#CE1126" />
                </View>
                <Text variant="labelSmall" style={styles.statsLabel}>
                  Pending
                </Text>
                <Text variant="headlineSmall" style={[styles.statsValue, { color: '#CE1126' }]}>
                  {pendingBookings.length}
                </Text>
              </View>

              {/* Rating */}
              <View style={[styles.statsCard, { borderLeftColor: '#3B82F6' }]}>
                <View style={[styles.statsIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="star" size={20} color="#3B82F6" />
                </View>
                <Text variant="labelSmall" style={styles.statsLabel}>
                  Rating
                </Text>
                <Text variant="headlineSmall" style={[styles.statsValue, { color: '#3B82F6' }]}>
                  {stats?.averageRating ? stats.averageRating.toFixed(1) : '-'}
                </Text>
              </View>
            </View>

            {/* Subscription Status Card */}
            <SubscriptionStatusCard />

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.getParent()?.navigate('Bookings')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionButtonIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="list" size={22} color="#006B3F" />
                </View>
                <Text style={styles.actionButtonText}>All Bookings</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.getParent()?.navigate('Services')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionButtonIcon, { backgroundColor: '#FEF9E7' }]}>
                  <Ionicons name="add-circle" size={22} color="#D4A017" />
                </View>
                <Text style={styles.actionButtonText}>Add Service</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.getParent()?.navigate('Staff')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionButtonIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="people" size={22} color="#3B82F6" />
                </View>
                <Text style={styles.actionButtonText}>Manage Staff</Text>
              </TouchableOpacity>
            </View>

            {/* Today's Appointments Header */}
            <View style={styles.sectionHeader}>
              <View>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                  Today's Appointments
                </Text>
                <Text variant="bodyMedium" style={styles.dateText}>
                  {format(new Date(), 'EEEE, MMMM d')}
                </Text>
              </View>
              {todayBookings.length > 0 && (
                <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Bookings')}>
                  <Text style={styles.seeAllText}>See All</Text>
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
            colors={['#006B3F']}
            tintColor="#006B3F"
          />
        }
      />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
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
    color: '#6B7280',
  },
  salonName: {
    fontWeight: 'bold',
    color: '#006B3F',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#CE1126',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statsCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  statsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsLabel: {
    color: '#6B7280',
    marginBottom: 2,
  },
  statsValue: {
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#111827',
  },
  dateText: {
    color: '#6B7280',
    marginTop: 2,
  },
  seeAllText: {
    color: '#006B3F',
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 24,
  },
  bookingCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  bookingTimeColumn: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#006B3F',
  },
  bookingDuration: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  bookingDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
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
    color: '#111827',
  },
  serviceName: {
    fontSize: 13,
    color: '#6B7280',
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
    color: '#006B3F',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#111827',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});

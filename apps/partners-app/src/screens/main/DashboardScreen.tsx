import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  FlatList,
  TouchableOpacity,
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
import { salonApi } from '../../api/salon';
import { bookingsApi } from '../../api/bookings';
import { useAuthStore } from '../../store/authStore';
import { Booking, MainStackParamList } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const renderBookingItem = ({ item }: { item: Booking }) => (
    <TouchableOpacity onPress={() => navigateToBooking(item.id)}>
      <Surface style={styles.bookingCard} elevation={1}>
        <View style={styles.bookingHeader}>
          <Text variant="titleMedium" style={styles.customerName}>
            {item.customer.firstName} {item.customer.lastName}
          </Text>
          <Chip
            mode="flat"
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
            textStyle={styles.statusText}
          >
            {item.status}
          </Chip>
        </View>
        <View style={styles.bookingDetails}>
          <Text variant="bodyMedium" style={styles.serviceName}>
            {item.service.name}
          </Text>
          <Text variant="bodyMedium" style={styles.timeText}>
            {formatTime(item.startTime)} - {formatTime(item.endTime)}
          </Text>
        </View>
      </Surface>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text variant="titleMedium" style={styles.emptyTitle}>
        No Appointments Today
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        Your schedule is clear for today.
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
              <Text variant="headlineSmall" style={styles.greeting}>
                Welcome back,
              </Text>
              <Text variant="headlineMedium" style={styles.salonName}>
                {salon?.businessName || user?.firstName || 'Partner'}
              </Text>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsRow}>
              <Surface style={styles.statsCard} elevation={2}>
                <Text variant="labelMedium" style={styles.statsLabel}>
                  Today's Bookings
                </Text>
                <Text variant="headlineMedium" style={styles.statsValue}>
                  {todayBookings.length}
                </Text>
              </Surface>
              <Surface style={styles.statsCard} elevation={2}>
                <Text variant="labelMedium" style={styles.statsLabel}>
                  Weekly Revenue
                </Text>
                <Text variant="headlineMedium" style={styles.statsValue}>
                  GH₵{weeklyRevenue.toLocaleString()}
                </Text>
              </Surface>
              <Surface style={styles.statsCard} elevation={2}>
                <Text variant="labelMedium" style={styles.statsLabel}>
                  Pending
                </Text>
                <Text variant="headlineMedium" style={styles.statsValue}>
                  {pendingBookings.length}
                </Text>
              </Surface>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <Button
                mode="outlined"
                onPress={() => navigation.getParent()?.navigate('Bookings')}
                style={styles.actionButton}
                textColor="#006B3F"
              >
                View All Bookings
              </Button>
              <Button
                mode="outlined"
                onPress={() => navigation.getParent()?.navigate('Services')}
                style={styles.actionButton}
                textColor="#006B3F"
              >
                Add Service
              </Button>
              <Button
                mode="outlined"
                onPress={() => navigation.getParent()?.navigate('Staff')}
                style={styles.actionButton}
                textColor="#006B3F"
              >
                Manage Staff
              </Button>
            </View>

            {/* Today's Appointments Header */}
            <View style={styles.sectionHeader}>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Today's Appointments
              </Text>
              <Text variant="bodyMedium" style={styles.dateText}>
                {format(new Date(), 'EEEE, MMMM d')}
              </Text>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    color: '#6B7280',
  },
  salonName: {
    fontWeight: 'bold',
    color: '#006B3F',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 8,
  },
  statsCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  statsLabel: {
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  statsValue: {
    fontWeight: 'bold',
    color: '#006B3F',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderColor: '#006B3F',
    borderRadius: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#111827',
  },
  dateText: {
    color: '#6B7280',
  },
  listContent: {
    paddingBottom: 24,
  },
  bookingCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  statusChip: {
    height: 28,
    justifyContent: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bookingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceName: {
    color: '#6B7280',
    flex: 1,
  },
  timeText: {
    color: '#006B3F',
    fontWeight: '500',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#9CA3AF',
  },
});

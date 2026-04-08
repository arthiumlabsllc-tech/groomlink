import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  Text,
  SegmentedButtons,
  Surface,
  Chip,
  ActivityIndicator,
  Button,
  Divider,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { salonApi } from '../../api/salon';
import { bookingsApi } from '../../api/bookings';
import { Booking, BookingStatus, MainStackParamList } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const STATUS_FILTERS: { value: BookingStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function BookingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  // Fetch salon data
  const { data: salon } = useQuery({
    queryKey: ['mySalon'],
    queryFn: salonApi.getMySalon,
  });

  // Fetch bookings
  const {
    data: bookingsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['salonBookings', salon?.id, statusFilter, page],
    queryFn: () =>
      salon
        ? bookingsApi.getSalonBookings({
            salonId: salon.id,
            status: statusFilter === 'ALL' ? undefined : statusFilter,
            page,
            limit: 20,
          })
        : null,
    enabled: !!salon?.id,
  });

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['salonBookings', salon?.id] });
  }, [queryClient, salon?.id]);

  const navigateToBooking = (bookingId: string) => {
    navigation.navigate('BookingDetail', { bookingId });
  };

  const getStatusColor = (status: BookingStatus) => {
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
    const date = parseISO(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Today';
    } else if (format(date, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) {
      return 'Tomorrow';
    }
    return format(date, 'MMM d, yyyy');
  };

  const renderBookingItem = ({ item }: { item: Booking }) => (
    <TouchableOpacity onPress={() => navigateToBooking(item.id)}>
      <Surface style={styles.bookingCard} elevation={1}>
        <View style={styles.bookingHeader}>
          <View style={styles.customerInfo}>
            <Text variant="titleMedium" style={styles.customerName}>
              {item.customer.firstName} {item.customer.lastName}
            </Text>
            <Text variant="bodySmall" style={styles.phoneText}>
              {item.customer.phoneNumber}
            </Text>
          </View>
          <Chip
            mode="flat"
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
            textStyle={styles.statusText}
          >
            {item.status}
          </Chip>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <Text variant="bodyMedium" style={styles.detailLabel}>Service:</Text>
            <Text variant="bodyMedium" style={styles.detailValue}>{item.service.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text variant="bodyMedium" style={styles.detailLabel}>Date:</Text>
            <Text variant="bodyMedium" style={styles.detailValue}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text variant="bodyMedium" style={styles.detailLabel}>Time:</Text>
            <Text variant="bodyMedium" style={styles.detailValue}>
              {formatTime(item.startTime)}
            </Text>
          </View>
        </View>
        <View style={styles.bookingFooter}>
          <Text variant="titleMedium" style={styles.price}>
            GH₵{item.finalAmount.toLocaleString()}
          </Text>
          <Text variant="bodySmall" style={styles.tapHint}>
            Tap for details →
          </Text>
        </View>
      </Surface>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text variant="titleMedium" style={styles.emptyTitle}>
        No {statusFilter === 'ALL' ? '' : statusFilter.toLowerCase()} bookings
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        {statusFilter === 'ALL'
          ? 'You have no bookings yet.'
          : `You have no ${statusFilter.toLowerCase()} bookings.`}
      </Text>
      <Button
        mode="outlined"
        onPress={() => setStatusFilter('ALL')}
        style={styles.viewAllButton}
        textColor="#006B3F"
      >
        View All Bookings
      </Button>
    </View>
  );

  const renderFooter = () => {
    if (!bookingsData?.pagination || bookingsData.pagination.page >= bookingsData.pagination.totalPages) {
      return null;
    }
    return (
      <View style={styles.loadMore}>
        <Button
          mode="outlined"
          onPress={() => setPage((p) => p + 1)}
          loading={isLoading}
          textColor="#006B3F"
        >
          Load More
        </Button>
      </View>
    );
  };

  if (!salon) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006B3F" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as BookingStatus | 'ALL');
            setPage(1);
          }}
          buttons={STATUS_FILTERS.slice(0, 3).map((f) => ({
            value: f.value,
            label: f.label,
          }))}
          style={styles.segmentedButtons}
        />
        <SegmentedButtons
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as BookingStatus | 'ALL');
            setPage(1);
          }}
          buttons={STATUS_FILTERS.slice(3).map((f) => ({
            value: f.value,
            label: f.label,
          }))}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Bookings List */}
      <FlatList
        data={bookingsData?.data || []}
        keyExtractor={(item) => item.id}
        renderItem={renderBookingItem}
        ListEmptyComponent={isLoading ? null : renderEmptyState}
        ListFooterComponent={renderFooter}
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
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  segmentedButtons: {
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  bookingCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontWeight: '600',
    color: '#111827',
  },
  phoneText: {
    color: '#6B7280',
    marginTop: 2,
  },
  statusChip: {
    height: 28,
    justifyContent: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    marginBottom: 12,
  },
  bookingDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    color: '#6B7280',
  },
  detailValue: {
    color: '#111827',
    fontWeight: '500',
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontWeight: 'bold',
    color: '#006B3F',
  },
  tapHint: {
    color: '#9CA3AF',
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
    textAlign: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    borderColor: '#006B3F',
    borderRadius: 8,
  },
  loadMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

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
  Surface,
  Chip,
  ActivityIndicator,
  Button,
  Divider,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { salonApi } from '../../api/salon';
import { bookingsApi } from '../../api/bookings';
import { Booking, BookingStatus, MainStackParamList } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const STATUS_FILTERS: { value: BookingStatus | 'ALL'; label: string; color: string }[] = [
  { value: 'ALL', label: 'All', color: '#6B7280' },
  { value: 'PENDING', label: 'Pending', color: '#FCD116' },
  { value: 'CONFIRMED', label: 'Confirmed', color: '#006B3F' },
  { value: 'COMPLETED', label: 'Completed', color: '#10B981' },
  { value: 'CANCELLED', label: 'Cancelled', color: '#EF4444' },
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

  const getStatusTextColor = (status: BookingStatus) => {
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
    <TouchableOpacity onPress={() => navigateToBooking(item.id)} activeOpacity={0.7}>
      <Surface style={styles.bookingCard} elevation={0}>
        {/* Status Bar */}
        <View style={[styles.statusBar, { backgroundColor: getStatusColor(item.status) }]} />
        
        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.bookingHeader}>
            <View style={styles.customerSection}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {item.customer.firstName[0]}{item.customer.lastName[0]}
                </Text>
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>
                  {item.customer.firstName} {item.customer.lastName}
                </Text>
                <View style={styles.phoneRow}>
                  <Ionicons name="call-outline" size={12} color="#9CA3AF" />
                  <Text style={styles.phoneText}>{item.customer.phoneNumber}</Text>
                </View>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Chip
                mode="flat"
                style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
                textStyle={[styles.statusText, { color: getStatusTextColor(item.status) }]}
              >
                {item.status}
              </Chip>
              {item.isGroupBooking && (
                <Chip
                  mode="flat"
                  style={styles.groupChip}
                  textStyle={styles.groupChipText}
                  icon="people"
                >
                  Group · {item.totalPeople || item.guests?.length || 0}
                </Chip>
              )}
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Details */}
          <View style={styles.bookingDetails}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="cut-outline" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{item.service.name}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{formatDate(item.date)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{formatTime(item.startTime)}</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.bookingFooter}>
            <Text style={styles.price}>GH₵{item.finalAmount.toLocaleString()}</Text>
            <View style={styles.tapHint}>
              <Text style={styles.tapHintText}>View Details</Text>
              <Ionicons name="chevron-forward" size={16} color="#006B3F" />
            </View>
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
        No {statusFilter === 'ALL' ? '' : statusFilter.toLowerCase()} bookings
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        {statusFilter === 'ALL'
          ? 'You have no bookings yet. They will appear here.'
          : `You have no ${statusFilter.toLowerCase()} bookings.`}
      </Text>
      {statusFilter !== 'ALL' && (
        <Button
          mode="outlined"
          onPress={() => setStatusFilter('ALL')}
          style={styles.viewAllButton}
          textColor="#006B3F"
          theme={{ roundness: 10 }}
        >
          View All Bookings
        </Button>
      )}
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
          theme={{ roundness: 10 }}
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
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.headerTitle}>Bookings</Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          Manage your appointments
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isActive = statusFilter === item.value;
            return (
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  isActive && { backgroundColor: item.color, borderColor: item.color },
                ]}
                onPress={() => {
                  setStatusFilter(item.value);
                  setPage(1);
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.filterTabText,
                  isActive && styles.filterTabTextActive,
                  isActive && item.value === 'PENDING' && { color: '#111827' },
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    color: '#6B7280',
    marginTop: 2,
  },
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  filterTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  bookingCard: {
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  statusBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#006B3F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  phoneText: {
    fontSize: 12,
    color: '#9CA3AF',
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
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  groupChip: {
    height: 24,
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#E9D5FF',
  },
  groupChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7C3AED',
  },
  divider: {
    marginBottom: 10,
  },
  bookingDetails: {
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  detailText: {
    fontSize: 13,
    color: '#374151',
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#006B3F',
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: 12,
    color: '#006B3F',
    fontWeight: '500',
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
    marginBottom: 16,
  },
  viewAllButton: {
    borderColor: '#006B3F',
  },
  loadMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

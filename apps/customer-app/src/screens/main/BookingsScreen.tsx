import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
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
import { bookingApi } from '../../api/booking';
import { Booking } from '../../types';

type TabType = 'upcoming' | 'past';

const UPCOMING_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'];
const PAST_STATUSES = ['COMPLETED', 'CANCELLED'];

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#FFA500',
  CONFIRMED: '#006B3F',
  IN_PROGRESS: '#2196F3',
  COMPLETED: '#4CAF50',
  CANCELLED: '#CE1126',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function BookingsScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const { data: bookings, isLoading, error, refetch } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingApi.getMyBookings(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    
    const statusList = activeTab === 'upcoming' ? UPCOMING_STATUSES : PAST_STATUSES;
    return bookings.filter(booking => statusList.includes(booking.status));
  }, [bookings, activeTab]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const renderBookingCard = useCallback(({ item }: { item: Booking }) => {
    const statusColor = STATUS_COLORS[item.status] || '#666';
    const statusLabel = STATUS_LABELS[item.status] || item.status;
    
    return (
      <Card
        style={styles.bookingCard}
        onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.salonInfo}>
              <Text variant="titleMedium" style={styles.salonName}>
                {item.salon?.businessName || 'Salon'}
              </Text>
              <View style={styles.dateTimeRow}>
                <Ionicons name="calendar-outline" size={14} color="#666" />
                <Text variant="bodySmall" style={styles.dateTimeText}>
                  {formatDate(item.scheduledDate)} • {formatTime(item.scheduledTime)}
                </Text>
              </View>
            </View>
            <Chip
              style={[styles.statusChip, { backgroundColor: `${statusColor}15` }]}
              textStyle={{ color: statusColor, fontSize: 12 }}
            >
              {statusLabel}
            </Chip>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.servicesRow}>
            <Text variant="bodySmall" style={styles.servicesLabel}>Services: </Text>
            <Text variant="bodySmall" style={styles.servicesText} numberOfLines={1}>
              {item.services?.map(s => s.name).join(', ')}
            </Text>
          </View>

          {item.worker && (
            <View style={styles.workerRow}>
              <Ionicons name="person-outline" size={14} color="#666" />
              <Text variant="bodySmall" style={styles.workerText}>
                {item.worker.name}
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text variant="titleMedium" style={styles.totalAmount}>
              GH₵ {item.totalAmount.toFixed(2)}
            </Text>
            {item.status === 'CONFIRMED' && (
              <Button
                mode="text"
                compact
                onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
                textColor="#006B3F"
              >
                View Details
              </Button>
            )}
            {item.status === 'PENDING' && (
              <Button
                mode="text"
                compact
                onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
                textColor="#FFA500"
              >
                Confirm
              </Button>
            )}
            {item.status === 'COMPLETED' && (
              <Button
                mode="text"
                compact
                onPress={() => navigation.navigate('RateBooking', { bookingId: item.id })}
                textColor="#006B3F"
              >
                Rate
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  }, [navigation]);

  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyState}>
        <Ionicons
          name={activeTab === 'upcoming' ? 'calendar-outline' : 'checkmark-done-outline'}
          size={64}
          color="#ccc"
        />
        <Text variant="titleMedium" style={styles.emptyTitle}>
          No {activeTab} bookings
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtitle}>
          {activeTab === 'upcoming'
            ? 'Your upcoming appointments will appear here'
            : 'Your past appointments will appear here'}
        </Text>
        {activeTab === 'upcoming' && (
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Search')}
            style={styles.bookNowButton}
          >
            Book an Appointment
          </Button>
        )}
      </View>
    );
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#CE1126" />
          <Text variant="titleMedium" style={styles.errorTitle}>Failed to load bookings</Text>
          <Button mode="contained" onPress={() => refetch()} style={styles.retryButton}>
            Retry
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.headerTitle}>My Bookings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
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
          <ActivityIndicator size="large" color="#006B3F" />
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBookingCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#006B3F']} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#006B3F',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    borderBottomColor: '#006B3F',
  },
  tabText: {
    color: '#666',
  },
  activeTabText: {
    color: '#006B3F',
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: '#006B3F',
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
  bookingCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  cardContent: {
    padding: 16,
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
    color: '#006B3F',
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dateTimeText: {
    color: '#666',
    marginLeft: 4,
  },
  statusChip: {
    height: 28,
  },
  divider: {
    marginVertical: 12,
  },
  servicesRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  servicesLabel: {
    color: '#888',
  },
  servicesText: {
    flex: 1,
    color: '#444',
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  workerText: {
    color: '#666',
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  totalAmount: {
    fontWeight: '600',
    color: '#006B3F',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    marginTop: 16,
    color: '#666',
  },
  emptySubtitle: {
    marginTop: 8,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  bookNowButton: {
    marginTop: 24,
    backgroundColor: '#006B3F',
    borderRadius: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    marginTop: 16,
    color: '#CE1126',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#006B3F',
  },
});

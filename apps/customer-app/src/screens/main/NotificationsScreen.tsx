import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Text,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { notificationApi, NotificationType, Notification } from '../../api/notification';
import { useNotificationStore } from '../../store/notificationStore';
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
  unreadBg: t.surfaceVariant,
});

// Brand/status colors used by icon helper (don't depend on theme)
const ICON_COLORS = {
  accentRed: '#CE1126',
  primaryGreen: '#006B3F',
  neutralGray: '#6B7280',
};

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getNotificationIcon(type: NotificationType): { name: string; color: string } {
  switch (type) {
    case 'BOOKING_CONFIRMED':
      return { name: 'check-circle', color: '#16A34A' };
    case 'BOOKING_CANCELLED':
      return { name: 'close-circle', color: ICON_COLORS.accentRed };
    case 'BOOKING_REMINDER':
      return { name: 'alarm', color: '#D97706' };
    case 'BOOKING_COMPLETED':
      return { name: 'check-all', color: '#16A34A' };
    case 'PAYMENT_RECEIVED':
      return { name: 'cash', color: '#16A34A' };
    case 'PAYMENT_FAILED':
      return { name: 'cash-remove', color: ICON_COLORS.accentRed };
    case 'BOOKING_CREATED':
      return { name: 'calendar-plus', color: ICON_COLORS.primaryGreen };
    case 'CHECKIN':
      return { name: 'qrcode-scan', color: '#7C3AED' };
    case 'REVIEW':
      return { name: 'star', color: '#D97706' };
    case 'PROMOTION':
      return { name: 'tag', color: '#2563EB' };
    case 'SYSTEM':
      return { name: 'information', color: ICON_COLORS.neutralGray };
    default:
      return { name: 'bell', color: ICON_COLORS.neutralGray };
  }
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { setNotifications, markAsRead, markAllAsRead, notifications: localNotifications } = useNotificationStore();

  const {
    data: apiResponse,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getNotifications(1, 50),
  });

  // Sync API data to local store whenever it changes
  const notifications = apiResponse?.notifications || localNotifications;

  // Sync to store on successful fetch
  React.useEffect(() => {
    if (apiResponse?.notifications) {
      setNotifications(apiResponse.notifications);
    }
  }, [apiResponse, setNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    markAllAsRead();
    try {
      await notificationApi.markAllAsRead();
    } catch (e) {
      console.log('Failed to mark all as read on server:', e);
    }
  }, [markAllAsRead]);

  const handleNotificationPress = useCallback(
    async (notification: Notification) => {
      if (!notification.isRead) {
        markAsRead(notification.id);
        try {
          await notificationApi.markAsRead(notification.id);
        } catch (e) {
          console.log('Failed to mark as read on server:', e);
        }
      }

      // Navigate to booking detail if bookingId exists in data
      const bookingId = notification.data?.bookingId;
      if (bookingId) {
        navigation.navigate('BookingDetail', { bookingId });
      }
    },
    [markAsRead, navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => {
      const icon = getNotificationIcon(item.type);
      return (
        <TouchableOpacity
          style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: `${icon.color}15` }]}>
            <MaterialCommunityIcons name={icon.name as any} size={24} color={icon.color} />
          </View>
          <View style={styles.contentContainer}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, !item.isRead && styles.unreadTitle]} numberOfLines={1}>
                {item.title}
              </Text>
              {!item.isRead && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.message} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={styles.time}>{getRelativeTime(item.createdAt)}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [handleNotificationPress]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="bell-off-outline" size={64} color={COLORS.border} />
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptySubtitle}>
        When you get notifications, they'll show up here
      </Text>
    </View>
  );

  const sortedNotifications = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Image
          source={isDark ? require('../../../assets/logo-full-white.png') : require('../../../assets/logo-full-black.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
          <Text style={styles.markAllText}>Mark All Read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[COLORS.primaryGreen]}
            tintColor={COLORS.primaryGreen}
          />
        }
        contentContainerStyle={sortedNotifications.length === 0 ? styles.emptyList : styles.list}
      />
    </SafeAreaView>
  );
}

const createStyles = (COLORS: ReturnType<typeof createColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  headerLogo: {
    width: 100,
    height: 28,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  markAllButton: {
    padding: 4,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },
  list: {
    paddingVertical: 8,
  },
  emptyList: {
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.cardBackground,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: COLORS.unreadBg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primaryGreen,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryGreen,
  },
  message: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
    lineHeight: 18,
  },
  time: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
});

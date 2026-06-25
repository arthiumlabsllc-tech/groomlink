import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Surface,
  Button,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNotificationStore, AppNotification } from '../../store/notificationStore';
import { useAppTheme } from '../../theme/ThemeContext';
import { AppTheme } from '../../theme/colors';
import { MainStackParamList } from '../../types/navigation';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const NOTIFICATION_CONFIG: Record<
  AppNotification['type'],
  { icon: string; color: string }
> = {
  booking_new: { icon: 'calendar-plus', color: '#006B3F' },
  booking_checkin: { icon: 'account-check', color: '#2196F3' },
  booking_completed: { icon: 'check-circle', color: '#FFB300' },
  booking_cancelled: { icon: 'calendar-remove', color: '#F44336' },
  booking_no_show: { icon: 'account-cancel', color: '#F59E0B' },
};

export default function NotificationsListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const notifications = useNotificationStore((state) => state.notifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const clearAll = useNotificationStore((state) => state.clearAll);

  const handleNotificationPress = (notification: AppNotification) => {
    markAsRead(notification.id);
    if (notification.data?.bookingId) {
      navigation.navigate('BookingDetail', { bookingId: notification.data.bookingId });
    }
  };

  const renderNotificationItem = ({ item }: { item: AppNotification }) => {
    const config = NOTIFICATION_CONFIG[item.type];
    const isUnread = !item.read;

    return (
      <TouchableOpacity
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <Surface
          style={[
            styles.notificationCard,
            isUnread && {
              borderLeftWidth: 3,
              borderLeftColor: config.color,
            },
          ]}
          elevation={0}
        >
          <View style={styles.cardInner}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${config.color}18` },
              ]}
            >
              <MaterialCommunityIcons
                name={config.icon as any}
                size={22}
                color={config.color}
              />
            </View>

            <View style={styles.contentContainer}>
              <Text
                style={[
                  styles.titleText,
                  { color: theme.text },
                  isUnread && styles.titleUnread,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text
                style={[styles.messageText, { color: theme.textSecondary }]}
                numberOfLines={2}
              >
                {item.message}
              </Text>
              <Text style={[styles.timeText, { color: theme.textTertiary }]}>
                {getRelativeTime(item.timestamp)}
              </Text>
            </View>

            {isUnread && <View style={styles.unreadDot} />}
          </View>
        </Surface>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View
        style={[
          styles.emptyIconContainer,
          { backgroundColor: theme.surfaceVariant },
        ]}
      >
        <MaterialCommunityIcons
          name="bell-off"
          size={40}
          color={theme.textTertiary}
        />
      </View>
      <Text
        variant="titleMedium"
        style={[styles.emptyTitle, { color: theme.text }]}
      >
        No notifications yet
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.emptySubtitle, { color: theme.textSecondary }]}
      >
        New booking alerts will appear here
      </Text>
    </View>
  );

  const hasNotifications = notifications.length > 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <Text
          variant="headlineSmall"
          style={[styles.headerTitle, { color: theme.text }]}
        >
          Notifications
        </Text>
        {hasNotifications && (
          <TouchableOpacity onPress={markAllAsRead} activeOpacity={0.7}>
            <Text style={[styles.markAllText, { color: theme.primary }]}>
              Mark All Read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotificationItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          !hasNotifications && styles.emptyListContent,
        ]}
      />

      {hasNotifications && (
        <View
          style={[
            styles.clearAllContainer,
            { backgroundColor: theme.background, borderTopColor: theme.border },
          ]}
        >
          <Button
            mode="outlined"
            onPress={clearAll}
            textColor={theme.danger}
            style={styles.clearAllButton}
            theme={{ roundness: 10 }}
          >
            Clear All
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerTitle: {
      fontWeight: 'bold',
    },
    markAllText: {
      fontSize: 14,
      fontWeight: '600',
    },
    listContent: {
      padding: 16,
      paddingBottom: 24,
    },
    emptyListContent: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    notificationCard: {
      marginBottom: 12,
      borderRadius: 14,
      backgroundColor: theme.surface,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 2,
      elevation: 1,
    },
    cardInner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
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
    titleText: {
      fontSize: 15,
      fontWeight: '500',
      marginBottom: 2,
    },
    titleUnread: {
      fontWeight: '700',
    },
    messageText: {
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 4,
    },
    timeText: {
      fontSize: 12,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.primary,
      marginLeft: 8,
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      marginBottom: 8,
      fontWeight: '600',
    },
    emptySubtitle: {
      textAlign: 'center',
    },
    clearAllContainer: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderTopWidth: 1,
    },
    clearAllButton: {
      borderColor: theme.danger,
    },
  });

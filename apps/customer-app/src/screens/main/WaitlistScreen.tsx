import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { waitlistApi, WaitlistEntry } from '../../api/waitlist';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

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

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  WAITING: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', label: 'Waiting' },
  NOTIFIED: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', label: 'Notified' },
  CANCELLED: { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.15)', label: 'Cancelled' },
  EXPIRED: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', label: 'Expired' },
};

export default function WaitlistScreen() {
  const { theme } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: entries, isLoading, error, refetch } = useQuery({
    queryKey: ['waitlist'],
    queryFn: () => waitlistApi.getMyWaitlist(),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => waitlistApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      Alert.alert('Cancelled', 'You have been removed from the waitlist.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to cancel waitlist entry.');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCancel = useCallback((entry: WaitlistEntry) => {
    Alert.alert(
      'Cancel Waitlist',
      `Leave the waitlist for ${entry.salonName}?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(entry.id),
        },
      ]
    );
  }, [cancelMutation]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const renderItem = useCallback(({ item }: { item: WaitlistEntry }) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.WAITING;
    const isActive = item.status === 'WAITING' || item.status === 'NOTIFIED';

    return (
      <Card style={styles.entryCard}>
        <Card.Content style={styles.entryContent}>
          <View style={styles.entryHeader}>
            <View style={styles.entryInfo}>
              <Text variant="titleSmall" style={styles.salonName} numberOfLines={1}>
                {item.salonName}
              </Text>
              {item.serviceName && (
                <Text variant="bodySmall" style={styles.serviceName}>
                  {item.serviceName}
                </Text>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          {isActive && (
            <View style={styles.positionRow}>
              <View style={styles.positionItem}>
                <Ionicons name="people-outline" size={16} color={COLORS.primaryGreen} />
                <Text variant="bodySmall" style={styles.positionText}>
                  Position #{item.position}
                </Text>
              </View>
              <View style={styles.positionItem}>
                <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                <Text variant="bodySmall" style={styles.waitText}>
                  ~{item.estimatedWait} min
                </Text>
              </View>
            </View>
          )}

          <View style={styles.entryFooter}>
            <Text variant="bodySmall" style={styles.dateText}>
              Joined {formatDate(item.createdAt)}
            </Text>
            {isActive && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancel(item)}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? (
                  <ActivityIndicator size="small" color={COLORS.accentRed} />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={16} color={COLORS.accentRed} />
                    <Text style={styles.cancelText}>Leave</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  }, [styles, COLORS, handleCancel, cancelMutation.isPending]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primaryGreen} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.accentRed} />
          <Text variant="bodyMedium" style={styles.errorText}>Failed to load waitlist</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const waitlistEntries = entries || [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        data={waitlistEntries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryGreen]} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.headerTitle}>My Waitlist</Text>
            <Text variant="bodyMedium" style={styles.headerSubtitle}>
              {waitlistEntries.filter(e => e.status === 'WAITING' || e.status === 'NOTIFIED').length} active
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="hourglass-outline" size={64} color={COLORS.textSecondary} />
            <Text variant="titleMedium" style={styles.emptyTitle}>No waitlist entries</Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Join a salon's waitlist when all slots are full and we'll notify you when it's your turn
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const createStyles = (COLORS: ReturnType<typeof createColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  entryCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  entryContent: {
    padding: 14,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  entryInfo: {
    flex: 1,
    marginRight: 8,
  },
  salonName: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  serviceName: {
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  positionRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  positionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  positionText: {
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  waitText: {
    color: COLORS.textSecondary,
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    color: COLORS.textSecondary,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(206, 17, 38, 0.08)',
  },
  cancelText: {
    color: COLORS.accentRed,
    fontWeight: '600',
    fontSize: 13,
  },
  errorText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
  retryText: {
    marginTop: 8,
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 4,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

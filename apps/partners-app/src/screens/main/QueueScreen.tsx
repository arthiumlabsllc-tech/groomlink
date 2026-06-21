import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  Surface,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { queueApi, QueueEntry, QueueStatus } from '../../api/queue';
import { salonApi } from '../../api/salon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

// ──────────────────────────────────────────────────────
// Service Timer — live countdown for IN_SERVICE entries
// ──────────────────────────────────────────────────────
function ServiceTimer({ entry }: { entry: QueueEntry }) {
  const [now, setNow] = useState(Date.now());
  const { theme } = useAppTheme();

  // Tick every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!entry.startedAt || !entry.service?.duration) return null;

  const startedMs = new Date(entry.startedAt).getTime();
  const durationMs = entry.service.duration * 60 * 1000;
  const elapsed = now - startedMs;
  const remaining = durationMs - elapsed;

  const totalSec = Math.max(0, Math.floor(remaining / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;

  const elapsedMin = Math.floor(elapsed / 60000);
  const progress = Math.min(1, elapsed / durationMs);
  const isOvertime = remaining <= 0;
  const isWarning = !isOvertime && totalSec <= 300; // last 5 minutes

  const timerColor = isOvertime
    ? '#EF4444'
    : isWarning
    ? '#F59E0B'
    : '#10B981';

  return (
    <View style={timerStyles.container}>
      {/* Progress bar */}
      <View style={timerStyles.progressBar}>
        <View
          style={[
            timerStyles.progressFill,
            { width: `${progress * 100}%`, backgroundColor: timerColor },
          ]}
        />
      </View>

      <View style={timerStyles.row}>
        <View style={timerStyles.timerBadge}>
          <Ionicons
            name={isOvertime ? 'alert-circle' : 'timer-outline'}
            size={14}
            color={timerColor}
          />
          <Text style={[timerStyles.timerText, { color: timerColor }]}>
            {isOvertime
              ? `Overtime +${Math.abs(Math.floor(remaining / 60000))}m`
              : `${mins}:${secs.toString().padStart(2, '0')}`}
          </Text>
        </View>
        <Text style={timerStyles.elapsedText}>
          {elapsedMin}m elapsed · {entry.service.duration}m booked
        </Text>
        {entry.isHomeService && (
          <View style={timerStyles.freelancerBadge}>
            <Ionicons name="home" size={12} color="#006B3F" />
            <Text style={timerStyles.freelancerText}>Home</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const timerStyles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  elapsedText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  freelancerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  freelancerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#006B3F',
  },
});

export default function QueueScreen() {
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Fetch salon data
  const { data: salon, isLoading: salonLoading } = useQuery({
    queryKey: ['mySalon'],
    queryFn: salonApi.getMySalon,
  });

  // Fetch queue data
  const {
    data: queueData,
    isLoading: queueLoading,
    refetch,
  } = useQuery({
    queryKey: ['queue', salon?.id],
    queryFn: () => (salon ? queueApi.getQueue(salon.id) : null),
    enabled: !!salon?.id,
    refetchInterval: 15000, // Auto-refresh every 15 seconds
  });

  const isLoading = salonLoading || queueLoading;

  // Mutations
  const callNextMutation = useMutation({
    mutationFn: queueApi.callNext,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', salon?.id] });
    },
  });

  const startServiceMutation = useMutation({
    mutationFn: queueApi.startService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', salon?.id] });
    },
  });

  const completeServiceMutation = useMutation({
    mutationFn: queueApi.completeService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', salon?.id] });
    },
  });

  const skipCustomerMutation = useMutation({
    mutationFn: queueApi.skipCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', salon?.id] });
    },
  });

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['queue', salon?.id] });
  }, [queryClient, salon?.id]);

  const getStatusColor = (status: QueueStatus) => {
    switch (status) {
      case 'WAITING':
        return '#F59E0B'; // amber
      case 'CALLED':
        return '#3B82F6'; // blue
      case 'IN_SERVICE':
        return '#10B981'; // green
      case 'COMPLETED':
        return '#6B7280'; // gray
      case 'SKIPPED':
        return '#EF4444'; // red
      default:
        return '#9CA3AF';
    }
  };

  const getStatusBgColor = (status: QueueStatus) => {
    switch (status) {
      case 'WAITING':
        return theme.warningBg;
      case 'CALLED':
        return theme.infoBg;
      case 'IN_SERVICE':
        return theme.successBg;
      case 'COMPLETED':
        return theme.surfaceVariant;
      case 'SKIPPED':
        return theme.dangerBg;
      default:
        return theme.surfaceVariant;
    }
  };

  const getStatusLabel = (status: QueueStatus) => {
    switch (status) {
      case 'WAITING':
        return 'Waiting';
      case 'CALLED':
        return 'Called';
      case 'IN_SERVICE':
        return 'In Service';
      case 'COMPLETED':
        return 'Completed';
      case 'SKIPPED':
        return 'Skipped';
      default:
        return status;
    }
  };

  const formatWaitTime = (joinedAt: string) => {
    const joined = new Date(joinedAt);
    const now = new Date();
    const diffMs = now.getTime() - joined.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min';
    return `${diffMins} mins`;
  };

  const formatEstimatedWait = (minutes: number) => {
    if (minutes < 1) return '< 1 min';
    if (minutes === 1) return '1 min';
    return `${minutes} mins`;
  };

  const waitingEntries = queueData?.entries.filter((e) => e.status === 'WAITING') || [];
  const calledEntries = queueData?.entries.filter((e) => e.status === 'CALLED') || [];
  const inServiceEntries = queueData?.entries.filter((e) => e.status === 'IN_SERVICE') || [];

  const isActionLoading = (action: string, actionId: string) => {
    switch (action) {
      case 'call':
        // For 'call' action, we now pass salonId instead of entry.id
        return callNextMutation.isPending && callNextMutation.variables === actionId;
      case 'start':
        return startServiceMutation.isPending && startServiceMutation.variables === actionId;
      case 'complete':
        return completeServiceMutation.isPending && completeServiceMutation.variables === actionId;
      case 'skip':
        return skipCustomerMutation.isPending && skipCustomerMutation.variables === actionId;
      default:
        return false;
    }
  };

  const renderQueueCard = (entry: QueueEntry) => {
    const statusColor = getStatusColor(entry.status);
    const statusBgColor = getStatusBgColor(entry.status);

    return (
      <Surface key={entry.id} style={styles.queueCard} elevation={0}>
        <View style={styles.queueHeader}>
          <View style={styles.positionBadge}>
            <Text style={styles.positionText}>#{entry.position}</Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>
              {entry.customer.firstName} {entry.customer.lastName}
            </Text>
            <Text style={styles.serviceName}>
              {entry.service?.name || 'General Service'}
            </Text>
          </View>
          <Chip
            mode="flat"
            style={[styles.statusChip, { backgroundColor: statusBgColor }]}
            textStyle={[styles.statusText, { color: statusColor }]}
          >
            {getStatusLabel(entry.status)}
          </Chip>
        </View>

        <View style={styles.queueDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
            <Text style={styles.detailText}>
              Waiting: {formatWaitTime(entry.joinedAt)}
            </Text>
          </View>
          {entry.status === 'WAITING' && (
            <View style={styles.detailItem}>
              <Ionicons name="hourglass-outline" size={14} color={theme.textSecondary} />
              <Text style={styles.detailText}>
                Est: {formatEstimatedWait(entry.estimatedWait)}
              </Text>
            </View>
          )}
        </View>

        <Divider style={styles.divider} />

        {/* Service Timer — shown for IN_SERVICE entries with startedAt */}
        {entry.status === 'IN_SERVICE' && entry.startedAt && (
          <ServiceTimer entry={entry} />
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {entry.status === 'IN_SERVICE' && (
            <Button
              mode="contained"
              onPress={() => completeServiceMutation.mutate(entry.id)}
              loading={isActionLoading('complete', entry.id)}
              disabled={completeServiceMutation.isPending}
              style={[styles.actionButton, { backgroundColor: '#006B3F' }]}
              icon="checkmark"
              textColor="#FFFFFF"
            >
              Complete
            </Button>
          )}

          {entry.status === 'WAITING' && (
            <Button
              mode="contained"
              onPress={() => callNextMutation.mutate(salon?.id!)}
              loading={isActionLoading('call', salon?.id!)}
              disabled={callNextMutation.isPending}
              style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
              icon="volume-high"
              textColor="#FFFFFF"
            >
              Call Next
            </Button>
          )}

          {entry.status === 'CALLED' && (
            <>
              <Button
                mode="contained"
                onPress={() => startServiceMutation.mutate(entry.id)}
                loading={isActionLoading('start', entry.id)}
                disabled={startServiceMutation.isPending || skipCustomerMutation.isPending}
                style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                icon="play"
                textColor="#FFFFFF"
              >
                Start
              </Button>
              <Button
                mode="outlined"
                onPress={() => skipCustomerMutation.mutate(entry.id)}
                loading={isActionLoading('skip', entry.id)}
                disabled={startServiceMutation.isPending || skipCustomerMutation.isPending}
                style={[styles.actionButton, { borderColor: '#9CA3AF' }]}
                textColor="#6B7280"
              >
                Skip
              </Button>
            </>
          )}

        </View>
      </Surface>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="people-outline" size={48} color="#9CA3AF" />
      </View>
      <Text variant="titleMedium" style={styles.emptyTitle}>
        No customers in queue
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        Your queue is currently empty. Customers will appear here when they join.
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
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            colors={['#006B3F']}
            tintColor="#006B3F"
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Text variant="headlineMedium" style={styles.title}>
              Live Queue
            </Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Manage your customers in real-time
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statsCard, { borderLeftColor: '#F59E0B' }]}>
            <View style={[styles.statsIcon, { backgroundColor: theme.warningBg }]}>
              <Ionicons name="people" size={20} color="#F59E0B" />
            </View>
            <Text variant="labelSmall" style={styles.statsLabel}>
              Waiting
            </Text>
            <Text variant="headlineSmall" style={[styles.statsValue, { color: '#F59E0B' }]}>
              {queueData?.totalWaiting || 0}
            </Text>
          </View>

          <View style={[styles.statsCard, { borderLeftColor: '#3B82F6' }]}>
            <View style={[styles.statsIcon, { backgroundColor: theme.infoBg }]}>
              <Ionicons name="time" size={20} color="#3B82F6" />
            </View>
            <Text variant="labelSmall" style={styles.statsLabel}>
              Avg Wait
            </Text>
            <Text variant="headlineSmall" style={[styles.statsValue, { color: '#3B82F6' }]}>
              {queueData?.averageWait ? `${Math.round(queueData.averageWait)}m` : '0m'}
            </Text>
          </View>

          <View style={[styles.statsCard, { borderLeftColor: '#10B981' }]}>
            <View style={[styles.statsIcon, { backgroundColor: theme.successBg }]}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
            <Text variant="labelSmall" style={styles.statsLabel}>
              Serving
            </Text>
            <Text variant="headlineSmall" style={[styles.statsValue, { color: '#10B981' }]}>
              {inServiceEntries.length}
            </Text>
          </View>
        </View>

        {/* Queue Lists */}
        {queueData?.entries.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.queueLists}>
            {/* Currently Serving */}
            {inServiceEntries.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIndicator, { backgroundColor: '#10B981' }]} />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Currently Serving
                  </Text>
                </View>
                {inServiceEntries.map(renderQueueCard)}
              </View>
            )}

            {/* Called */}
            {calledEntries.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIndicator, { backgroundColor: '#3B82F6' }]} />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Called ({calledEntries.length})
                  </Text>
                </View>
                {calledEntries.map(renderQueueCard)}
              </View>
            )}

            {/* Waiting */}
            {waitingEntries.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIndicator, { backgroundColor: '#F59E0B' }]} />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Waiting ({waitingEntries.length})
                  </Text>
                </View>
                {waitingEntries.map(renderQueueCard)}
              </View>
            )}
          </View>
        )}
      </ScrollView>
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
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  title: {
    fontWeight: 'bold',
    color: theme.text,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.success,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.success,
  },
  subtitle: {
    color: theme.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: theme.surface,
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
    color: theme.textSecondary,
    marginBottom: 2,
  },
  statsValue: {
    fontWeight: 'bold',
  },
  queueLists: {
    paddingHorizontal: 16,
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontWeight: '600',
    color: theme.text,
  },
  queueCard: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  positionBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.successBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.primary,
  },
  customerInfo: {
    flex: 1,
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
  queueDetails: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    marginLeft: 52,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  divider: {
    marginVertical: 12,
    backgroundColor: theme.border,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  actionButton: {
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
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

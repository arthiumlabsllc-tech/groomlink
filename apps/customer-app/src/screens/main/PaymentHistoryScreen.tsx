import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { paymentApi, PaymentHistoryItem } from '../../api/payment';
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
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
});

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  SUCCESS: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', icon: 'checkmark-circle' },
  PENDING: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', icon: 'time' },
  FAILED: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', icon: 'close-circle' },
  REFUNDED: { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.15)', icon: 'refresh-circle' },
};

export default function PaymentHistoryScreen() {
  const { theme } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['payment-history'],
    queryFn: () => paymentApi.getHistory(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `GH₵ ${(num || 0).toFixed(2)}`;
  };

  const renderStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon as any} size={12} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>
          {status.charAt(0) + status.slice(1).toLowerCase()}
        </Text>
      </View>
    );
  };

  const renderItem = useCallback(({ item }: { item: PaymentHistoryItem }) => (
    <TouchableOpacity style={styles.paymentCard} activeOpacity={0.7}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentServiceInfo}>
          <Text variant="titleSmall" style={styles.serviceName} numberOfLines={1}>
            {item.serviceName || 'Payment'}
          </Text>
          {item.salonName && (
            <Text variant="bodySmall" style={styles.salonName} numberOfLines={1}>
              {item.salonName}
            </Text>
          )}
        </View>
        <Text variant="titleMedium" style={styles.amount}>
          {formatAmount(item.amount)}
        </Text>
      </View>
      <View style={styles.paymentFooter}>
        {renderStatusBadge(item.status)}
        <Text variant="bodySmall" style={styles.date}>
          {formatDate(item.createdAt)}
        </Text>
      </View>
      {item.reference && (
        <Text variant="bodySmall" style={styles.reference} numberOfLines={1}>
          Ref: {item.reference}
        </Text>
      )}
    </TouchableOpacity>
  ), [styles]);

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
          <Text variant="bodyMedium" style={styles.errorText}>Failed to load payment history</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const payments = data?.payments || [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryGreen]} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.headerTitle}>Payment History</Text>
            <Text variant="bodyMedium" style={styles.headerSubtitle}>
              {payments.length} transaction{payments.length !== 1 ? 's' : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={64} color={COLORS.textSecondary} />
            <Text variant="titleMedium" style={styles.emptyTitle}>No payments yet</Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Your payment history will appear here after your first booking
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
  paymentCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentServiceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  salonName: {
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  amount: {
    fontWeight: '700',
    color: COLORS.primaryGreen,
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  date: {
    color: COLORS.textSecondary,
  },
  reference: {
    color: COLORS.textSecondary,
    marginTop: 6,
    fontSize: 11,
    opacity: 0.7,
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

import React, { useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Text,
  Card,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { salonApi } from '../../api/salon';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';

export default function PayoutHistoryScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Get salon to query payout history
  const { data: salon } = useQuery({
    queryKey: ['mySalon'],
    queryFn: salonApi.getMySalon,
  });

  const { data, isLoading, isRefetching } = useQuery({
    queryKey: ['payoutHistory', salon?.id],
    queryFn: () => (salon ? salonApi.getPayoutHistory(salon.id) : null),
    enabled: !!salon?.id,
  });

  const onRefresh = useCallback(() => {
    if (salon?.id) {
      queryClient.invalidateQueries({ queryKey: ['payoutHistory', salon.id] });
      queryClient.invalidateQueries({ queryKey: ['payoutBalance', salon.id] });
    }
  }, [salon?.id, queryClient]);

  const payouts = data?.payouts || [];
  const summary = data?.summary;
  const thisMonth = data?.thisMonth;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006B3F" />
      </View>
    );
  }

  const renderSummaryCards = () => (
    <View style={styles.summarySection}>
      {/* Total Earned */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <View style={styles.summaryRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="trending-up" size={20} color="#006B3F" />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>Total Earned</Text>
              <Text style={styles.summaryValue}>
                GH₵{(summary?.totalPaidOut || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* This Month */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <View style={styles.summaryRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="calendar" size={20} color="#1565C0" />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>This Month</Text>
              <Text style={styles.summaryValue}>
                GH₵{(thisMonth?.earned || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Commission Paid */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <View style={styles.summaryRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="receipt" size={20} color="#E65100" />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>Commission Paid</Text>
              <Text style={styles.summaryValue}>
                GH₵{(summary?.totalCommission || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </View>
  );

  const renderPayoutItem = ({ item }: { item: typeof payouts[0] }) => (
    <Card style={styles.payoutCard}>
      <Card.Content>
        <View style={styles.payoutHeader}>
          <View style={styles.payoutIconContainer}>
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
          </View>
          <View style={styles.payoutInfo}>
            <Text style={styles.payoutService}>{item.serviceName}</Text>
            <Text style={styles.payoutCustomer}>{item.customerName}</Text>
          </View>
          <View style={styles.payoutAmountContainer}>
            <Text style={styles.payoutAmount}>
              +GH₵{item.netReceived.toFixed(2)}
            </Text>
            <Chip
              mode="flat"
              style={styles.statusChip}
              textStyle={styles.statusChipText}
            >
              Sent
            </Chip>
          </View>
        </View>
        <View style={styles.payoutFooter}>
          <Text style={styles.payoutDate}>
            {item.date ? format(parseISO(item.date), 'MMM d, yyyy • h:mm a') : 'N/A'}
          </Text>
          {item.momoNumber && (
            <Text style={styles.payoutMomo}>
              {item.momoNumber}
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="wallet-outline" size={64} color={theme.textSecondary} />
      <Text style={styles.emptyTitle}>No Payouts Yet</Text>
      <Text style={styles.emptySubtitle}>
        Complete bookings to start earning. Your payouts will appear here.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={payouts}
        keyExtractor={(item) => item.id}
        renderItem={renderPayoutItem}
        ListHeaderComponent={renderSummaryCards}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor="#006B3F"
          />
        }
        showsVerticalScrollIndicator={false}
      />
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
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  summarySection: {
    marginBottom: 16,
    gap: 12,
  },
  summaryCard: {
    backgroundColor: theme.surface,
    borderRadius: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
  },
  payoutCard: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    marginBottom: 10,
  },
  payoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  payoutIconContainer: {
    marginRight: 10,
  },
  payoutInfo: {
    flex: 1,
  },
  payoutService: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  payoutCustomer: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  payoutAmountContainer: {
    alignItems: 'flex-end',
  },
  payoutAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 4,
  },
  statusChip: {
    backgroundColor: '#D1FAE5',
    height: 24,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#065F46',
  },
  payoutFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 8,
  },
  payoutDate: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  payoutMomo: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

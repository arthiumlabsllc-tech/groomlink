import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Text, ActivityIndicator, Surface, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { salonApi } from '../../api/salon';
import { analyticsApi, TopService } from '../../api/analytics';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

export default function AnalyticsScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { data: salon } = useQuery({
    queryKey: ['mySalon'],
    queryFn: salonApi.getMySalon,
  });

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['analyticsSummary', salon?.id],
    queryFn: () => (salon ? analyticsApi.getEarningsSummary(salon.id) : null),
    enabled: !!salon?.id,
  });

  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ['analyticsBookings', salon?.id],
    queryFn: () => (salon ? analyticsApi.getBookingAnalytics(salon.id, 30) : null),
    enabled: !!salon?.id,
  });

  const isLoading = summaryLoading || analyticsLoading;

  const onRefresh = () => {
    refetchSummary();
    refetchAnalytics();
  };

  const topServices = analytics?.topServices || [];
  const maxRevenue = topServices.length > 0 ? topServices[0].revenue : 1;

  if (isLoading && !summary) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#006B3F" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            colors={['#006B3F']}
            tintColor="#006B3F"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.headerTitle}>Analytics</Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>Last 30 days performance</Text>
        </View>

        {/* Earnings Cards */}
        <View style={styles.cardsRow}>
          <Surface style={styles.earningsCard} elevation={0}>
            <View style={styles.cardIconRow}>
              <View style={[styles.cardIcon, { backgroundColor: theme.successBg }]}>
                <Ionicons name="trending-up" size={18} color={theme.success} />
              </View>
            </View>
            <Text style={styles.cardValue}>
              GH₵{(summary?.totalEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.cardLabel}>Total Revenue</Text>
          </Surface>

          <Surface style={styles.earningsCard} elevation={0}>
            <View style={styles.cardIconRow}>
              <View style={[styles.cardIcon, { backgroundColor: theme.infoBg }]}>
                <Ionicons name="calendar" size={18} color={theme.info} />
              </View>
            </View>
            <Text style={styles.cardValue}>
              GH₵{(summary?.monthlyEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.cardLabel}>This Month</Text>
          </Surface>
        </View>

        {/* Stats Row */}
        <Surface style={styles.statsSection} elevation={0}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={18} color="#006B3F" />
              <Text style={styles.statValue}>{summary?.totalBookings || 0}</Text>
              <Text style={styles.statLabel}>Bookings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
              <Text style={styles.statValue}>{summary?.completedBookings || 0}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="analytics-outline" size={18} color="#F59E0B" />
              <Text style={styles.statValue}>{(summary?.completionRate || 0).toFixed(1)}%</Text>
              <Text style={styles.statLabel}>Rate</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="cash-outline" size={18} color="#3B82F6" />
              <Text style={styles.statValue}>
                GH₵{(summary?.averageBookingValue || 0).toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>Avg Value</Text>
            </View>
          </View>
        </Surface>

        {/* Top Services */}
        <Surface style={styles.section} elevation={0}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy-outline" size={20} color="#D4A017" />
            <Text variant="titleMedium" style={styles.sectionTitle}>Top Services</Text>
          </View>
          <Divider style={styles.sectionDivider} />

          {topServices.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={32} color={theme.textTertiary} />
              <Text style={styles.emptyText}>No completed bookings yet</Text>
            </View>
          ) : (
            topServices.map((service: TopService, index: number) => (
              <View key={service.id} style={styles.serviceRow}>
                <View style={styles.serviceInfo}>
                  <View style={[styles.rankBadge, { backgroundColor: index === 0 ? '#FEF9E7' : theme.surfaceVariant }]}>
                    <Text style={[styles.rankText, { color: index === 0 ? '#D4A017' : theme.textSecondary }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.serviceDetails}>
                    <Text style={styles.serviceName} numberOfLines={1}>{service.name}</Text>
                    <Text style={styles.serviceBookings}>{service.bookingCount} bookings</Text>
                  </View>
                </View>
                <Text style={styles.serviceRevenue}>
                  GH₵{service.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
                {/* Bar indicator */}
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: `${Math.max((service.revenue / maxRevenue) * 100, 5)}%`,
                        backgroundColor: index === 0 ? '#D4A017' : '#006B3F',
                      },
                    ]}
                  />
                </View>
              </View>
            ))
          )}
        </Surface>

        {/* Weekly Earnings Breakdown */}
        <Surface style={styles.section} elevation={0}>
          <View style={styles.sectionHeader}>
            <Ionicons name="stats-chart-outline" size={20} color="#006B3F" />
            <Text variant="titleMedium" style={styles.sectionTitle}>Recent Daily Earnings</Text>
          </View>
          <Divider style={styles.sectionDivider} />

          {(!analytics?.dailyEarnings || analytics.dailyEarnings.length === 0) ? (
            <View style={styles.emptyState}>
              <Ionicons name="analytics-outline" size={32} color={theme.textTertiary} />
              <Text style={styles.emptyText}>No earnings data available</Text>
            </View>
          ) : (
            <View style={styles.dailyList}>
              {analytics.dailyEarnings.slice(-7).reverse().map((day) => (
                <View key={day.date} style={styles.dailyRow}>
                  <View style={styles.dailyLeft}>
                    <Text style={styles.dailyDate}>{formatDateLabel(day.date)}</Text>
                    <Text style={styles.dailyBookings}>{day.bookings} booking{day.bookings !== 1 ? 's' : ''}</Text>
                  </View>
                  <Text style={styles.dailyAmount}>
                    GH₵{day.earnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 20 },
  headerTitle: { fontWeight: 'bold', color: theme.text, fontSize: 24 },
  headerSubtitle: { color: theme.textSecondary, marginTop: 4 },

  cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  earningsCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 16,
  },
  cardIconRow: { marginBottom: 12 },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardValue: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
  cardLabel: { fontSize: 12, color: theme.textSecondary },

  statsSection: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: theme.border },
  statValue: { fontSize: 16, fontWeight: 'bold', color: theme.text },
  statLabel: { fontSize: 11, color: theme.textSecondary },

  section: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: { fontWeight: '600', color: theme.text },
  sectionDivider: { marginHorizontal: 16, marginBottom: 8 },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: { color: theme.textSecondary, fontSize: 14 },

  serviceRow: { paddingHorizontal: 16, paddingVertical: 10 },
  serviceInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: { fontSize: 12, fontWeight: '700' },
  serviceDetails: { flex: 1 },
  serviceName: { fontSize: 14, fontWeight: '500', color: theme.text },
  serviceBookings: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  serviceRevenue: { fontSize: 14, fontWeight: '600', color: '#006B3F', textAlign: 'right' },
  barContainer: {
    height: 4,
    backgroundColor: theme.surfaceVariant,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: 2 },

  dailyList: { paddingHorizontal: 16, paddingBottom: 8 },
  dailyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  dailyLeft: { flex: 1 },
  dailyDate: { fontSize: 14, fontWeight: '500', color: theme.text },
  dailyBookings: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  dailyAmount: { fontSize: 14, fontWeight: '600', color: '#006B3F' },
});

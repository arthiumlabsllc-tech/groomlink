import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { loyaltyApi, LoyaltyReward } from '../../api/loyalty';
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
});

const TIER_ICONS: Record<string, string> = {
  BRONZE: 'shield-outline',
  SILVER: 'shield-outline',
  GOLD: 'shield-checkmark-outline',
  PLATINUM: 'shield-checkmark',
  DIAMOND: 'diamond-outline',
};

const REWARD_TYPE_ICONS: Record<string, string> = {
  DISCOUNT: 'pricetag',
  FREE_SERVICE: 'gift',
  UPGRADE: 'arrow-up-circle',
};

export default function LoyaltyScreen() {
  const { theme } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: status, isLoading: statusLoading, error: statusError, refetch: refetchStatus } = useQuery({
    queryKey: ['loyalty-status'],
    queryFn: () => loyaltyApi.getStatus(),
  });

  const { data: rewards, isLoading: rewardsLoading, error: rewardsError, refetch: refetchRewards } = useQuery({
    queryKey: ['loyalty-rewards'],
    queryFn: () => loyaltyApi.getRewards(),
  });

  const redeemMutation = useMutation({
    mutationFn: ({ rewardId, points }: { rewardId: string; points: number }) =>
      loyaltyApi.redeemReward(rewardId, points),
    onSuccess: (result) => {
      Alert.alert('Reward Redeemed!', result.message || 'Your reward has been redeemed successfully.');
      queryClient.invalidateQueries({ queryKey: ['loyalty-status'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-rewards'] });
    },
    onError: (error: any) => {
      Alert.alert('Redemption Failed', error.response?.data?.message || 'Could not redeem this reward. Please try again.');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStatus(), refetchRewards()]);
    setRefreshing(false);
  }, [refetchStatus, refetchRewards]);

  const handleRedeem = useCallback((reward: LoyaltyReward) => {
    if (!status || status.totalPoints < reward.pointsCost) {
      Alert.alert('Not Enough Points', `You need ${reward.pointsCost - status!.totalPoints} more points to redeem this reward.`);
      return;
    }
    Alert.alert(
      'Redeem Reward',
      `Redeem "${reward.name}" for ${reward.pointsCost} points?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Redeem', onPress: () => redeemMutation.mutate({ rewardId: reward.id, points: reward.pointsCost }) },
      ]
    );
  }, [status, redeemMutation]);

  if (statusLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primaryGreen} />
        </View>
      </SafeAreaView>
    );
  }

  if (statusError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.accentRed} />
          <Text variant="bodyMedium" style={styles.errorText}>Failed to load rewards</Text>
          <TouchableOpacity onPress={() => refetchStatus()}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentTier = status?.tier || 'BRONZE';
  const tierIcon = TIER_ICONS[currentTier] || 'shield-outline';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryGreen]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.headerTitle}>Rewards</Text>
        </View>

        {/* Points Balance Card */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsCardInner}>
            <View style={styles.pointsLeft}>
              <View style={styles.tierBadge}>
                <Ionicons name={tierIcon as any} size={20} color={COLORS.accentGold} />
                <Text style={styles.tierLabel}>{currentTier}</Text>
              </View>
              <Text variant="headlineLarge" style={styles.pointsValue}>
                {status?.totalPoints || 0}
              </Text>
              <Text variant="bodySmall" style={styles.pointsLabel}>Available Points</Text>
            </View>
            <View style={styles.pointsRight}>
              <View style={styles.statRow}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                <Text variant="bodySmall" style={styles.statText}>
                  {status?.bookingsCount || 0} bookings
                </Text>
              </View>
              <View style={styles.statRow}>
                <Ionicons name="trophy-outline" size={14} color={COLORS.textSecondary} />
                <Text variant="bodySmall" style={styles.statText}>
                  {status?.lifetimePoints || 0} lifetime
                </Text>
              </View>
              {status && status.pointsToNextTier > 0 && (
                <View style={styles.nextTierInfo}>
                  <Text variant="bodySmall" style={styles.nextTierText}>
                    {status.pointsToNextTier} pts to next tier
                  </Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, {
                      width: `${Math.min(100, ((status.totalPoints || 0) / ((status.totalPoints || 0) + status.pointsToNextTier)) * 100)}%`,
                    }]} />
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Rewards List */}
        <View style={styles.rewardsSection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Available Rewards</Text>

          {rewardsLoading ? (
            <View style={styles.sectionLoading}>
              <ActivityIndicator size="small" color={COLORS.primaryGreen} />
            </View>
          ) : rewardsError ? (
            <View style={styles.sectionError}>
              <Text variant="bodyMedium" style={styles.errorText}>Could not load rewards</Text>
            </View>
          ) : !rewards || rewards.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={48} color={COLORS.textSecondary} />
              <Text variant="bodyMedium" style={styles.emptyText}>
                No rewards available right now. Check back soon!
              </Text>
            </View>
          ) : (
            rewards.map((reward) => {
              const canAfford = (status?.totalPoints || 0) >= reward.pointsCost;
              const typeIcon = REWARD_TYPE_ICONS[reward.type] || 'gift';

              return (
                <Card key={reward.id} style={styles.rewardCard}>
                  <Card.Content style={styles.rewardContent}>
                    <View style={styles.rewardLeft}>
                      <View style={[styles.rewardIconContainer, { backgroundColor: canAfford ? `${COLORS.primaryGreen}15` : `${COLORS.border}40` }]}>
                        <Ionicons name={typeIcon as any} size={24} color={canAfford ? COLORS.primaryGreen : COLORS.textSecondary} />
                      </View>
                      <View style={styles.rewardInfo}>
                        <Text variant="titleSmall" style={styles.rewardName} numberOfLines={1}>
                          {reward.name}
                        </Text>
                        {reward.description && (
                          <Text variant="bodySmall" style={styles.rewardDescription} numberOfLines={2}>
                            {reward.description}
                          </Text>
                        )}
                        <View style={styles.pointsCostRow}>
                          <Ionicons name="star" size={12} color={canAfford ? COLORS.accentGold : COLORS.textSecondary} />
                          <Text style={[styles.pointsCost, { color: canAfford ? COLORS.accentGold : COLORS.textSecondary }]}>
                            {reward.pointsCost} pts
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.redeemButton, !canAfford && styles.redeemButtonDisabled]}
                      onPress={() => handleRedeem(reward)}
                      disabled={!canAfford || redeemMutation.isPending}
                    >
                      {redeemMutation.isPending ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={[styles.redeemButtonText, !canAfford && styles.redeemButtonTextDisabled]}>
                          {canAfford ? 'Redeem' : 'Locked'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </Card.Content>
                </Card>
              );
            })
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  // Points Card
  pointsCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: COLORS.primaryGreen,
    overflow: 'hidden',
    shadowColor: COLORS.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  pointsCardInner: {
    padding: 24,
  },
  pointsLeft: {
    marginBottom: 16,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  tierLabel: {
    color: COLORS.accentGold,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 1,
  },
  pointsValue: {
    color: '#fff',
    fontWeight: '800',
  },
  pointsLabel: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  pointsRight: {
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: 'rgba(255,255,255,0.7)',
  },
  nextTierInfo: {
    marginTop: 4,
  },
  nextTierText: {
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accentGold,
    borderRadius: 2,
  },
  // Rewards Section
  rewardsSection: {
    paddingHorizontal: 16,
    marginTop: 28,
  },
  sectionTitle: {
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  rewardCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  rewardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  rewardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  rewardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardName: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  rewardDescription: {
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  pointsCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  pointsCost: {
    fontSize: 12,
    fontWeight: '600',
  },
  redeemButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  redeemButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  redeemButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  redeemButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  // States
  sectionLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  sectionError: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.accentRed,
    marginTop: 8,
  },
  retryText: {
    marginTop: 8,
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { subscriptionApi, SubscriptionStatus } from '../api/subscription';
import { MainStackParamList } from '../types';
import { AppTheme } from '../theme/colors';
import { useAppTheme } from '../theme/ThemeContext';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const getPlanColor = (planSlug: string, theme: AppTheme): string => {
  switch (planSlug.toLowerCase()) {
    case 'free':
    case 'starter':
      return theme.textSecondary;
    case 'basic':
    case 'professional':
    case 'pro':
      return theme.primary;
    case 'premium':
    case 'enterprise':
      return theme.accent;
    default:
      return theme.primary;
  }
};

const getStatusColor = (status: string, theme: AppTheme): string => {
  switch (status) {
    case 'ACTIVE':
      return theme.success;
    case 'CANCELLED':
      return theme.danger;
    case 'EXPIRED':
      return theme.textTertiary;
    case 'PENDING':
      return theme.accentLight;
    default:
      return theme.textTertiary;
  }
};

const getStatusBgColor = (status: string, theme: AppTheme): string => {
  switch (status) {
    case 'ACTIVE':
      return theme.successBg;
    case 'CANCELLED':
      return theme.dangerBg;
    case 'EXPIRED':
      return theme.surfaceVariant;
    case 'PENDING':
      return theme.accentBg;
    default:
      return theme.surfaceVariant;
  }
};

export default function SubscriptionStatusCard() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { data: subscription, isLoading, isError } = useQuery({
    queryKey: ['currentSubscription'],
    queryFn: subscriptionApi.getCurrentPlan,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const handleManage = () => {
    navigation.navigate('Pricing');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading subscription...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Unable to load subscription info</Text>
      </View>
    );
  }

  if (!subscription) {
    return (
      <TouchableOpacity style={styles.container} onPress={handleManage} activeOpacity={0.8}>
        <View style={styles.goldAccent} />
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="trophy" size={22} color={theme.accent} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.planName}>No Active Plan</Text>
              <Text style={styles.expiryText}>Upgrade to unlock features</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.manageButton} onPress={handleManage}>
            <Text style={styles.manageButtonText}>Upgrade</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.background} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  const planColor = getPlanColor(subscription.plan?.slug || '', theme);
  const statusColor = getStatusColor(subscription.status || '', theme);
  const statusBgColor = getStatusBgColor(subscription.status || '', theme);
  const expiryDate = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : new Date();
  const isExpiringSoon = subscription.currentPeriodEnd && isAfter(new Date(), addDays(expiryDate, -7)) &&
                         isBefore(new Date(), expiryDate);

  return (
    <TouchableOpacity style={styles.container} onPress={handleManage} activeOpacity={0.8}>
      <View style={styles.goldAccent} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: theme.accentBg }]}>
            <Ionicons name="trophy" size={22} color={theme.accent} />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.planRow}>
              <Text style={styles.planName}>
                {subscription.plan?.name || 'Unknown Plan'}
              </Text>
              <Chip
                style={[styles.statusChip, { backgroundColor: statusBgColor }]}
                textStyle={[styles.statusText, { color: statusColor }]}
              >
                {subscription.status || 'UNKNOWN'}
              </Chip>
            </View>
            <Text style={[
              styles.expiryText,
              isExpiringSoon && { color: theme.danger }
            ]}>
              {subscription.cancelAtPeriodEnd 
                ? 'Cancels on '
                : subscription.trialEndsAt && isAfter(new Date(subscription.trialEndsAt), new Date())
                  ? 'Trial ends on '
                  : 'Renews on '
              }
              {format(expiryDate, 'MMM d, yyyy')}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.manageButton} onPress={handleManage}>
          <Text style={styles.manageButtonText}>Manage</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.background} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    backgroundColor: theme.surfaceVariant,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  goldAccent: {
    height: 3,
    backgroundColor: theme.accent,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  content: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.accentBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  planName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
    marginRight: 8,
  },
  statusChip: {
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  expiryText: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  manageButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.background,
    marginRight: 2,
  },
});

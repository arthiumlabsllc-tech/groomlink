import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { subscriptionApi, SubscriptionStatus } from '../api/subscription';
import { MainStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const COLORS = {
  green: '#006B3F',
  red: '#CE1126',
  gold: '#FCD116',
  white: '#FFFFFF',
  black: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  border: '#E5E7EB',
};

const getPlanColor = (planSlug: string): string => {
  switch (planSlug.toLowerCase()) {
    case 'free':
    case 'starter':
      return '#9CA3AF';
    case 'basic':
    case 'professional':
    case 'pro':
      return COLORS.green;
    case 'premium':
    case 'enterprise':
      return COLORS.gold;
    default:
      return COLORS.green;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'ACTIVE':
      return COLORS.green;
    case 'CANCELLED':
      return COLORS.red;
    case 'EXPIRED':
      return COLORS.gray;
    case 'PENDING':
      return COLORS.gold;
    default:
      return COLORS.gray;
  }
};

export default function SubscriptionStatusCard() {
  const navigation = useNavigation<NavigationProp>();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['currentSubscription'],
    queryFn: subscriptionApi.getCurrentPlan,
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

  if (!subscription) {
    return (
      <TouchableOpacity style={styles.container} onPress={handleManage} activeOpacity={0.8}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="card-outline" size={20} color={COLORS.gray} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.planName}>No Active Plan</Text>
              <Text style={styles.expiryText}>Upgrade to unlock features</Text>
            </View>
          </View>
          <View style={styles.manageButton}>
            <Text style={styles.manageButtonText}>Upgrade</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.green} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  const planColor = getPlanColor(subscription.plan.slug);
  const statusColor = getStatusColor(subscription.status);
  const expiryDate = new Date(subscription.currentPeriodEnd);
  const isExpiringSoon = isAfter(new Date(), addDays(expiryDate, -7)) && 
                         isBefore(new Date(), expiryDate);

  return (
    <TouchableOpacity style={styles.container} onPress={handleManage} activeOpacity={0.8}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${planColor}15` }]}>
            <Ionicons name="card" size={20} color={planColor} />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.planRow}>
              <Text style={[styles.planName, { color: planColor }]}>
                {subscription.plan.name}
              </Text>
              <Chip
                style={[styles.statusChip, { backgroundColor: `${statusColor}20` }]}
                textStyle={[styles.statusText, { color: statusColor }]}
              >
                {subscription.status}
              </Chip>
            </View>
            <Text style={[
              styles.expiryText,
              isExpiringSoon && { color: COLORS.red }
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
        <View style={styles.manageButton}>
          <Text style={styles.manageButtonText}>Manage</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.green} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  content: {
    padding: 14,
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
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
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
    color: COLORS.black,
    marginRight: 8,
  },
  statusChip: {
    height: 22,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  expiryText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.green,
    marginRight: 2,
  },
});

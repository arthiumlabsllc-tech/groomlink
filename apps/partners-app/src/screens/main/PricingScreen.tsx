import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { subscriptionApi, Plan, PlanFeature, SubscriptionStatus } from '../../api/subscription';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

type BillingPeriod = 'MONTHLY' | 'YEARLY';

const createColors = (t: AppTheme) => ({
  green: '#006B3F',
  red: '#CE1126',
  gold: '#FCD116',
  white: '#FFFFFF',
  black: t.text,
  gray: t.textSecondary,
  lightGray: t.background,
  border: t.border,
  surface: t.surface,
});

export default function PricingScreen() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('MONTHLY');
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const { data: plans, isLoading: plansLoading, isError: plansError } = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: subscriptionApi.getPlans,
  });

  const { data: currentSubscription, isLoading: subscriptionLoading, isError: subscriptionError } = useQuery({
    queryKey: ['currentSubscription'],
    queryFn: subscriptionApi.getCurrentPlan,
  });

  const upgradeMutation = useMutation({
    mutationFn: ({ planSlug, period }: { planSlug: string; period: BillingPeriod }) =>
      subscriptionApi.upgradeToPlan(planSlug, period),
    onSuccess: (data) => {
      if (data.paymentUrl) {
        Linking.openURL(data.paymentUrl);
      }
    },
    onError: (error: any) => {
      Alert.alert(
        'Upgrade Failed',
        error?.response?.data?.message || 'Something went wrong. Please try again.'
      );
    },
  });

  const isLoading = plansLoading || subscriptionLoading;

  const handleUpgrade = (plan: Plan) => {
    if (!plan || !plan.slug) return;
    if (isCurrentPlan(plan, currentSubscription, billingPeriod)) {
      return;
    }
    upgradeMutation.mutate({ planSlug: plan.slug, period: billingPeriod });
  };

  const isCurrentPlan = (
    plan: Plan,
    subscription: SubscriptionStatus | null | undefined,
    period: BillingPeriod
  ): boolean => {
    if (!subscription || !subscription.plan) return false;
    return subscription.plan.slug === plan.slug && subscription.billingPeriod === period;
  };

  const getPlanColor = (planSlug: string): string => {
    switch (planSlug.toLowerCase()) {
      case 'free':
      case 'starter':
        return COLORS.gray;
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

  // Prisma Decimal fields arrive as strings — coerce defensively
  const toNumber = (value: number | string | null | undefined): number => {
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return typeof parsed === 'number' && isFinite(parsed) ? parsed : 0;
  };

  // The API sends `features` as a boolean map plus a pre-formatted
  // `feature_list`; normalise both shapes so rendering never crashes.
  const getFeatureItems = (plan: Plan | null | undefined): PlanFeature[] => {
    if (!plan) return [];
    if (Array.isArray(plan.feature_list)) return plan.feature_list;
    if (Array.isArray(plan.features)) {
      return plan.features.map((f) => ({ name: String(f), included: true }));
    }
    if (plan.features && typeof plan.features === 'object') {
      return Object.entries(plan.features).map(([key, included]) => ({
        name: key
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        included: !!included,
      }));
    }
    return [];
  };

  const renderFeatureItem = (feature: string, included: boolean) => (
    <View key={feature} style={styles.featureItem}>
      <Ionicons
        name={included ? 'checkmark-circle' : 'close-circle'}
        size={20}
        color={included ? COLORS.green : COLORS.gray}
      />
      <Text
        style={[
          styles.featureText,
          !included && styles.featureTextDisabled,
        ]}
      >
        {feature}
      </Text>
    </View>
  );

  const renderPlanCard = (plan: Plan) => {
    if (!plan) return null;
    const current = isCurrentPlan(plan, currentSubscription, billingPeriod);
    const planColor = getPlanColor(plan?.slug || '');
    const price =
      billingPeriod === 'MONTHLY'
        ? toNumber(plan?.priceMonthlyGhs ?? plan?.monthlyPrice)
        : toNumber(plan?.priceYearlyGhs ?? plan?.yearlyPrice);
    const periodLabel = billingPeriod === 'MONTHLY' ? '/month' : '/year';

    return (
      <Card
        key={plan?.id || 'unknown'}
        style={[
          styles.planCard,
          current && { borderColor: planColor, borderWidth: 2 },
          plan?.isPopular && !current && { borderColor: COLORS.gold, borderWidth: 2 },
        ]}
      >
        {plan?.isPopular && !current && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>Most Popular</Text>
          </View>
        )}
        {current && (
          <View style={[styles.currentBadge, { backgroundColor: planColor }]}>
            <Text style={styles.currentBadgeText}>Current Plan</Text>
          </View>
        )}

        <Card.Content style={styles.planContent}>
          <View style={styles.planHeader}>
            <Text style={[styles.planName, { color: planColor }]}>
              {plan?.name || 'Unknown Plan'}
            </Text>
            {plan?.description && (
              <Text style={styles.planDescription}>{plan.description}</Text>
            )}
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceAmount}>GH₵{price.toLocaleString()}</Text>
            <Text style={styles.pricePeriod}>{periodLabel}</Text>
          </View>

          <View style={styles.limitsContainer}>
            <View style={styles.limitItem}>
              <Ionicons name="people-outline" size={16} color={COLORS.gray} />
              <Text style={styles.limitText}>
                Up to {plan?.maxStaff ?? 0} staff members
              </Text>
            </View>
            <View style={styles.limitItem}>
              <Ionicons name="location-outline" size={16} color={COLORS.gray} />
              <Text style={styles.limitText}>
                Up to {plan?.maxLocations ?? 0} location{(plan?.maxLocations ?? 0) > 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          <View style={styles.featuresContainer}>
            {getFeatureItems(plan).map((item) => renderFeatureItem(item.name, item.included))}
          </View>

          <Button
            mode={current ? 'outlined' : 'contained'}
            onPress={() => handleUpgrade(plan)}
            loading={upgradeMutation.isPending}
            disabled={current || upgradeMutation.isPending}
            style={[
              styles.upgradeButton,
              current && styles.currentButton,
            ]}
            buttonColor={current ? undefined : planColor}
            textColor={current ? planColor : COLORS.white}
          >
            {current ? 'Current Plan' : 'Upgrade'}
          </Button>
        </Card.Content>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.green} />
        <Text style={styles.loadingText}>Loading plans...</Text>
      </SafeAreaView>
    );
  }

  if (plansError || subscriptionError) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.red} />
        <Text style={styles.loadingText}>Failed to load plans. Please try again.</Text>
      </SafeAreaView>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="pricetag-outline" size={48} color={COLORS.gray} />
        <Text style={styles.loadingText}>No plans available</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>
            Select the perfect plan for your business
          </Text>
        </View>

        {/* Billing Period Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              billingPeriod === 'MONTHLY' && styles.toggleButtonActive,
            ]}
            onPress={() => setBillingPeriod('MONTHLY')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.toggleText,
                billingPeriod === 'MONTHLY' && styles.toggleTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              billingPeriod === 'YEARLY' && styles.toggleButtonActive,
            ]}
            onPress={() => setBillingPeriod('YEARLY')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.toggleText,
                billingPeriod === 'YEARLY' && styles.toggleTextActive,
              ]}
            >
              Yearly
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save 20%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Plan Cards */}
        <View style={styles.plansContainer}>
          {plans?.map(renderPlanCard)}
        </View>

        {/* Footer Note */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.gray} />
          <Text style={styles.footerText}>
            Secure payment powered by Paystack. Cancel anytime.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (COLORS: ReturnType<typeof createColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.gray,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.green,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  toggleTextActive: {
    color: COLORS.white,
  },
  saveBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
    zIndex: 1,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  currentBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  planContent: {
    paddingTop: 16,
  },
  planHeader: {
    marginBottom: 12,
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 13,
    color: COLORS.gray,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  pricePeriod: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 4,
  },
  limitsContainer: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  limitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  limitText: {
    fontSize: 13,
    color: COLORS.gray,
    marginLeft: 8,
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.black,
    marginLeft: 10,
    flex: 1,
  },
  featureTextDisabled: {
    color: COLORS.gray,
    textDecorationLine: 'line-through',
  },
  upgradeButton: {
    borderRadius: 8,
    paddingVertical: 4,
  },
  currentButton: {
    borderColor: COLORS.gray,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 8,
    textAlign: 'center',
  },
});

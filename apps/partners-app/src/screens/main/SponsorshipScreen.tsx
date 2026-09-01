import React, { useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  ActivityIndicator,
} from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  sponsorshipApi,
  SponsorshipPackage,
  formatPackageDuration,
} from '../../api/sponsorship';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

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

export default function SponsorshipScreen() {
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const { data: packages, isLoading: packagesLoading, isError: packagesError } = useQuery({
    queryKey: ['sponsorshipPackages'],
    queryFn: sponsorshipApi.getPackages,
  });

  const { data: status, isLoading: statusLoading, isError: statusError } = useQuery({
    queryKey: ['sponsorshipStatus'],
    queryFn: sponsorshipApi.getStatus,
  });

  // Refresh sponsorship status whenever the screen regains focus
  // (e.g. after completing payment in the browser)
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['sponsorshipStatus'] });
    }, [queryClient])
  );

  const refreshStatus = () => {
    queryClient.invalidateQueries({ queryKey: ['sponsorshipStatus'] });
  };

  const isLoading = packagesLoading || statusLoading;

  const handlePurchase = (_pkg: SponsorshipPackage) => {
    Alert.alert(
      'Sponsorship — Web Only',
      'Sponsorship packages can be purchased on our web portal. Visit partners.groomlinkgh.com to get sponsored.',
      [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Open Website',
          onPress: () => Linking.openURL('https://partners.groomlinkgh.com/sponsorship'),
        },
      ]
    );
  };

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const renderActiveCard = () => {
    if (!status?.active) return null;
    const active = status.active;
    return (
      <Card style={[styles.statusCard, { backgroundColor: '#E8F5E9', borderColor: COLORS.green }]}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <Ionicons name="megaphone" size={22} color={COLORS.green} />
            <Text style={[styles.statusTitle, { color: COLORS.green }]}>You are Sponsored!</Text>
          </View>
          <Text style={styles.statusDetail}>
            Your salon appears higher in search results until{' '}
            {formatDateTime(active.endTime)}.
          </Text>
          {active.amountPaid != null && (
            <Text style={styles.statusDetail}>Amount paid: GH₵{Number(active.amountPaid).toFixed(2)}</Text>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderPendingCard = () => {
    if (!status?.pending) return null;
    return (
      <Card style={[styles.statusCard, { backgroundColor: '#FEF9E7', borderColor: COLORS.gold }]}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <Ionicons name="time-outline" size={22} color="#B45309" />
            <Text style={[styles.statusTitle, { color: '#B45309' }]}>Payment Pending</Text>
          </View>
          <Text style={styles.statusDetail}>
            Complete your payment on our web portal to activate sponsorship.
          </Text>
          <View style={styles.pendingActions}>
            <Button
              mode="contained"
              buttonColor="#B45309"
              textColor={COLORS.white}
              onPress={() => Linking.openURL('https://partners.groomlinkgh.com/sponsorship')}
              style={styles.pendingButton}
              icon="open-outline"
            >
              Complete on Web
            </Button>
            <Button
              mode="outlined"
              textColor="#B45309"
              onPress={refreshStatus}
              style={styles.pendingButton}
              icon="refresh"
            >
              Refresh Status
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderPackageCard = (pkg: SponsorshipPackage) => {
    const disabled = !!status?.active || !!status?.pending;
    return (
      <Card key={pkg.id} style={styles.packageCard}>
        <Card.Content>
          <View style={styles.packageHeader}>
            <View style={styles.packageIcon}>
              <Ionicons name="rocket-outline" size={20} color={COLORS.red} />
            </View>
            <View style={styles.packageHeaderText}>
              <Text style={styles.packageName}>{pkg.packageName}</Text>
              <Text style={styles.packageDuration}>
                {formatPackageDuration(pkg.durationType, pkg.durationValue)} of boosted visibility
              </Text>
            </View>
          </View>

          <View style={styles.packagePriceRow}>
            <Text style={styles.packagePrice}>GH₵{Number(pkg.priceGhs).toFixed(2)}</Text>
            <View style={styles.priorityBadge}>
              <Ionicons name="trending-up" size={12} color={COLORS.green} />
              <Text style={styles.priorityText}>Priority x{pkg.priorityLevel}</Text>
            </View>
          </View>

          <Button
            mode="contained"
            buttonColor={COLORS.red}
            textColor={COLORS.white}
            onPress={() => handlePurchase(pkg)}
            disabled={disabled}
            style={styles.purchaseButton}
            icon="megaphone-outline"
          >
            Get Sponsored
          </Button>
        </Card.Content>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.green} />
        <Text style={styles.loadingText}>Loading sponsorship options...</Text>
      </SafeAreaView>
    );
  }

  if (packagesError || statusError) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.red} />
        <Text style={styles.loadingText}>Failed to load sponsorship. Please try again.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="megaphone" size={28} color={COLORS.red} />
          </View>
          <Text style={styles.title}>Get Sponsored</Text>
          <Text style={styles.subtitle}>
            Boost your salon to the top of search results and attract more customers.
          </Text>
        </View>

        {/* Active / Pending status */}
        {renderActiveCard()}
        {renderPendingCard()}

        {/* Packages */}
        {!packages || packages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetag-outline" size={40} color={COLORS.gray} />
            <Text style={styles.emptyText}>No sponsorship packages available right now.</Text>
          </View>
        ) : (
          <View style={styles.packagesContainer}>
            {packages.map(renderPackageCard)}
          </View>
        )}

        {/* Footer Note */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.gray} />
          <Text style={styles.footerText}>
            Secure payment via Hubtel. Sponsorship activates once payment is confirmed.
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
    marginBottom: 20,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FDE8EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  statusCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusDetail: {
    fontSize: 13,
    color: COLORS.black,
    marginBottom: 4,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  pendingButton: {
    flex: 1,
    borderRadius: 8,
  },
  packagesContainer: {
    gap: 12,
  },
  packageCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  packageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDE8EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageHeaderText: {
    flex: 1,
  },
  packageName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  packageDuration: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  packagePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.green,
  },
  purchaseButton: {
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 8,
    color: COLORS.gray,
    fontSize: 14,
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

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Share, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, Divider, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '../../store/authStore';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

export default function ReferralScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuthStore();

  // Generate referral code from user ID or phone
  const referralCode = useMemo(() => {
    if (!user) return 'GROOM2026';
    const base = user.phoneNumber || user.id || '';
    const suffix = base.replace(/\D/g, '').slice(-4) || '0000';
    return `GL${suffix}`;
  }, [user]);

  const referralLink = `https://groomlinkgh.com/refer/${referralCode}`;

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(referralCode);
    // Use global toast if available
    (globalThis as any).__partnersShowToast?.({
      title: 'Copied!',
      message: 'Referral code copied to clipboard',
      type: 'success',
    });
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(referralLink);
    (globalThis as any).__partnersShowToast?.({
      title: 'Copied!',
      message: 'Referral link copied to clipboard',
      type: 'success',
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join GroomLink Partners and grow your business! Use my referral code: ${referralCode}\n\n${referralLink}`,
        title: 'Refer a Friend to GroomLink Partners',
      });
    } catch {
      // User cancelled
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header with referral graphic */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="gift-outline" size={48} color="#006B3F" />
          </View>
          <Text style={styles.heroTitle}>Refer a Friend</Text>
          <Text style={styles.heroSubtitle}>
            Invite other business owners to join GroomLink and grow together
          </Text>
        </View>

        {/* Referral Code Card */}
        <Surface style={styles.codeCard} elevation={0}>
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          <TouchableOpacity onPress={handleCopyCode} activeOpacity={0.8}>
            <Text style={styles.codeValue}>{referralCode}</Text>
          </TouchableOpacity>
          <Text style={styles.codeHint}>Tap to copy</Text>
        </Surface>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Button
            mode="contained"
            icon="share-outline"
            onPress={handleShare}
            style={styles.shareButton}
            buttonColor="#006B3F"
            textColor="#FFFFFF"
            theme={{ roundness: 12 }}
          >
            Share
          </Button>
          <Button
            mode="outlined"
            icon="link-outline"
            onPress={handleCopyLink}
            style={styles.copyButton}
            textColor="#006B3F"
            theme={{ roundness: 12 }}
          >
            Copy Link
          </Button>
        </View>

        {/* Referral Link */}
        <Surface style={styles.section} elevation={0}>
          <View style={styles.sectionHeader}>
            <Ionicons name="link-outline" size={20} color="#006B3F" />
            <Text variant="titleMedium" style={styles.sectionTitle}>Your Referral Link</Text>
          </View>
          <Divider style={styles.divider} />
          <TouchableOpacity style={styles.linkRow} onPress={handleCopyLink}>
            <Text style={styles.linkText} numberOfLines={1}>{referralLink}</Text>
            <Ionicons name="copy-outline" size={18} color="#006B3F" />
          </TouchableOpacity>
        </Surface>

        {/* How it works */}
        <Surface style={styles.section} elevation={0}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
            <Text variant="titleMedium" style={styles.sectionTitle}>How It Works</Text>
          </View>
          <Divider style={styles.divider} />

          <StepRow step={1} title="Share your code" subtitle="Send your referral code or link to a friend" theme={theme} />
          <StepRow step={2} title="They sign up" subtitle="Your friend creates a GroomLink Partners account" theme={theme} />
          <StepRow step={3} title="You both benefit" subtitle="Get rewarded when your friend completes their first booking" theme={theme} />
        </Surface>

        {/* Benefits */}
        <Surface style={styles.section} elevation={0}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star-outline" size={20} color="#D4A017" />
            <Text variant="titleMedium" style={styles.sectionTitle}>Referral Benefits</Text>
          </View>
          <Divider style={styles.divider} />

          <BenefitRow icon="cash-outline" text="Earn bonus credits for each successful referral" theme={theme} />
          <BenefitRow icon="trending-up-outline" text="Increase your salon's visibility on the platform" theme={theme} />
          <BenefitRow icon="ribbon-outline" text="Top referrers get featured placement" theme={theme} />
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

function StepRow({ step, title, subtitle, theme }: { step: number; title: string; subtitle: string; theme: AppTheme }) {
  return (
    <View style={stepStyles.row}>
      <View style={[stepStyles.circle, { backgroundColor: '#E8F5E9' }]}>
        <Text style={stepStyles.stepNum}>{step}</Text>
      </View>
      <View style={stepStyles.text}>
        <Text style={[stepStyles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[stepStyles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  circle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  stepNum: { fontSize: 14, fontWeight: '700', color: '#006B3F' },
  text: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
});

function BenefitRow({ icon, text, theme }: { icon: string; text: string; theme: AppTheme }) {
  return (
    <View style={benefitStyles.row}>
      <Ionicons name={icon as any} size={18} color="#D4A017" />
      <Text style={[benefitStyles.text, { color: theme.text }]}>{text}</Text>
    </View>
  );
}

const benefitStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  text: { fontSize: 14, flex: 1 },
});

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { padding: 16, paddingBottom: 32 },

  heroSection: { alignItems: 'center', paddingVertical: 24 },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: { fontSize: 22, fontWeight: 'bold', color: theme.text, marginBottom: 6 },
  heroSubtitle: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', paddingHorizontal: 24 },

  codeCard: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E8F5E9',
    borderStyle: 'dashed',
  },
  codeLabel: { fontSize: 13, color: theme.textSecondary, marginBottom: 8 },
  codeValue: { fontSize: 36, fontWeight: '800', color: '#006B3F', letterSpacing: 4 },
  codeHint: { fontSize: 12, color: theme.textTertiary, marginTop: 8 },

  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  shareButton: { flex: 1 },
  copyButton: { flex: 1, borderColor: '#006B3F' },

  section: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, paddingBottom: 8 },
  sectionTitle: { fontWeight: '600', color: theme.text },
  divider: { marginHorizontal: 16 },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  linkText: { flex: 1, fontSize: 13, color: '#006B3F', fontWeight: '500' },
});

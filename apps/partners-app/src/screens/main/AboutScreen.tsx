import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
const BUILD_NUMBER = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1';

export default function AboutScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Logo / Brand */}
        <View style={styles.brandSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="cut-outline" size={48} color="#006B3F" />
          </View>
          <Text style={styles.appName}>GroomLink Partners</Text>
          <Text style={styles.tagline}>Grow your business with GroomLink</Text>
        </View>

        {/* Version Info */}
        <Surface style={styles.section} elevation={0}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>v{APP_VERSION}</Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Build Number</Text>
            <Text style={styles.infoValue}>{BUILD_NUMBER}</Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Platform</Text>
            <Text style={styles.infoValue}>React Native (Expo)</Text>
          </View>
        </Surface>

        {/* Company Info */}
        <Surface style={styles.section} elevation={0}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business-outline" size={20} color="#006B3F" />
            <Text variant="titleMedium" style={styles.sectionTitle}>Company</Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Developed by</Text>
            <Text style={styles.infoValue}>Arthium Labs LLC</Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Region</Text>
            <Text style={styles.infoValue}>Ghana, West Africa</Text>
          </View>
          <Divider style={styles.divider} />
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => Linking.openURL('https://groomlinkgh.com')}
          >
            <Text style={styles.infoLabel}>Website</Text>
            <View style={styles.linkRow}>
              <Text style={[styles.infoValue, { color: '#006B3F' }]}>groomlinkgh.com</Text>
              <Ionicons name="open-outline" size={14} color="#006B3F" />
            </View>
          </TouchableOpacity>
        </Surface>

        {/* Features */}
        <Surface style={styles.section} elevation={0}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles-outline" size={20} color="#D4A017" />
            <Text variant="titleMedium" style={styles.sectionTitle}>Key Features</Text>
          </View>
          <Divider style={styles.divider} />

          <FeatureRow icon="calendar" label="Online Booking Management" theme={theme} />
          <FeatureRow icon="qr-code" label="QR Code Check-In" theme={theme} />
          <FeatureRow icon="wallet" label="Mobile Money Payouts" theme={theme} />
          <FeatureRow icon="people" label="Staff & Queue Management" theme={theme} />
          <FeatureRow icon="star" label="Customer Reviews & Ratings" theme={theme} />
          <FeatureRow icon="analytics" label="Analytics & Earnings Dashboard" theme={theme} />
        </Surface>

        {/* Arthium Labs Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Built with care by</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://arthiumlabs.com')}>
            <Text style={styles.footerBrand}>Arthium Labs LLC</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureRow({ icon, label, theme }: { icon: string; label: string; theme: AppTheme }) {
  return (
    <View style={featureStyles.row}>
      <Ionicons name={icon as any} size={18} color="#006B3F" />
      <Text style={[featureStyles.label, { color: theme.text }]}>{label}</Text>
    </View>
  );
}

const featureStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  label: { fontSize: 14, fontWeight: '500' },
});

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { padding: 16, paddingBottom: 32 },

  brandSection: { alignItems: 'center', paddingVertical: 32 },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: { fontSize: 22, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
  tagline: { fontSize: 14, color: theme.textSecondary },

  section: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, paddingBottom: 8 },
  sectionTitle: { fontWeight: '600', color: theme.text },
  divider: { marginHorizontal: 16 },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: { fontSize: 14, color: theme.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: theme.text },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  footer: { alignItems: 'center', marginTop: 24, gap: 4 },
  footerText: { fontSize: 12, color: theme.textTertiary },
  footerBrand: { fontSize: 14, fontWeight: '600', color: '#006B3F' },
});

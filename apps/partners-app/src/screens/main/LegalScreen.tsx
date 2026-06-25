import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

const LINKS = [
  {
    title: 'Terms of Service',
    subtitle: 'Rules for using GroomLink Partners',
    url: 'https://groomlinkgh.com/terms',
    icon: 'document-text-outline',
  },
  {
    title: 'Privacy Policy',
    subtitle: 'How we handle your data',
    url: 'https://groomlinkgh.com/privacy',
    icon: 'shield-checkmark-outline',
  },
  {
    title: 'Partner Agreement',
    subtitle: 'Service provider terms and conditions',
    url: 'https://groomlinkgh.com/partner-agreement',
    icon: 'briefcase-outline',
  },
  {
    title: 'Cancellation Policy',
    subtitle: 'Cancellation rules and refund eligibility',
    url: 'https://groomlinkgh.com/cancellation-policy',
    icon: 'close-circle-outline',
  },
  {
    title: 'Cookie Policy',
    subtitle: 'How we use cookies and tracking',
    url: 'https://groomlinkgh.com/cookies',
    icon: 'albums-outline',
  },
];

export default function LegalScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      // Fallback — just ignore if browser can't open
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.headerTitle}>Legal</Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            Review our terms, policies, and agreements
          </Text>
        </View>

        <Surface style={styles.section} elevation={0}>
          {LINKS.map((link, index) => (
            <React.Fragment key={link.title}>
              <TouchableOpacity style={styles.linkRow} onPress={() => openLink(link.url)}>
                <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name={link.icon as any} size={20} color="#006B3F" />
                </View>
                <View style={styles.linkText}>
                  <Text style={styles.linkTitle}>{link.title}</Text>
                  <Text style={styles.linkSubtitle}>{link.subtitle}</Text>
                </View>
                <Ionicons name="open-outline" size={18} color={theme.textTertiary} />
              </TouchableOpacity>
              {index < LINKS.length - 1 && <Divider style={styles.divider} />}
            </React.Fragment>
          ))}
        </Surface>

        {/* GDPR / Data Rights */}
        <Surface style={styles.section} elevation={0}>
          <View style={styles.sectionHeader}>
            <Ionicons name="lock-closed-outline" size={20} color="#3B82F6" />
            <Text variant="titleMedium" style={styles.sectionTitle}>Your Data Rights</Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.rightsContent}>
            <Text style={styles.rightsText}>
              Under the Ghana Data Protection Act (2012, Act 843) and GDPR, you have the right to:
            </Text>
            <RightsItem label="Access your personal data" theme={theme} />
            <RightsItem label="Request correction of inaccurate data" theme={theme} />
            <RightsItem label="Request deletion of your account and data" theme={theme} />
            <RightsItem label="Withdraw consent at any time" theme={theme} />
            <RightsItem label="Export your data in a portable format" theme={theme} />
          </View>
          <TouchableOpacity style={styles.exerciseButton} onPress={() => openLink('mailto:privacy@groomlinkgh.com')}>
            <Ionicons name="mail-outline" size={16} color="#006B3F" />
            <Text style={styles.exerciseText}>Exercise Your Rights</Text>
          </TouchableOpacity>
        </Surface>

        {/* Contact */}
        <View style={styles.contactSection}>
          <Text style={styles.contactText}>
            For legal inquiries, contact us at
          </Text>
          <TouchableOpacity onPress={() => openLink('mailto:legal@groomlinkgh.com')}>
            <Text style={styles.contactEmail}>legal@groomlinkgh.com</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RightsItem({ label, theme }: { label: string; theme: AppTheme }) {
  return (
    <View style={rightsStyles.row}>
      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
      <Text style={[rightsStyles.label, { color: theme.text }]}>{label}</Text>
    </View>
  );
}

const rightsStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  label: { fontSize: 13, fontWeight: '500' },
});

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { padding: 16, paddingBottom: 32 },

  header: { marginBottom: 20 },
  headerTitle: { fontWeight: 'bold', color: theme.text, fontSize: 24 },
  headerSubtitle: { color: theme.textSecondary, marginTop: 4 },

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
    padding: 14,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkText: { flex: 1 },
  linkTitle: { fontSize: 15, fontWeight: '500', color: theme.text },
  linkSubtitle: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },

  rightsContent: { paddingHorizontal: 16, paddingVertical: 8 },
  rightsText: { fontSize: 13, color: theme.textSecondary, marginBottom: 12, lineHeight: 20 },
  exerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  exerciseText: { fontSize: 14, fontWeight: '600', color: '#006B3F' },

  contactSection: { alignItems: 'center', marginTop: 16, gap: 4 },
  contactText: { fontSize: 13, color: theme.textSecondary },
  contactEmail: { fontSize: 14, fontWeight: '600', color: '#006B3F' },
});

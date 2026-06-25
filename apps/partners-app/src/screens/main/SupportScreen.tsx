import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

const SUPPORT_CHANNELS = [
  {
    title: 'Email Support',
    subtitle: 'support@groomlinkgh.com',
    icon: 'mail-outline' as const,
    color: '#3B82F6',
    bg: '#EFF6FF',
    url: 'mailto:support@groomlinkgh.com',
  },
  {
    title: 'WhatsApp',
    subtitle: '+233 XX XXX XXXX',
    icon: 'logo-whatsapp' as const,
    color: '#25D366',
    bg: '#E8F5E9',
    url: 'https://wa.me/233000000000?text=Hi%20GroomLink%20Support',
  },
  {
    title: 'Phone Call',
    subtitle: '+233 XX XXX XXXX',
    icon: 'call-outline' as const,
    color: '#006B3F',
    bg: '#E8F5E9',
    url: 'tel:+233000000000',
  },
];

const FAQ_ITEMS = [
  {
    q: 'How do I receive payouts?',
    a: 'Go to Profile > Request Payout. Funds are sent to your registered Mobile Money number within 24 hours.',
  },
  {
    q: 'How do I manage my staff?',
    a: 'Navigate to the Staff tab to add, edit, or manage your team members and their services.',
  },
  {
    q: 'What happens when a booking is cancelled?',
    a: 'Depending on the cancellation timing, a refund may be issued to the customer. Check your Cancellation Policy for details.',
  },
  {
    q: 'How do I get verified?',
    a: 'Go to Profile > KYC Verification and submit your business documents for review.',
  },
  {
    q: 'How does the queue system work?',
    a: 'When customers check in via QR code or arrive at your shop, they are automatically added to your queue.',
  },
];

export default function SupportScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.headerTitle}>Help & Support</Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            We're here to help you succeed with GroomLink
          </Text>
        </View>

        {/* Contact Channels */}
        <Surface style={styles.section} elevation={0}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubbles-outline" size={20} color="#006B3F" />
            <Text variant="titleMedium" style={styles.sectionTitle}>Contact Us</Text>
          </View>
          <Divider style={styles.divider} />

          {SUPPORT_CHANNELS.map((channel, index) => (
            <React.Fragment key={channel.title}>
              <TouchableOpacity style={styles.channelRow} onPress={() => openLink(channel.url)}>
                <View style={[styles.channelIcon, { backgroundColor: channel.bg }]}>
                  <Ionicons name={channel.icon} size={20} color={channel.color} />
                </View>
                <View style={styles.channelText}>
                  <Text style={styles.channelTitle}>{channel.title}</Text>
                  <Text style={styles.channelSubtitle}>{channel.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
              </TouchableOpacity>
              {index < SUPPORT_CHANNELS.length - 1 && <Divider style={styles.divider} />}
            </React.Fragment>
          ))}
        </Surface>

        {/* Operating Hours */}
        <Surface style={styles.section} elevation={0}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={20} color="#F59E0B" />
            <Text variant="titleMedium" style={styles.sectionTitle}>Support Hours</Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.hoursContent}>
            <View style={styles.hoursRow}>
              <Text style={styles.hoursDay}>Monday – Friday</Text>
              <Text style={styles.hoursTime}>8:00 AM – 8:00 PM</Text>
            </View>
            <View style={styles.hoursRow}>
              <Text style={styles.hoursDay}>Saturday</Text>
              <Text style={styles.hoursTime}>9:00 AM – 5:00 PM</Text>
            </View>
            <View style={styles.hoursRow}>
              <Text style={styles.hoursDay}>Sunday</Text>
              <Text style={styles.hoursTime}>Closed</Text>
            </View>
          </View>
        </Surface>

        {/* FAQ */}
        <Surface style={styles.section} elevation={0}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle-outline" size={20} color="#006B3F" />
            <Text variant="titleMedium" style={styles.sectionTitle}>Frequently Asked Questions</Text>
          </View>
          <Divider style={styles.divider} />

          {FAQ_ITEMS.map((item, index) => (
            <React.Fragment key={item.q}>
              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{item.q}</Text>
                <Text style={styles.faqAnswer}>{item.a}</Text>
              </View>
              {index < FAQ_ITEMS.length - 1 && <Divider style={styles.divider} />}
            </React.Fragment>
          ))}
        </Surface>

        {/* Report a Bug */}
        <TouchableOpacity style={styles.bugButton} onPress={() => openLink('mailto:bugs@groomlinkgh.com')}>
          <Ionicons name="bug-outline" size={18} color="#EF4444" />
          <Text style={styles.bugText}>Report a Bug</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

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

  channelRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelText: { flex: 1 },
  channelTitle: { fontSize: 15, fontWeight: '500', color: theme.text },
  channelSubtitle: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },

  hoursContent: { paddingHorizontal: 16, paddingBottom: 12 },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  hoursDay: { fontSize: 14, color: theme.textSecondary },
  hoursTime: { fontSize: 14, fontWeight: '600', color: theme.text },

  faqItem: { paddingHorizontal: 16, paddingVertical: 12 },
  faqQuestion: { fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 6 },
  faqAnswer: { fontSize: 13, color: theme.textSecondary, lineHeight: 19 },

  bugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: theme.surface,
    borderRadius: 14,
  },
  bugText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
});

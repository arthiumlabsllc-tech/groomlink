import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Divider,
  Switch,
  Text,
  Surface,
  ActivityIndicator,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { salonApi } from '../../api/salon';
import { CompletionSettings } from '../../types';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';
import * as Haptics from 'expo-haptics';

export default function CompletionSettingsScreen() {
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [completionSettings, setCompletionSettings] = useState<CompletionSettings>({
    autoCompletionHours: 2,
    requiresCustomerConfirmation: false,
    completionReminderEnabled: true,
    qrCheckinEnabled: false,
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch salon
  const { data: salon } = useQuery({
    queryKey: ['mySalon'],
    queryFn: salonApi.getMySalon,
  });

  // Fetch completion settings
  const { data: fetchedSettings, isLoading } = useQuery({
    queryKey: ['completionSettings', salon?.id],
    queryFn: () => (salon ? salonApi.getCompletionSettings(salon.id) : null),
    enabled: !!salon?.id,
  });

  useEffect(() => {
    if (fetchedSettings && !hasChanges) {
      setCompletionSettings(fetchedSettings);
    }
  }, [fetchedSettings, hasChanges]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (settings: Partial<CompletionSettings>) => {
      if (!salon?.id) throw new Error('No salon found');
      return salonApi.updateCompletionSettings(salon.id, settings);
    },
    onSuccess: () => {
      setHasChanges(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['completionSettings'] });
      Alert.alert('Success', 'Completion settings updated successfully');
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', `Failed to update settings: ${error.message}`);
    },
  });

  const handleChange = <K extends keyof CompletionSettings>(
    key: K,
    value: CompletionSettings[K]
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompletionSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateMutation.mutate(completionSettings);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Info card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={theme.info} />
          <Text style={styles.infoText}>
            Configure how services are marked as completed. These settings apply to all bookings.
          </Text>
        </View>

        {/* Auto-completion hours */}
        <Surface style={styles.section} elevation={0}>
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: theme.infoBg }]}>
              <Ionicons name="time-outline" size={20} color={theme.info} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Auto-completion</Text>
              <Text style={styles.menuSubtitle}>
                Automatically complete after {completionSettings.autoCompletionHours} hour(s)
              </Text>
            </View>
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                style={[styles.stepperButton, completionSettings.autoCompletionHours <= 1 && styles.stepperButtonDisabled]}
                onPress={() => {
                  if (completionSettings.autoCompletionHours > 1) {
                    handleChange('autoCompletionHours', completionSettings.autoCompletionHours - 1);
                  }
                }}
                disabled={completionSettings.autoCompletionHours <= 1}
              >
                <Ionicons name="remove" size={18} color={completionSettings.autoCompletionHours <= 1 ? theme.textTertiary : theme.info} />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{completionSettings.autoCompletionHours}</Text>
              <TouchableOpacity
                style={[styles.stepperButton, completionSettings.autoCompletionHours >= 6 && styles.stepperButtonDisabled]}
                onPress={() => {
                  if (completionSettings.autoCompletionHours < 6) {
                    handleChange('autoCompletionHours', completionSettings.autoCompletionHours + 1);
                  }
                }}
                disabled={completionSettings.autoCompletionHours >= 6}
              >
                <Ionicons name="add" size={18} color={completionSettings.autoCompletionHours >= 6 ? theme.textTertiary : theme.info} />
              </TouchableOpacity>
            </View>
          </View>

          <Divider style={styles.menuDivider} />

          {/* Customer confirmation */}
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: theme.warningBg }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.warning} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Customer Confirmation</Text>
              <Text style={styles.menuSubtitle}>Require customer to confirm completion</Text>
            </View>
            <Switch
              value={completionSettings.requiresCustomerConfirmation}
              onValueChange={(value) => handleChange('requiresCustomerConfirmation', value)}
              color={theme.accent}
            />
          </View>

          <Divider style={styles.menuDivider} />

          {/* Completion reminders */}
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: theme.accentBg }]}>
              <Ionicons name="notifications-outline" size={20} color={theme.accent} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Completion Reminders</Text>
              <Text style={styles.menuSubtitle}>Send reminders to complete service</Text>
            </View>
            <Switch
              value={completionSettings.completionReminderEnabled}
              onValueChange={(value) => handleChange('completionReminderEnabled', value)}
              color={theme.accent}
            />
          </View>

          <Divider style={styles.menuDivider} />

          {/* QR check-in */}
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: theme.successBg }]}>
              <Ionicons name="qr-code-outline" size={20} color={theme.success} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>QR Check-in</Text>
              <Text style={styles.menuSubtitle}>Allow customers to check in via QR</Text>
            </View>
            <Switch
              value={completionSettings.qrCheckinEnabled}
              onValueChange={(value) => handleChange('qrCheckinEnabled', value)}
              color={theme.accent}
            />
          </View>
        </Surface>

        {/* Save button */}
        {hasChanges && (
          <Button
            mode="contained"
            onPress={handleSave}
            loading={updateMutation.isPending}
            disabled={updateMutation.isPending}
            buttonColor={theme.accent}
            theme={{ roundness: 10 }}
            style={styles.saveButton}
          >
            Save Settings
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: theme.infoBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  section: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.text,
  },
  menuSubtitle: {
    fontSize: 12,
    color: theme.textTertiary,
    marginTop: 2,
  },
  menuDivider: {
    marginHorizontal: 16,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.infoBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonDisabled: {
    backgroundColor: theme.surfaceVariant,
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    minWidth: 24,
    textAlign: 'center',
  },
  saveButton: {
    marginTop: 20,
    borderRadius: 10,
  },
});

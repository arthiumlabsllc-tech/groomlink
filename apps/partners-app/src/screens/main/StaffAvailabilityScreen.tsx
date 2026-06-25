import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text, ActivityIndicator, Surface, Switch, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { salonApi } from '../../api/salon';
import { staffAvailabilityApi, StaffAvailability } from '../../api/staffAvailability';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function StaffAvailabilityScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();

  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [editingHours, setEditingHours] = useState<{ staffId: string; start: string; end: string } | null>(null);

  const { data: salon } = useQuery({
    queryKey: ['mySalon'],
    queryFn: salonApi.getMySalon,
  });

  const { data: staffList, isLoading, refetch } = useQuery({
    queryKey: ['staffAvailability', salon?.id],
    queryFn: () => (salon ? staffAvailabilityApi.getStaffAvailability(salon.id) : []),
    enabled: !!salon?.id,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ staffId, isAvailable }: { staffId: string; isAvailable: boolean }) =>
      salon ? staffAvailabilityApi.toggleAvailability(salon.id, staffId, isAvailable) : Promise.resolve(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffAvailability', salon?.id] });
    },
    onError: (error: Error) => {
      Alert.alert('Error', `Failed to update availability: ${error.message}`);
    },
  });

  const hoursMutation = useMutation({
    mutationFn: ({ staffId, start, end }: { staffId: string; start: string; end: string }) =>
      salon
        ? staffAvailabilityApi.updateWorkingHours(salon.id, staffId, {
            workingHours: { start, end },
          })
        : Promise.resolve(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffAvailability', salon?.id] });
      setEditingHours(null);
    },
    onError: (error: Error) => {
      Alert.alert('Error', `Failed to update hours: ${error.message}`);
    },
  });

  const handleToggle = useCallback((staffId: string, currentValue: boolean) => {
    toggleMutation.mutate({ staffId, isAvailable: !currentValue });
  }, [toggleMutation]);

  const staff = staffList || [];

  if (isLoading && !staffList) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#006B3F" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={['#006B3F']} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.headerTitle}>Staff Availability</Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            Manage who is currently available for bookings
          </Text>
        </View>

        {/* Summary */}
        <Surface style={styles.summaryCard} elevation={0}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{staff.length}</Text>
              <Text style={styles.summaryLabel}>Total Staff</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                {staff.filter((s) => s.isAvailable).length}
              </Text>
              <Text style={styles.summaryLabel}>Available</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                {staff.filter((s) => !s.isAvailable).length}
              </Text>
              <Text style={styles.summaryLabel}>Unavailable</Text>
            </View>
          </View>
        </Surface>

        {/* Staff List */}
        {staff.length === 0 ? (
          <Surface style={styles.section} elevation={0}>
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color={theme.textTertiary} />
              <Text style={styles.emptyText}>No staff members yet</Text>
              <Text style={styles.emptySubtext}>Add staff from the Staff tab to manage availability</Text>
            </View>
          </Surface>
        ) : (
          staff.map((member: StaffAvailability, index: number) => (
            <Surface key={member.staffId} style={[styles.section, { marginBottom: 12 }]} elevation={0}>
              <TouchableOpacity
                style={styles.staffRow}
                onPress={() => setExpandedStaff(expandedStaff === member.staffId ? null : member.staffId)}
                activeOpacity={0.7}
              >
                <View style={[styles.avatar, { backgroundColor: member.isAvailable ? '#E8F5E9' : '#FEF2F2' }]}>
                  <Text style={[styles.avatarText, { color: member.isAvailable ? '#10B981' : '#EF4444' }]}>
                    {member.staffName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName} numberOfLines={1}>{member.staffName}</Text>
                  <View style={styles.staffStatusRow}>
                    <View style={[styles.statusDot, { backgroundColor: member.isAvailable ? '#10B981' : '#EF4444' }]} />
                    <Text style={[styles.statusLabel, { color: member.isAvailable ? '#10B981' : '#EF4444' }]}>
                      {member.isAvailable ? 'Available' : 'Unavailable'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={member.isAvailable}
                  onValueChange={() => handleToggle(member.staffId, member.isAvailable)}
                  color="#006B3F"
                />
              </TouchableOpacity>

              {/* Expanded Details */}
              {expandedStaff === member.staffId && (
                <View style={styles.expandedSection}>
                  <Divider style={styles.expandedDivider} />
                  <View style={styles.hoursRow}>
                    <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
                    <Text style={styles.hoursLabel}>Working Hours</Text>
                    <Text style={styles.hoursValue}>
                      {member.workingHours?.start || '08:00'} – {member.workingHours?.end || '18:00'}
                    </Text>
                  </View>

                  {/* Working Days */}
                  <View style={styles.daysContainer}>
                    {DAYS.map((day) => {
                      const active = member.workingDays?.includes(day) || false;
                      return (
                        <View
                          key={day}
                          style={[
                            styles.dayChip,
                            {
                              backgroundColor: active ? '#E8F5E9' : theme.surfaceVariant,
                              borderColor: active ? '#10B981' : theme.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              { color: active ? '#10B981' : theme.textTertiary },
                            ]}
                          >
                            {day.slice(0, 3)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </Surface>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 32 },

  header: { marginBottom: 20 },
  headerTitle: { fontWeight: 'bold', color: theme.text, fontSize: 24 },
  headerSubtitle: { color: theme.textSecondary, marginTop: 4 },

  summaryCard: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 36, backgroundColor: theme.border },
  summaryValue: { fontSize: 20, fontWeight: 'bold', color: theme.text },
  summaryLabel: { fontSize: 12, color: theme.textSecondary, marginTop: 4 },

  section: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '500', color: theme.text },
  emptySubtext: { fontSize: 13, color: theme.textSecondary, textAlign: 'center' },

  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 15, fontWeight: '600', color: theme.text },
  staffStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontWeight: '500' },

  expandedSection: { paddingBottom: 12 },
  expandedDivider: { marginHorizontal: 16, marginBottom: 12 },

  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  hoursLabel: { fontSize: 14, color: theme.textSecondary, flex: 1 },
  hoursValue: { fontSize: 14, fontWeight: '600', color: theme.text },

  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 6,
  },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  dayText: { fontSize: 11, fontWeight: '600' },
});

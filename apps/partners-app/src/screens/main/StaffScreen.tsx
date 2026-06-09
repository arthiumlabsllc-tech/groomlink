import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FAB, IconButton, ActivityIndicator, Surface, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { staffApi, StaffMember } from '../../api/staff';
import { salonApi } from '../../api/salon';
import { MainStackParamList } from '../../types/navigation';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

export default function StaffScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Fetch salon to get salon ID
  const { data: salon, isLoading: isLoadingSalon } = useQuery({
    queryKey: ['mySalon'],
    queryFn: salonApi.getMySalon,
  });

  const salonId = salon?.id;

  // Fetch staff
  const {
    data: staffData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['staff', salonId],
    queryFn: () => staffApi.getStaff(salonId!),
    enabled: !!salonId,
  });

  const staff = staffData || [];

  // Delete staff mutation
  const deleteMutation = useMutation({
    mutationFn: (staffId: string) => staffApi.deleteStaff(salonId!, staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', salonId] });
    },
    onError: (error: Error) => {
      Alert.alert('Error', `Failed to delete staff member: ${error.message}`);
    },
  });

  const handleDeleteStaff = (staffMember: StaffMember) => {
    Alert.alert(
      'Remove Staff Member',
      `Are you sure you want to remove "${staffMember.fullName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(staffMember.id),
        },
      ]
    );
  };

  const handleEditStaff = (staffMember: StaffMember) => {
    navigation.navigate('AddStaff', { staffId: staffMember.id, staff: staffMember as any });
  };

  const handleAddStaff = () => {
    navigation.navigate('AddStaff');
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n?.[0] || '').join('').toUpperCase().slice(0, 2) || 'U';
  };

  const renderStaffItem = ({ item }: { item: StaffMember }) => (
    <TouchableOpacity onPress={() => handleEditStaff(item)} activeOpacity={0.7}>
      <Surface style={[styles.staffCard, !item.isActive && styles.inactiveCard]} elevation={0}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{getInitials(item.fullName)}</Text>
            </View>
            {item.isActive && (
              <View style={styles.activeDot}>
                <View style={styles.activeDotInner} />
              </View>
            )}
          </View>
          <View style={styles.staffInfo}>
            <Text style={styles.staffName}>{item.fullName}</Text>
            {item.specialty && (
              <Text style={styles.staffRole}>{item.specialty}</Text>
            )}
            {item.phoneNumber && (
              <View style={styles.phoneRow}>
                <Ionicons name="call-outline" size={12} color="#9CA3AF" />
                <Text style={styles.staffPhone}>{item.phoneNumber}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteStaff(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#CE1126" />
          </TouchableOpacity>
        </View>

        {item.workerServices && item.workerServices.length > 0 && (
          <View style={styles.servicesSection}>
            <Text style={styles.servicesLabel}>Services</Text>
            <View style={styles.servicesList}>
              {item.workerServices.slice(0, 4).map((ws, index) => (
                <Chip
                  key={index}
                  style={styles.serviceChip}
                  textStyle={styles.serviceChipText}
                  compact
                >
                  {ws.service?.name || 'Service'}
                </Chip>
              ))}
              {item.workerServices.length > 4 && (
                <Chip style={styles.moreChip} textStyle={styles.moreChipText} compact>
                  +{item.workerServices.length - 4}
                </Chip>
              )}
            </View>
          </View>
        )}

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={16} color="#006B3F" />
            <Text style={styles.statValue}>{item._count?.bookings || 0}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="star-outline" size={16} color="#FCD116" />
            <Text style={styles.statValue}>{item._count?.reviews || 0}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          {item.rating !== undefined && item.rating > 0 && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="star" size={16} color="#FCD116" />
                <Text style={styles.statValue}>{item.rating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.editHint}>
          <Text style={styles.editHintText}>Tap to edit</Text>
          <Ionicons name="chevron-forward" size={16} color="#006B3F" />
        </View>
      </Surface>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="people-outline" size={48} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyStateTitle}>No team members yet</Text>
      <Text style={styles.emptyStateSubtext}>Add your first team member to start assigning services</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleAddStaff}>
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>Add Staff</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoadingSalon) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#006B3F" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle" size={48} color="#CE1126" />
          </View>
          <Text style={styles.errorText}>Failed to load staff</Text>
          <Text style={styles.errorSubtext}>{(error as Error)?.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <Surface style={styles.header} elevation={0}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Staff</Text>
            <Text style={styles.headerSubtitle}>
              {staff.length} team member{staff.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddStaff}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Surface>

      <FlatList
        data={staff}
        keyExtractor={(item) => item.id}
        renderItem={renderStaffItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={['#006B3F']}
            tintColor="#006B3F"
          />
        }
        ListEmptyComponent={renderEmptyState}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        color="#FFFFFF"
        onPress={handleAddStaff}
        theme={{ roundness: 16 }}
      />
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.dangerBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginTop: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.accent,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  staffCard: {
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: theme.surface,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  inactiveCard: {
    opacity: 0.6,
    backgroundColor: theme.background,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSection: {
    position: 'relative',
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  staffRole: {
    fontSize: 13,
    color: theme.accent,
    marginTop: 2,
    fontWeight: '500',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  staffPhone: {
    fontSize: 12,
    color: theme.textTertiary,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.dangerBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  servicesSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  servicesLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  servicesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  serviceChip: {
    backgroundColor: theme.successBg,
    height: 28,
  },
  serviceChipText: {
    fontSize: 12,
    color: theme.accent,
  },
  moreChip: {
    backgroundColor: theme.surfaceVariant,
    height: 28,
  },
  moreChipText: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#F3F4F6',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
  },
  statLabel: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  editHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 4,
  },
  editHintText: {
    fontSize: 13,
    color: theme.accent,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.accent,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#006B3F',
  },
});

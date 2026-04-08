import React from 'react';
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
import { Card, FAB, IconButton, ActivityIndicator, Surface, Chip } from 'react-native-paper';
import { staffApi, StaffMember } from '../../api/staff';
import { salonApi } from '../../api/salon';
import { MainStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

export default function StaffScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

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

  const staff = staffData?.staff || [];

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

  const renderStaffItem = ({ item }: { item: StaffMember }) => (
    <TouchableOpacity onPress={() => handleEditStaff(item)} onLongPress={() => handleDeleteStaff(item)}>
      <Card style={[styles.staffCard, !item.isActive && styles.inactiveCard]}>
        <Card.Content>
          <View style={styles.staffHeader}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </Text>
            </View>
            <View style={styles.staffInfo}>
              <Text style={styles.staffName}>{item.fullName}</Text>
              {item.specialty && (
                <Text style={styles.staffRole}>{item.specialty}</Text>
              )}
              {item.phoneNumber && (
                <Text style={styles.staffPhone}>{item.phoneNumber}</Text>
              )}
            </View>
            <IconButton
              icon="delete-outline"
              size={20}
              iconColor="#D32F2F"
              onPress={() => handleDeleteStaff(item)}
            />
          </View>

          {item.workerServices && item.workerServices.length > 0 && (
            <View style={styles.servicesContainer}>
              <Text style={styles.servicesLabel}>Services:</Text>
              <View style={styles.servicesList}>
                {item.workerServices.slice(0, 4).map((ws, index) => (
                  <Chip
                    key={index}
                    style={styles.serviceChip}
                    textStyle={styles.serviceChipText}
                    compact
                  >
                    {ws.service.name}
                  </Chip>
                ))}
                {item.workerServices.length > 4 && (
                  <Chip style={styles.serviceChip} textStyle={styles.serviceChipText} compact>
                    +{item.workerServices.length - 4} more
                  </Chip>
                )}
              </View>
            </View>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item._count?.bookings || 0}</Text>
              <Text style={styles.statLabel}>Bookings</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item._count?.reviews || 0}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            {item.rating !== undefined && item.rating > 0 && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.rating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <IconButton icon="account-group-outline" size={64} iconColor="#BDBDBD" />
      <Text style={styles.emptyStateText}>No staff members yet.</Text>
      <Text style={styles.emptyStateSubtext}>Add your team!</Text>
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
          <IconButton icon="alert-circle-outline" size={64} iconColor="#D32F2F" />
          <Text style={styles.errorText}>Failed to load staff</Text>
          <Text style={styles.errorSubtext}>{(error as Error)?.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Surface style={styles.header}>
        <Text style={styles.headerTitle}>Staff</Text>
        <Text style={styles.headerSubtitle}>
          {staff.length} team member{staff.length !== 1 ? 's' : ''}
        </Text>
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
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#D32F2F',
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#006B3F',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  staffCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  inactiveCard: {
    opacity: 0.7,
    backgroundColor: '#FAFAFA',
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#006B3F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  staffInfo: {
    flex: 1,
    marginLeft: 12,
  },
  staffName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  staffRole: {
    fontSize: 14,
    color: '#006B3F',
    marginTop: 2,
  },
  staffPhone: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  servicesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  servicesLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 8,
  },
  servicesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  serviceChip: {
    backgroundColor: '#E8F5E9',
  },
  serviceChipText: {
    fontSize: 12,
    color: '#006B3F',
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#757575',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#006B3F',
    borderRadius: 30,
  },
});

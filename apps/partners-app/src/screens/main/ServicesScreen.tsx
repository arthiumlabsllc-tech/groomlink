import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch, ActivityIndicator, Surface, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { servicesApi, Service } from '../../api/services';
import { salonApi } from '../../api/salon';
import { MainStackParamList } from '../../types/navigation';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';
import * as Haptics from 'expo-haptics';
import { useAccessibility, a11yCurrency, a11yDuration } from '../../hooks/useAccessibility';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const SERVICE_CATEGORIES: Record<string, string> = {
  HAIRCUT: 'Haircut',
  STYLING: 'Styling',
  COLORING: 'Coloring',
  TREATMENT: 'Treatment',
  NAILS: 'Nails',
  FACIAL: 'Facial',
  OTHER: 'Other',
};

export default function ServicesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { announce } = useAccessibility();

  // Fetch salon to get salon ID
  const { data: salon, isLoading: isLoadingSalon } = useQuery({
    queryKey: ['mySalon'],
    queryFn: salonApi.getMySalon,
  });

  const salonId = salon?.id;

  // Fetch services
  const {
    data: servicesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['services', salonId],
    queryFn: () => servicesApi.getServices(salonId!),
    enabled: !!salonId,
  });

  const services = servicesData || [];
  const [searchQuery, setSearchQuery] = useState('');

  // Filter services based on search
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase();
    return services.filter((s: Service) =>
      s.name.toLowerCase().includes(q) ||
      (s.category && s.category.toLowerCase().includes(q))
    );
  }, [services, searchQuery]);

  // Toggle service status mutation
  const toggleMutation = useMutation({
    mutationFn: ({ serviceId, isActive }: { serviceId: string; isActive: boolean }) =>
      servicesApi.toggleServiceStatus(salonId!, serviceId, isActive),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['services', salonId] });
      announce(variables.isActive ? 'Service activated' : 'Service deactivated');
    },
    onError: (error: Error) => {
      Alert.alert('Error', `Failed to update service: ${error.message}`);
    },
  });

  // Delete service mutation
  const deleteMutation = useMutation({
    mutationFn: (serviceId: string) => servicesApi.deleteService(salonId!, serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', salonId] });
      announce('Service deleted');
    },
    onError: (error: Error) => {
      Alert.alert('Error', `Failed to delete service: ${error.message}`);
    },
  });

  const handleToggleStatus = (service: Service) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleMutation.mutate({ serviceId: service.id, isActive: !service.isActive });
  };

  const handleDeleteService = (service: Service) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete "${service.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(service.id),
        },
      ]
    );
  };

  const handleEditService = (service: Service) => {
    navigation.navigate('AddService', { serviceId: service.id, service });
  };

  const handleAddService = () => {
    navigation.navigate('AddService');
  };

  const formatPrice = (price: number | string) => {
    return `GH₵${parseFloat(String(price)).toFixed(2)}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const renderRightActions = (item: Service) => (
    <TouchableOpacity
      style={styles.swipeDeleteAction}
      onPress={() => handleDeleteService(item)}
    >
      <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
      <Text style={styles.swipeDeleteText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderServiceItem = ({ item }: { item: Service }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item)}
      overshootRight={false}
    >
      <TouchableOpacity
        onPress={() => handleEditService(item)}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${SERVICE_CATEGORIES[item.category] || item.category}, ${a11yCurrency(item.price)}, ${a11yDuration(item.duration)}, ${item.isActive ? 'active' : 'inactive'}`}
        accessibilityHint="Double tap to edit. Swipe left to delete."
        accessibilityActions={[
          { name: 'activate', label: 'Edit service' },
          { name: 'delete', label: 'Delete service' },
        ]}
        onAccessibilityAction={(event) => {
          switch (event.nativeEvent.actionName) {
            case 'activate':
              handleEditService(item);
              break;
            case 'delete':
              handleDeleteService(item);
              break;
          }
        }}
      >
        <Surface style={[styles.serviceCard, !item.isActive && styles.inactiveCard]} elevation={0}>
          <View style={styles.cardHeader}>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName} numberOfLines={1}>{item.name}</Text>
              <Chip style={styles.categoryChip} textStyle={styles.categoryChipText} compact>
                {SERVICE_CATEGORIES[item.category] || item.category}
              </Chip>
            </View>
            <Switch
              value={item.isActive}
              onValueChange={() => handleToggleStatus(item)}
              color="#006B3F"
              accessibilityLabel={`${item.name} is ${item.isActive ? 'active' : 'inactive'}. Toggle to ${item.isActive ? 'deactivate' : 'activate'}`}
              accessibilityRole="switch"
            />
          </View>
          
          <View style={styles.cardDivider} />
          
          <View style={styles.cardDetails}>
            <View style={styles.detailColumn}>
              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={16} color={theme.textSecondary} />
                <Text style={styles.detailLabel}>Price</Text>
              </View>
              <Text style={styles.priceValue}>{formatPrice(item.price)}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailColumn}>
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
                <Text style={styles.detailLabel}>Duration</Text>
              </View>
              <Text style={styles.durationValue}>{formatDuration(item.duration)}</Text>
            </View>
          </View>

          {item.description && (
            <Text style={styles.serviceDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.cardFooter}>
            <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
          </View>
        </Surface>
      </TouchableOpacity>
    </Swipeable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="scissors" size={48} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyStateTitle}>No services yet</Text>
      <Text style={styles.emptyStateSubtext}>Add your first service to start accepting bookings</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleAddService}>
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>Add Service</Text>
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
          <Text style={styles.errorText}>Failed to load services</Text>
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
            <Text style={styles.headerTitle}>Services</Text>
            <Text style={styles.headerSubtitle}>
              {services.length} service{services.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddService}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Surface>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={theme.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search services..."
          placeholderTextColor={theme.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredServices}
        keyExtractor={(item) => item.id}
        renderItem={renderServiceItem}
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
    paddingBottom: 24,
  },
  serviceCard: {
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 6,
  },
  categoryChip: {
    backgroundColor: theme.successBg,
    minHeight: 28,
    alignSelf: 'flex-start',
  },
  categoryChipText: {
    fontSize: 11,
    color: theme.accent,
    fontWeight: '500',
    lineHeight: 16,
  },
  cardDivider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 14,
  },
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailColumn: {
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.textTertiary,
  },
  detailDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.border,
    marginHorizontal: 16,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.accent,
  },
  durationValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  serviceDescription: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 12,
    lineHeight: 20,
  },
  cardFooter: {
    alignItems: 'flex-end',
    marginTop: 10,
  },
  swipeDeleteAction: {
    backgroundColor: '#CE1126',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 12,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.surfaceVariant,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.text,
    padding: 0,
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

});

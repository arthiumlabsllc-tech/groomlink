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
import { Card, Switch, FAB, IconButton, ActivityIndicator, Surface } from 'react-native-paper';
import { servicesApi, Service } from '../../api/services';
import { salonApi } from '../../api/salon';
import { MainStackParamList } from '../../types/navigation';

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

  const services = servicesData?.services || [];

  // Toggle service status mutation
  const toggleMutation = useMutation({
    mutationFn: ({ serviceId, isActive }: { serviceId: string; isActive: boolean }) =>
      servicesApi.toggleServiceStatus(salonId!, serviceId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', salonId] });
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
    },
    onError: (error: Error) => {
      Alert.alert('Error', `Failed to delete service: ${error.message}`);
    },
  });

  const handleToggleStatus = (service: Service) => {
    toggleMutation.mutate({ serviceId: service.id, isActive: !service.isActive });
  };

  const handleDeleteService = (service: Service) => {
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

  const formatPrice = (price: number) => {
    return `GHS ${price.toFixed(2)}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const renderServiceItem = ({ item }: { item: Service }) => (
    <TouchableOpacity onPress={() => handleEditService(item)} onLongPress={() => handleDeleteService(item)}>
      <Card style={[styles.serviceCard, !item.isActive && styles.inactiveCard]}>
        <Card.Content>
          <View style={styles.serviceHeader}>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{item.name}</Text>
              <Text style={styles.serviceCategory}>
                {SERVICE_CATEGORIES[item.category] || item.category}
              </Text>
            </View>
            <View style={styles.serviceActions}>
              <Switch
                value={item.isActive}
                onValueChange={() => handleToggleStatus(item)}
                color="#006B3F"
              />
              <IconButton
                icon="delete-outline"
                size={20}
                iconColor="#D32F2F"
                onPress={() => handleDeleteService(item)}
              />
            </View>
          </View>
          <View style={styles.serviceDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.detailValue}>{formatPrice(item.price)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{formatDuration(item.duration)}</Text>
            </View>
          </View>
          {item.description && (
            <Text style={styles.serviceDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <IconButton icon="scissors" size={64} iconColor="#BDBDBD" />
      <Text style={styles.emptyStateText}>No services yet.</Text>
      <Text style={styles.emptyStateSubtext}>Add your first service!</Text>
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
          <Text style={styles.errorText}>Failed to load services</Text>
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
        <Text style={styles.headerTitle}>Services</Text>
        <Text style={styles.headerSubtitle}>
          {services.length} service{services.length !== 1 ? 's' : ''}
        </Text>
      </Surface>

      <FlatList
        data={services}
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

      <FAB
        icon="plus"
        style={styles.fab}
        color="#FFFFFF"
        onPress={handleAddService}
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
  serviceCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  inactiveCard: {
    opacity: 0.7,
    backgroundColor: '#FAFAFA',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  serviceInfo: {
    flex: 1,
    marginRight: 8,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  serviceCategory: {
    fontSize: 14,
    color: '#006B3F',
    marginTop: 2,
  },
  serviceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceDetails: {
    flexDirection: 'row',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginTop: 2,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#757575',
    marginTop: 8,
    lineHeight: 20,
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

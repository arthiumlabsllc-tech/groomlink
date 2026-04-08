import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Searchbar, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Salon } from '../../types';
import apiClient from '../../api/client';

type NavigationProp = any;

const fetchFeaturedSalons = async (): Promise<Salon[]> => {
  const response = await apiClient.get('/salons?limit=10');
  return response.data.data;
};

const fetchNearbySalons = async (): Promise<Salon[]> => {
  const response = await apiClient.get('/salons/nearby');
  return response.data.data;
};

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: featuredSalons, isLoading: featuredLoading, error: featuredError, refetch: refetchFeatured } = useQuery({
    queryKey: ['featured-salons'],
    queryFn: fetchFeaturedSalons,
  });

  const { data: nearbySalons, isLoading: nearbyLoading, error: nearbyError, refetch: refetchNearby } = useQuery({
    queryKey: ['nearby-salons'],
    queryFn: fetchNearbySalons,
  });

  const isLoading = featuredLoading || nearbyLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchFeatured(), refetchNearby()]);
    setRefreshing(false);
  }, [refetchFeatured, refetchNearby]);

  const renderSalonCard = (salon: Salon) => (
    <Card
      key={salon.id}
      style={styles.salonCard}
      onPress={() => navigation.navigate('SalonDetail', { salonId: salon.id })}
    >
      <Card.Cover source={{ uri: salon.images[0] || 'https://via.placeholder.com/300x150' }} />
      <Card.Content style={styles.cardContent}>
        <Text variant="titleMedium" numberOfLines={1}>{salon.businessName}</Text>
        <Text variant="bodySmall" numberOfLines={1} style={styles.address}>{salon.address}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#FCD116" />
          <Text variant="bodySmall">{salon.rating.toFixed(1)} ({salon.reviewCount})</Text>
          {salon.distance && (
            <Text variant="bodySmall" style={styles.distance}>• {salon.distance.toFixed(1)} km</Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={48} color="#CE1126" />
      <Text variant="bodyMedium" style={styles.errorText}>Failed to load salons</Text>
      <TouchableOpacity onPress={() => { refetchFeatured(); refetchNearby(); }}>
        <Text style={styles.retryText}>Tap to retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#006B3F" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#006B3F']} tintColor="#006B3F" />
        }
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.greeting}>Find Your Style</Text>
          <Searchbar
            placeholder="Search salons, services..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            iconColor="#006B3F"
            onSubmitEditing={() => navigation.navigate('Search', { query: searchQuery })}
          />
        </View>

        {/* Featured Salons */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Featured Salons</Text>
            <Button onPress={() => navigation.navigate('Search')} textColor="#006B3F">See All</Button>
          </View>
          {featuredLoading ? (
            <View style={styles.horizontalLoading}>{renderLoading()}</View>
          ) : featuredError ? (
            <View style={styles.horizontalLoading}>{renderError()}</View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {featuredSalons?.map(renderSalonCard)}
            </ScrollView>
          )}
        </View>

        {/* Nearby Salons */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Nearby Salons</Text>
            <Button onPress={() => navigation.navigate('Search')} textColor="#006B3F">See All</Button>
          </View>
          {nearbyLoading ? (
            renderLoading()
          ) : nearbyError ? (
            renderError()
          ) : nearbySalons && nearbySalons.length > 0 ? (
            nearbySalons.map(renderSalonCard)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={48} color="#ccc" />
              <Text variant="bodyMedium" style={styles.emptyText}>No nearby salons found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
  },
  greeting: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#006B3F',
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  horizontalScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  horizontalLoading: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  salonCard: {
    width: 280,
    marginRight: 12,
    marginBottom: 12,
  },
  cardContent: {
    paddingTop: 12,
  },
  address: {
    color: '#666',
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  distance: {
    color: '#666',
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 8,
    color: '#666',
  },
  retryText: {
    marginTop: 8,
    color: '#006B3F',
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 8,
    color: '#666',
  },
});

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Searchbar,
  Chip,
  Card,
  ActivityIndicator,
  Surface,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { salonApi, SearchFilters } from '../../api/salon';
import { Salon } from '../../types';
import { TabParamList } from '../../types/navigation';

const SALON_TYPES = [
  { label: 'All', value: '' },
  { label: 'Barbershop', value: 'BARBERSHOP' },
  { label: 'Hair Salon', value: 'HAIR_SALON' },
  { label: 'Nail Salon', value: 'NAIL_SALON' },
  { label: 'Spa', value: 'SPA' },
  { label: 'Beauty', value: 'BEAUTY_SALON' },
];

const RATING_FILTERS = [
  { label: 'Any Rating', value: 0 },
  { label: '4+', value: 4 },
  { label: '4.5+', value: 4.5 },
];

type SearchRouteProp = RouteProp<TabParamList, 'Search'>;

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<SearchRouteProp>();
  
  const [searchQuery, setSearchQuery] = useState(route.params?.query || '');
  const [selectedType, setSelectedType] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const filters: SearchFilters = {
    search: searchQuery || undefined,
    type: selectedType || undefined,
    minRating: minRating || undefined,
    limit: 20,
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['search-salons', filters],
    queryFn: () => salonApi.searchSalons(filters),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderSalonCard = useCallback(({ item }: { item: Salon }) => (
    <Card
      style={styles.salonCard}
      onPress={() => navigation.navigate('SalonDetail', { salonId: item.id })}
    >
      <Card.Cover
        source={{ uri: item.images?.[0] || 'https://via.placeholder.com/300x150' }}
        style={styles.cardImage}
      />
      <Card.Content style={styles.cardContent}>
        <Text variant="titleMedium" numberOfLines={1} style={styles.salonName}>
          {item.businessName}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} style={styles.address}>
          {item.address}, {item.city}
        </Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={16} color="#FCD116" />
          <Text variant="bodySmall" style={styles.ratingText}>
            {item.rating.toFixed(1)} ({item.reviewCount} reviews)
          </Text>
          {item.distance && (
            <Text variant="bodySmall" style={styles.distance}>
              • {item.distance.toFixed(1)} km
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  ), [navigation]);

  const renderEmptyState = () => {
    if (isLoading) return null;
    
    return (
      <View style={styles.emptyState}>
        <Ionicons name="search-outline" size={64} color="#ccc" />
        <Text variant="titleMedium" style={styles.emptyTitle}>No salons found</Text>
        <Text variant="bodyMedium" style={styles.emptySubtitle}>
          Try adjusting your filters or search terms
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Searchbar
        placeholder="Search salons, services..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor="#006B3F"
      />
      
      <View style={styles.filterSection}>
        <Text variant="labelMedium" style={styles.filterLabel}>Type</Text>
        <FlatList
          horizontal
          data={SALON_TYPES}
          keyExtractor={(item) => item.value || 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
          renderItem={({ item }) => (
            <Chip
              selected={selectedType === item.value}
              onPress={() => setSelectedType(item.value)}
              style={[
                styles.filterChip,
                selectedType === item.value && styles.filterChipSelected,
              ]}
              textStyle={selectedType === item.value ? styles.filterChipTextSelected : {}}
            >
              {item.label}
            </Chip>
          )}
        />
      </View>

      <View style={styles.filterSection}>
        <Text variant="labelMedium" style={styles.filterLabel}>Rating</Text>
        <View style={styles.ratingRow}>
          {RATING_FILTERS.map((filter) => (
            <Chip
              key={filter.value}
              selected={minRating === filter.value}
              onPress={() => setMinRating(filter.value)}
              style={[
                styles.filterChip,
                minRating === filter.value && styles.filterChipSelected,
              ]}
              textStyle={minRating === filter.value ? styles.filterChipTextSelected : {}}
            >
              {filter.label}
            </Chip>
          ))}
        </View>
      </View>
    </View>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#CE1126" />
          <Text variant="titleMedium" style={styles.errorTitle}>Failed to load salons</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={data?.salons || []}
        keyExtractor={(item) => item.id}
        renderItem={renderSalonCard}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#006B3F']} />
        }
        showsVerticalScrollIndicator={false}
      />
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
    marginBottom: 8,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  searchInput: {
    fontSize: 16,
  },
  filterSection: {
    marginTop: 16,
  },
  filterLabel: {
    marginBottom: 8,
    color: '#666',
  },
  filterChips: {
    gap: 8,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  filterChipSelected: {
    backgroundColor: '#006B3F',
  },
  filterChipTextSelected: {
    color: '#fff',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listContent: {
    paddingBottom: 16,
  },
  salonCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardImage: {
    height: 150,
  },
  cardContent: {
    padding: 12,
  },
  salonName: {
    fontWeight: '600',
    color: '#006B3F',
  },
  address: {
    color: '#666',
    marginTop: 4,
  },
  ratingText: {
    marginLeft: 4,
  },
  distance: {
    color: '#666',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    marginTop: 16,
    color: '#666',
  },
  emptySubtitle: {
    marginTop: 8,
    color: '#999',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    marginTop: 16,
    color: '#CE1126',
  },
  retryButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#006B3F',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
});

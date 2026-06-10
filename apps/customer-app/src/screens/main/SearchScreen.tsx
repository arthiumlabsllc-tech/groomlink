import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Text,
  Searchbar,
  Chip,
  Card,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { salonApi, SearchFilters } from '../../api/salon';
import { Salon } from '../../types';
import { TabParamList } from '../../types/navigation';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';
import { useResponsiveColumns } from '../../hooks/useResponsiveColumns';

// Design System Colors - theme-aware factory
const createColors = (t: AppTheme) => ({
  primaryGreen: '#006B3F',
  accentGold: '#FCD116',
  accentRed: '#CE1126',
  dark: '#1a1a2e',
  background: t.background,
  cardBackground: t.surface,
  textPrimary: t.text,
  textSecondary: t.textSecondary,
  border: t.border,
});

const SALON_TYPES = [
  { label: 'All', value: '' },
  { label: 'Barbershop', value: 'BARBERSHOP' },
  { label: 'Hair Salon', value: 'HAIR_SALON' },
  { label: 'Nail Salon', value: 'NAIL_SALON' },
  { label: 'Spa', value: 'SPA' },
  { label: 'Beauty', value: 'BEAUTY_SALON' },
];

// Service categories for filtering by what salons offer
const SERVICE_CATEGORIES = [
  { label: 'All Services', value: '' },
  { label: 'Haircut', value: 'Haircut' },
  { label: 'Dreadlocks', value: 'Dreadlocks' },
  { label: 'Braiding', value: 'Braiding' },
  { label: 'Beard Trim', value: 'Beard Trim' },
  { label: 'Nails', value: 'Nails' },
  { label: 'Makeup', value: 'Makeup' },
  { label: 'Massage', value: 'Massage' },
];

const RATING_FILTERS = [
  { label: 'Any Rating', value: 0 },
  { label: '4+ Stars', value: 4 },
  { label: '4.5+ Stars', value: 4.5 },
];

type SearchRouteProp = RouteProp<TabParamList, 'Search'>;

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<SearchRouteProp>();
  const { theme } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { numColumns, isTablet } = useResponsiveColumns();
  
  // Safely access route params with fallback
  const initialQuery = route.params?.query || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [homeServiceOnly, setHomeServiceOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const filters: SearchFilters = {
    search: searchQuery || undefined,
    type: selectedType || undefined,
    category: selectedCategory || undefined,
    homeService: homeServiceOnly || undefined,
    minRating: minRating || undefined,
    limit: 20,
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['search-salons', filters],
    queryFn: () => salonApi.searchSalons(filters),
    // Don't retry on error - show error state instead
    retry: false,
  });

  // Safely extract salons array from response
  const salons = data?.salons || [];

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
      <View style={styles.cardImageContainer}>
        {item.images?.[0] ? (
          <Image source={{ uri: item.images[0] }} style={styles.cardImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="storefront" size={48} color={COLORS.textSecondary} />
          </View>
        )}
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color={COLORS.accentGold} />
          <Text style={styles.ratingBadgeText}>{item.rating.toFixed(1)}</Text>
        </View>
      </View>
      <Card.Content style={styles.cardContent}>
        <Text variant="titleSmall" numberOfLines={1} style={styles.salonName}>
          {item.businessName}
        </Text>
        {(item as any).providerCategory === 'FREELANCER' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Ionicons name="person" size={12} color="#4F46E5" />
            <Text style={{ fontSize: 11, color: '#4F46E5', fontWeight: '500', marginLeft: 3 }}>Freelancer</Text>
          </View>
        )}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
          <Text variant="bodySmall" numberOfLines={1} style={styles.address}>
            {item.address}, {item.city}
          </Text>
        </View>
        <View style={styles.ratingRow}>
          <Text variant="bodySmall" style={styles.reviewCount}>
            {item.reviewCount} reviews
          </Text>
          {item.distance && (
            <Text variant="bodySmall" style={styles.distance}>
              • {item.distance.toFixed(1)} km
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  ), [navigation, styles, COLORS]);

  const renderEmptyState = () => {
    if (isLoading) return null;
    
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="search-outline" size={48} color={COLORS.textSecondary} />
        </View>
        <Text variant="titleMedium" style={styles.emptyTitle}>No salons found</Text>
        <Text variant="bodyMedium" style={styles.emptySubtitle}>
          Try adjusting your filters or search terms
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <Searchbar
          placeholder="Search salons, services..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          placeholderTextColor={COLORS.textSecondary}
          iconColor={COLORS.textSecondary}
          icon={() => null}
          elevation={0}
        />
      </View>
      
      <View style={styles.filterSection}>
        <Text variant="labelMedium" style={styles.filterLabel}>Category</Text>
        <FlatList
          horizontal
          data={SALON_TYPES}
          keyExtractor={(item) => item.value || 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
          renderItem={({ item }) => (
            <Chip
              selected={selectedType === item.value}
              onPress={() => setSelectedType(selectedType === item.value ? '' : item.value)}
              style={[
                styles.filterChip,
                selectedType === item.value && styles.filterChipSelected,
              ]}
              textStyle={selectedType === item.value ? styles.filterChipTextSelected : styles.filterChipText}
            >
              {item.label}
            </Chip>
          )}
        />
      </View>

      <View style={styles.filterSection}>
        <Text variant="labelMedium" style={styles.filterLabel}>Service</Text>
        <FlatList
          horizontal
          data={SERVICE_CATEGORIES}
          keyExtractor={(item) => item.value || 'all-svc'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
          renderItem={({ item }) => (
            <Chip
              selected={selectedCategory === item.value}
              onPress={() => setSelectedCategory(selectedCategory === item.value ? '' : item.value)}
              style={[
                styles.filterChip,
                selectedCategory === item.value && styles.filterChipSelected,
              ]}
              textStyle={selectedCategory === item.value ? styles.filterChipTextSelected : styles.filterChipText}
            >
              {item.label}
            </Chip>
          )}
        />
        <TouchableOpacity
          style={[styles.homeServiceToggle, homeServiceOnly && styles.homeServiceToggleActive]}
          onPress={() => setHomeServiceOnly(!homeServiceOnly)}
          activeOpacity={0.7}
        >
          <Ionicons name="home-outline" size={16} color={homeServiceOnly ? '#fff' : '#4F46E5'} />
          <Text style={[styles.homeServiceText, homeServiceOnly && styles.homeServiceTextActive]}>Home Service</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterSection}>
        <Text variant="labelMedium" style={styles.filterLabel}>Rating</Text>
        <View style={styles.ratingChips}>
          {RATING_FILTERS.map((filter) => (
            <Chip
              key={filter.value}
              selected={minRating === filter.value}
              onPress={() => setMinRating(filter.value)}
              style={[
                styles.filterChip,
                minRating === filter.value && styles.filterChipSelected,
              ]}
              textStyle={minRating === filter.value ? styles.filterChipTextSelected : styles.filterChipText}
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
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.accentRed} />
          <Text variant="titleMedium" style={styles.errorTitle}>Failed to load salons</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        key={numColumns}
        data={salons}
        keyExtractor={(item) => item.id}
        renderItem={renderSalonCard}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryGreen]} />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const createStyles = (COLORS: ReturnType<typeof createColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 16,
    backgroundColor: COLORS.cardBackground,
    marginBottom: 8,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    backgroundColor: 'transparent',
    elevation: 0,
    height: 48,
  },
  searchInput: {
    fontSize: 15,
  },
  filterSection: {
    marginTop: 16,
  },
  filterLabel: {
    marginBottom: 10,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterChips: {
    gap: 8,
    paddingRight: 16,
  },
  ratingChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primaryGreen,
    borderColor: COLORS.primaryGreen,
  },
  filterChipText: {
    color: COLORS.textSecondary,
  },
  filterChipTextSelected: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  salonCard: {
    flex: 1,
    marginBottom: 16,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cardImageContainer: {
    position: 'relative',
    height: 160,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardContent: {
    padding: 16,
  },
  salonName: {
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  address: {
    color: COLORS.textSecondary,
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewCount: {
    color: COLORS.textSecondary,
  },
  distance: {
    color: COLORS.primaryGreen,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    marginTop: 16,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  emptySubtitle: {
    marginTop: 8,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    marginTop: 16,
    color: COLORS.accentRed,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  homeServiceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#4F46E5',
    backgroundColor: COLORS.background,
    gap: 5,
  },
  homeServiceToggleActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  homeServiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  homeServiceTextActive: {
    color: '#fff',
  },
});

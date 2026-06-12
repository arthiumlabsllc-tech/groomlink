import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image, Dimensions, useWindowDimensions, Animated, Modal, FlatList, TextInput } from 'react-native';
import { Text, Card, Button, Searchbar, ActivityIndicator, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Salon } from '../../types';
import { salonApi } from '../../api/salon';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';
import { findNearestGhanaLocation, isWithinGhana, GHANA_LOCATIONS, GhanaLocation } from '../../utils/ghanaLocations';
import { resolveImageUrl } from '../../utils/imageUrl';
import { useResponsiveColumns } from '../../hooks/useResponsiveColumns';
import { a11ySalonLabel } from '../../hooks/useAccessibility';
import * as Haptics from 'expo-haptics';

// Design System Colors (theme-aware)
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

type NavigationProp = any;

// Service categories that match what salons offer
const SERVICE_CATEGORIES = [
  { label: 'All', value: '', icon: 'apps' },
  { label: 'Haircut', value: 'Haircut', icon: 'cut' },
  { label: 'Dreadlocks', value: 'Dreadlocks', icon: 'link' },
  { label: 'Braiding', value: 'Braiding', icon: 'grid' },
  { label: 'Beard Trim', value: 'Beard Trim', icon: 'happy' },
  { label: 'Nails', value: 'Nails', icon: 'hand-left' },
  { label: 'Makeup', value: 'Makeup', icon: 'color-palette' },
  { label: 'Massage', value: 'Massage', icon: 'water' },
];

interface LocationState {
  lat: number | null;
  lng: number | null;
  permissionDenied: boolean;
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { theme, isDark } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [homeServiceOnly, setHomeServiceOnly] = useState(false);
  const [detectedArea, setDetectedArea] = useState<GhanaLocation | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const { numColumns, isTablet } = useResponsiveColumns();
  const [location, setLocation] = useState<LocationState>({
    lat: null,
    lng: null,
    permissionDenied: false,
  });

  // Welcome animation
  const greetingFade = useRef(new Animated.Value(0)).current;
  const greetingSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(greetingFade, { toValue: 1, duration: 800, delay: 200, useNativeDriver: true }),
      Animated.timing(greetingSlide, { toValue: 0, duration: 800, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  // Request location permission on mount
  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Resolve detected area when location changes
  useEffect(() => {
    if (location.lat && location.lng) {
      const nearest = findNearestGhanaLocation(location.lat, location.lng, 30);
      setDetectedArea(nearest);
    }
  }, [location.lat, location.lng]);

  // Handle manual location selection from picker
  const handleLocationSelect = useCallback((loc: GhanaLocation) => {
    setLocation({ lat: loc.latitude, lng: loc.longitude, permissionDenied: false });
    setDetectedArea(loc);
    setShowLocationPicker(false);
    setLocationSearchQuery('');
  }, []);

  // Filtered locations for the picker
  const filteredLocations = useMemo(() => {
    if (!locationSearchQuery.trim()) return GHANA_LOCATIONS;
    const q = locationSearchQuery.toLowerCase();
    return GHANA_LOCATIONS.filter(loc =>
      loc.city.toLowerCase().includes(q) ||
      loc.region.toLowerCase().includes(q)
    );
  }, [locationSearchQuery]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocation(prev => ({ ...prev, permissionDenied: true }));
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const { latitude: lat, longitude: lng } = position.coords;
      
      // Validate coordinates are within Ghana
      if (!isWithinGhana(lat, lng)) {
        console.log('[HomeScreen] Location outside Ghana, using default');
        setLocation(prev => ({ ...prev, permissionDenied: true }));
        return;
      }
      
      setLocation({
        lat,
        lng,
        permissionDenied: false,
      });
      
      console.log(`[HomeScreen] Location set: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } catch (error) {
      console.log('[HomeScreen] Location permission error:', error);
      setLocation(prev => ({ ...prev, permissionDenied: true }));
    }
  };

  const { data: featuredSalons, isLoading: featuredLoading, error: featuredError, refetch: refetchFeatured } = useQuery({
    queryKey: ['featured-salons'],
    queryFn: () => salonApi.searchSalons({ featured: true, limit: 10 }),
  });

  // Extract salons array from the response
  const featuredSalonsList = featuredSalons?.salons || [];

  const { data: nearbySalons, isLoading: nearbyLoading, error: nearbyError, refetch: refetchNearby } = useQuery({
    queryKey: ['nearby-salons', location.lat, location.lng, selectedCategory, homeServiceOnly],
    queryFn: async (): Promise<Salon[]> => {
      if (location.lat && location.lng) {
        return salonApi.getNearbySalons(location.lat, location.lng);
      }
      // Fallback: fetch approved salons with category filter
      const result = await salonApi.searchSalons({ 
        limit: 10, 
        category: selectedCategory || undefined,
        homeService: homeServiceOnly || undefined,
      });
      return result.salons;
    },
    enabled: !location.permissionDenied || location.lat !== null,
  });

  // Filter nearby salons by category and home service
  const filteredNearbySalons = useMemo(() => {
    if (!nearbySalons) return [];
    let filtered = nearbySalons;
    
    if (selectedCategory) {
      filtered = filtered.filter((salon: Salon) => 
        salon.services?.some((service) =>
          service.category?.toLowerCase().includes(selectedCategory.toLowerCase())
        )
      );
    }
    
    if (homeServiceOnly) {
      filtered = filtered.filter((salon: Salon) => 
        (salon as any).providerCategory === 'FREELANCER' || 
        salon.services?.some((service) => (service as any).offersHomeService)
      );
    }
    
    return filtered;
  }, [nearbySalons, selectedCategory, homeServiceOnly]);

  const isLoading = featuredLoading || nearbyLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    // Re-request location on refresh if denied
    if (location.permissionDenied) {
      await requestLocationPermission();
    }
    await Promise.all([refetchFeatured(), refetchNearby()]);
    setRefreshing(false);
  }, [refetchFeatured, refetchNearby, location.permissionDenied]);

  // Navigate to Search tab (handles cross-tab navigation properly)
  const navigateToSearch = useCallback((filter?: string) => {
    // Use the parent navigator to switch tabs
    navigation.getParent()?.navigate('Search', { filter });
  }, [navigation]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserName = () => {
    return user?.firstName || 'there';
  };

  const renderSalonCard = (salon: Salon, isHorizontal = true) => (
    <Card
      key={salon.id}
      style={[styles.salonCard, !isHorizontal && styles.salonCardVertical]}
      onPress={() => navigation.navigate('SalonDetail', { salonId: salon.id })}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={a11ySalonLabel(salon)}
    >
      <View style={styles.cardImageContainer}>
        {salon.images?.[0] ? (
          <Image source={{ uri: salon.images[0] }} style={styles.cardImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="storefront" size={40} color={COLORS.textSecondary} />
          </View>
        )}
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color={COLORS.accentGold} />
          <Text style={styles.ratingBadgeText}>{(salon.rating ?? 0).toFixed(1)}</Text>
        </View>
        {/* Favorite button with high-contrast background */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Add to favorites"
          accessibilityRole="button"
        >
          <Ionicons name="heart-outline" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        {isHorizontal && salon.isFeatured && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={10} color={COLORS.primaryGreen} />
            <Text style={styles.featuredBadgeText}>Featured</Text>
          </View>
        )}
      </View>
      <Card.Content style={styles.cardContent}>
        <Text variant="titleSmall" numberOfLines={1} style={styles.salonName}>
          {salon.businessName}
        </Text>
        {(salon as any).providerCategory === 'FREELANCER' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Ionicons name="person" size={12} color="#4F46E5" />
            <Text style={{ fontSize: 11, color: '#4F46E5', fontWeight: '500', marginLeft: 3 }}>Freelancer</Text>
          </View>
        )}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
          <Text variant="bodySmall" numberOfLines={1} style={styles.address}>
            {salon.address}
          </Text>
        </View>
        {salon.distance && (
          <Text variant="bodySmall" style={styles.distance}>
            {salon.distance.toFixed(1)} km away
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={48} color={COLORS.accentRed} />
      <Text variant="bodyMedium" style={styles.errorText}>Failed to load salons</Text>
      <TouchableOpacity onPress={() => { refetchFeatured(); refetchNearby(); }}>
        <Text style={styles.retryText}>Tap to retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primaryGreen} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryGreen]} tintColor={COLORS.primaryGreen} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Compact App Bar */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Image
              source={isDark ? require('../../../assets/logo-full-white.png') : require('../../../assets/logo-full-black.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.bellContainer}>
                <MaterialCommunityIcons name="bell-outline" size={24} color={COLORS.textPrimary} />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.avatarButton} onPress={() => navigation.getParent()?.navigate('Profile')}>
                {user?.avatar ? (
                  <Image
                    source={{ uri: resolveImageUrl(user.avatar)! }}
                    style={styles.userAvatarImage}
                  />
                ) : (
                  <View style={styles.userAvatarFallback}>
                    <Ionicons name="person" size={20} color={COLORS.textSecondary} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Greeting in body */}
        <Animated.View style={[styles.greetingSection, { opacity: greetingFade, transform: [{ translateY: greetingSlide }] }]}>
          <Text variant="bodyMedium" style={styles.greetingLabel} numberOfLines={1}>
            {getGreeting()},
          </Text>
          <Text variant="headlineSmall" style={styles.greetingName} numberOfLines={1}>
            {getUserName()}
          </Text>
        </Animated.View>

        {/* Search & Location */}
        <View style={styles.searchSection}>
          
          <Searchbar
            placeholder="Search salons, services..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            iconColor={COLORS.textSecondary}
            placeholderTextColor={COLORS.textSecondary}
            onSubmitEditing={() => navigation.getParent()?.navigate('Search', { query: searchQuery })}
          />

          {/* Location Detector Bar */}
          <TouchableOpacity
            style={styles.locationBar}
            onPress={() => setShowLocationPicker(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={detectedArea ? `Current location: ${detectedArea.city}, ${detectedArea.region}. Tap to change.` : 'Tap to set your location'}
          >
            <Ionicons name="location" size={16} color={COLORS.primaryGreen} />
            <Text style={styles.locationBarText} numberOfLines={1}>
              {detectedArea
                ? `${detectedArea.city}, ${detectedArea.region}`
                : location.permissionDenied
                  ? 'Set your location'
                  : 'Detecting location...'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Service Categories */}
        <View style={styles.categoriesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChips}
          >
            {SERVICE_CATEGORIES.map((cat) => (
              <Chip
                key={cat.value || 'all'}
                selected={selectedCategory === cat.value}
                onPress={() => setSelectedCategory(selectedCategory === cat.value ? '' : cat.value)}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.value && styles.categoryChipSelected,
                ]}
                textStyle={selectedCategory === cat.value ? styles.categoryChipTextSelected : styles.categoryChipText}
                icon={() => <Ionicons name={cat.icon as any} size={16} color={selectedCategory === cat.value ? '#fff' : COLORS.textSecondary} />}
              >
                {cat.label}
              </Chip>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={[styles.homeServiceToggle, homeServiceOnly && styles.homeServiceToggleActive]}
            onPress={() => setHomeServiceOnly(!homeServiceOnly)}
            activeOpacity={0.7}
          >
            <Ionicons name="home-outline" size={18} color={homeServiceOnly ? '#fff' : '#4F46E5'} />
            <Text style={[styles.homeServiceText, homeServiceOnly && styles.homeServiceTextActive]}>Home Service</Text>
          </TouchableOpacity>
        </View>

        {/* Featured Salons */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Featured Salons</Text>
            <Button onPress={() => navigateToSearch()} textColor={COLORS.primaryGreen}>See All</Button>
          </View>
          {featuredLoading ? (
            <View style={styles.horizontalLoading}>{renderLoading()}</View>
          ) : featuredError ? (
            <View style={styles.horizontalLoading}>{renderError()}</View>
          ) : featuredSalonsList.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={48} color={COLORS.border} />
              <Text variant="bodyMedium" style={styles.emptyText}>No featured salons yet</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {featuredSalonsList.map((salon) => renderSalonCard(salon, true))}
            </ScrollView>
          )}
        </View>

        {/* Nearby Salons */}
        <View style={[styles.section, styles.nearbySection]}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Nearby Salons</Text>
            <Button onPress={() => navigateToSearch()} textColor={COLORS.primaryGreen}>See All</Button>
          </View>
          {nearbyLoading ? (
            renderLoading()
          ) : nearbyError ? (
            renderError()
          ) : filteredNearbySalons && filteredNearbySalons.length > 0 ? (
            <View style={[styles.nearbyList, isTablet && styles.nearbyGrid]}>
              {filteredNearbySalons.map((salon) => (
                <View key={salon.id} style={isTablet ? { width: '32%' } : { width: '100%' }}>
                  {renderSalonCard(salon, false)}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyStateEnhanced}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="location-outline" size={48} color={COLORS.primaryGreen} />
              </View>
              <Text variant="titleMedium" style={styles.emptyStateTitle}>No salons nearby</Text>
              <Text variant="bodyMedium" style={styles.emptyText}>Try expanding your search or browse all salons</Text>
              <Button
                mode="outlined"
                onPress={() => navigateToSearch()}
                style={styles.emptyStateCta}
                textColor={COLORS.primaryGreen}
                icon="magnify"
              >
                Browse All Salons
              </Button>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <TouchableOpacity
          style={styles.locationPickerOverlay}
          activeOpacity={1}
          onPress={() => setShowLocationPicker(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.locationPickerContainer}>
            <View style={styles.locationPickerHeader}>
              <Text style={styles.locationPickerTitle}>Choose Location</Text>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.locationPickerSearch}
              placeholder="Search city or region..."
              placeholderTextColor={COLORS.textSecondary}
              value={locationSearchQuery}
              onChangeText={setLocationSearchQuery}
              autoFocus
            />
            <FlatList
              data={filteredLocations}
              keyExtractor={(item) => `${item.city}-${item.region}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.locationPickerItem}
                  onPress={() => handleLocationSelect(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location-outline" size={20} color={COLORS.primaryGreen} />
                  <View>
                    <Text style={styles.locationPickerItemCity}>{item.city}</Text>
                    <Text style={styles.locationPickerItemRegion}>{item.region} Region</Text>
                  </View>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (COLORS: ReturnType<typeof createColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLogo: {
    width: 120,
    height: 36,
  },
  greetingSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greetingLabel: {
    color: COLORS.textSecondary,
  },
  greetingName: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellContainer: {
    position: 'relative',
    padding: 4,
    marginRight: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.accentRed,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  avatarButton: {
    borderRadius: 22,
  },
  userAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    height: 48,
  },
  searchInput: {
    fontSize: 15,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  nearbySection: {
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    color: COLORS.textPrimary,
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
    width: 260,
    marginRight: 16,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  salonCardVertical: {
    width: '100%',
    marginRight: 0,
    marginBottom: 16,
  },
  cardImageContainer: {
    position: 'relative',
    height: 140,
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
  favoriteButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentGold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.dark,
  },
  cardContent: {
    padding: 12,
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
  },
  address: {
    color: COLORS.textSecondary,
    flex: 1,
  },
  distance: {
    color: COLORS.primaryGreen,
    marginTop: 4,
    fontWeight: '500',
  },
  nearbyList: {
    gap: 16,
  },
  nearbyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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
    color: COLORS.textSecondary,
  },
  retryText: {
    marginTop: 8,
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateEnhanced: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    marginHorizontal: 4,
    padding: 24,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.primaryGreen}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptyStateCta: {
    marginTop: 16,
    borderColor: COLORS.primaryGreen,
    borderRadius: 12,
  },
  emptyText: {
    marginTop: 8,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  categoriesSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  categoryChips: {
    gap: 8,
    paddingRight: 16,
    paddingVertical: 4,
  },
  categoryChip: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 4,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.primaryGreen,
    borderColor: COLORS.primaryGreen,
  },
  categoryChipText: {
    color: COLORS.textSecondary,
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  homeServiceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4F46E5',
    backgroundColor: COLORS.background,
    gap: 6,
  },
  homeServiceToggleActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  homeServiceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },
  homeServiceTextActive: {
    color: '#fff',
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    gap: 8,
  },
  locationBarText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  locationPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  locationPickerContainer: {
    backgroundColor: COLORS.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  locationPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  locationPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  locationPickerSearch: {
    margin: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  locationPickerItemCity: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  locationPickerItemRegion: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

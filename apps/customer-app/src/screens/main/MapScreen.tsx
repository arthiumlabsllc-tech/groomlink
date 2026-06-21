import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import { Text, Button, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Marker, Callout } from 'react-native-maps';
import type { Region } from 'react-native-maps';
import MapView from 'react-native-maps';
import * as Location from 'expo-location';
import { salonApi } from '../../api/salon';
import { Salon } from '../../types';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';
import { isWithinGhana, GHANA_LOCATIONS } from '../../utils/ghanaLocations';

// Use OpenStreetMap tiles (free, no API key required)
// react-native-maps uses Apple Maps on iOS and Google Maps on Android by default
// We'll use the default provider which works without API key for basic maps

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
  openGreen: '#22C55E',
  closedGray: '#9CA3AF',
});

const SALON_TYPES = [
  { label: 'All', value: '' },
  { label: 'Barbershop', value: 'BARBERSHOP' },
  { label: 'Hair Salon', value: 'HAIR_SALON' },
  { label: 'Beauty Salon', value: 'BEAUTY_SALON' },
  { label: 'Nail Salon', value: 'NAIL_SALON' },
  { label: 'Spa', value: 'SPA' },
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

const { width, height } = Dimensions.get('window');

const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Default location (Accra, Ghana)
const DEFAULT_LOCATION = {
  latitude: 5.6037,
  longitude: -0.1870,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};

type NavigationProp = any;

// Error boundary to catch MapView render crashes
interface MapErrorBoundaryProps {
  children: React.ReactNode;
  onMapError: () => void;
}
interface MapErrorBoundaryState {
  hasError: boolean;
}
class MapErrorBoundary extends React.Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  state: MapErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onMapError();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [homeServiceOnly, setHomeServiceOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [region, setRegion] = useState<Region>(DEFAULT_LOCATION);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [mapError, setMapError] = useState(false);

  const handleMapError = useCallback(() => {
    setMapError(true);
  }, []);

  const openDirections = useCallback((salon: Salon) => {
    if (salon.latitude && salon.longitude) {
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${salon.latitude},${salon.longitude}`
      ).catch(() => Alert.alert('Error', 'Could not open Google Maps.'));
    } else {
      const query = encodeURIComponent(salon.address || salon.businessName);
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${query}`
      ).catch(() => Alert.alert('Error', 'Could not open Google Maps.'));
    }
  }, []);

  // Get user location on mount
  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const { latitude, longitude } = location.coords;
        
        // Validate coordinates are within Ghana
        if (!isWithinGhana(latitude, longitude)) {
          console.log('[MapScreen] Location outside Ghana, using default');
          setRegion(DEFAULT_LOCATION);
          setLocationPermission(false);
          Alert.alert(
            'Location Outside Ghana',
            'Your location appears to be outside Ghana. Using Accra as default location.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        setUserLocation({ latitude, longitude });
        setRegion({
          latitude,
          longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });
        console.log(`[MapScreen] Location set: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      } else {
        Alert.alert(
          'Location Permission Required',
          'Please enable location services to find nearby salons.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[MapScreen] Error getting location:', error);
      setRegion(DEFAULT_LOCATION);
      setLocationPermission(false);
      Alert.alert(
        'Location Unavailable',
        'Unable to determine your location. Using default location instead.',
        [{ text: 'OK' }]
      );
    }
  };

  // Fetch salons for map
  const { data: salons, isLoading, error, refetch } = useQuery({
    queryKey: ['salons-map', region.latitude, region.longitude, selectedCategory, homeServiceOnly],
    queryFn: () => salonApi.getSalonsForMap(region.latitude, region.longitude, 10, selectedCategory || undefined, homeServiceOnly || undefined),
    enabled: !!region,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 2,
  });

  // Debug logging
  useEffect(() => {
    if (salons) {
      const withCoords = salons.filter((s: Salon) => s.latitude && s.longitude);
      console.log(`[MapScreen] Loaded ${salons.length} salons, ${withCoords.length} have coordinates`);
      if (withCoords.length > 0) {
        console.log('[MapScreen] Sample salon:', {
          name: withCoords[0].businessName,
          lat: withCoords[0].latitude,
          lng: withCoords[0].longitude,
        });
      }
    }
  }, [salons]);

  // Filter salons based on selected type (salon business type)
  const filteredSalons = React.useMemo(() => {
    if (!salons) return [];
    let filtered = salons;
    
    // Filter by salon business type
    if (selectedType) {
      filtered = filtered.filter((salon: Salon) => 
        (salon as any).type === selectedType
      );
    }
    
    // Client-side category filter (backup if server didn't filter)
    if (selectedCategory) {
      filtered = filtered.filter((salon: Salon) => {
        const hasMatchingService = salon.services?.some((service) =>
          service.category?.toLowerCase().includes(selectedCategory.toLowerCase())
        );
        return !!hasMatchingService;
      });
    }
    
    // Client-side home service filter (backup if server didn't filter)
    if (homeServiceOnly) {
      filtered = filtered.filter((salon: Salon) =>
        (salon as any).providerCategory === 'FREELANCER' ||
        salon.services?.some((service: any) => service.offersHomeService)
      );
    }
    
    return filtered;
  }, [salons, selectedType, selectedCategory, homeServiceOnly]);

  // Check if salon is currently open
  const isSalonOpen = useCallback((salon: Salon): boolean => {
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()];
    
    // Try operatingHours first (per-day hours from server)
    const hours = salon.operatingHours?.[currentDay];
    
    if (hours && typeof hours === 'object' && (hours as any).open && (hours as any).close) {
      const [openHour, openMin] = (hours as any).open.split(':').map(Number);
      if (isNaN(openHour) || isNaN(openMin)) return false;
      const [closeHour, closeMin] = (hours as any).close.split(':').map(Number);
      if (isNaN(closeHour) || isNaN(closeMin)) return false;
      const currentTime = now.getHours() * 60 + now.getMinutes();
      return currentTime >= (openHour * 60 + openMin) && currentTime <= (closeHour * 60 + closeMin);
    }
    
    // Fallback to openingTime/closingTime with workingDays
    if (salon.openingTime && salon.closingTime && salon.workingDays) {
      const dayUpper = currentDay.toUpperCase();
      if (!salon.workingDays.includes(dayUpper)) return false;
      const [openHour, openMin] = salon.openingTime.split(':').map(Number);
      if (isNaN(openHour) || isNaN(openMin)) return false;
      const [closeHour, closeMin] = salon.closingTime.split(':').map(Number);
      if (isNaN(closeHour) || isNaN(closeMin)) return false;
      const currentTime = now.getHours() * 60 + now.getMinutes();
      return currentTime >= (openHour * 60 + openMin) && currentTime <= (closeHour * 60 + closeMin);
    }
    
    return false;
  }, []);

  // Get marker color based on salon status
  const getMarkerColor = useCallback((salon: Salon): string => {
    const isOpen = isSalonOpen(salon);
    if (!isOpen) return COLORS.closedGray;
    if (salon.rating >= 4.0) return COLORS.openGreen;
    return COLORS.accentGold;
  }, [isSalonOpen]);

  // Center map on user location
  const centerOnUserLocation = useCallback(() => {
    if (userLocation) {
      setRegion({
        ...userLocation,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    } else {
      requestLocationPermission();
    }
  }, [userLocation]);

  // Handle search - geocode Ghana locations from GHANA_LOCATIONS database
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) { refetch(); return; }
    const query = searchQuery.trim().toLowerCase();
    const match = GHANA_LOCATIONS.find(loc =>
      loc.city.toLowerCase().includes(query) ||
      loc.region.toLowerCase().includes(query)
    );
    if (match) {
      setRegion({
        latitude: match.latitude,
        longitude: match.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05 * ASPECT_RATIO,
      });
      setSearchQuery(match.city + ', ' + match.region);
    } else {
      Alert.alert('Location Not Found', 'Try searching for a Ghana city or region (e.g. Kumasi, Tema, Accra).');
    }
  }, [searchQuery, refetch]);

  const renderMarker = (salon: Salon) => {
    // Skip salons without coordinates
    if (!salon.latitude || !salon.longitude) {
      console.log(`[MapScreen] Salon "${salon.businessName}" missing coordinates`);
      return null;
    }
    
    // Validate coordinates are reasonable (Ghana area)
    if (salon.latitude < 4 || salon.latitude > 12 || salon.longitude < -4 || salon.longitude > 2) {
      console.log(`[MapScreen] Salon "${salon.businessName}" has invalid coordinates: ${salon.latitude}, ${salon.longitude}`);
      return null;
    }
    
    const markerColor = getMarkerColor(salon);
    const isOpen = isSalonOpen(salon);

    return (
      <Marker
        key={salon.id}
        coordinate={{
          latitude: salon.latitude,
          longitude: salon.longitude,
        }}
        pinColor={markerColor}
        title={salon.businessName}
        description={isOpen ? 'Open' : 'Closed'}
      >
        <Callout
          onPress={() => navigation.navigate('SalonDetail', { salonId: salon.id })}
          tooltip
        >
          <View style={styles.calloutContainer}>
            <Text style={styles.calloutTitle} numberOfLines={1}>
              {salon.businessName}
            </Text>
            <View style={styles.calloutTypeRow}>
              <Ionicons name="storefront-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.calloutType}>
                {salon.services?.[0]?.category || 'Salon'}
              </Text>
            </View>
            <View style={styles.calloutRatingRow}>
              <Ionicons name="star" size={14} color={COLORS.accentGold} />
              <Text style={styles.calloutRating}>{salon.rating.toFixed(1)}</Text>
              <Text style={styles.calloutReviews}>({salon.reviewCount} reviews)</Text>
            </View>
            <View style={styles.calloutStatusRow}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: isOpen ? COLORS.openGreen : COLORS.closedGray },
                ]}
              >
                <Text style={styles.statusText}>{isOpen ? 'Open' : 'Closed'}</Text>
              </View>
            </View>
            <Button
              mode="contained"
              compact
              style={styles.viewDetailsButton}
              labelStyle={styles.viewDetailsButtonLabel}
              onPress={() => navigation.navigate('SalonDetail', { salonId: salon.id })}
            >
              View Details
            </Button>
          </View>
        </Callout>
      </Marker>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholderTextColor={COLORS.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips - Salon Types */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          {SALON_TYPES.map((type) => (
            <Chip
              key={type.value || 'all'}
              selected={selectedType === type.value}
              onPress={() => setSelectedType(selectedType === type.value ? '' : type.value)}
              style={[
                styles.filterChip,
                selectedType === type.value && styles.filterChipSelected,
              ]}
              textStyle={
                selectedType === type.value
                  ? styles.filterChipTextSelected
                  : styles.filterChipText
              }
            >
              {type.label}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* Service Category Chips */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          {SERVICE_CATEGORIES.map((cat) => (
            <Chip
              key={cat.value || 'all-svc'}
              selected={selectedCategory === cat.value}
              onPress={() => setSelectedCategory(selectedCategory === cat.value ? '' : cat.value)}
              style={[
                styles.filterChip,
                selectedCategory === cat.value && styles.filterChipSelected,
              ]}
              textStyle={
                selectedCategory === cat.value
                  ? styles.filterChipTextSelected
                  : styles.filterChipText
              }
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
          <Ionicons name="home-outline" size={16} color={homeServiceOnly ? '#fff' : '#4F46E5'} />
          <Text style={[styles.homeServiceText, homeServiceOnly && styles.homeServiceTextActive]}>Home Service</Text>
        </TouchableOpacity>
      </View>

      {/* Map or Fallback */}
      {mapError ? (
        <View style={styles.mapContainer}>
          {/* Fallback Header */}
          <View style={styles.mapFallbackHeader}>
            <Ionicons name="map-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.mapFallbackTitle}>Map unavailable</Text>
            <Text style={styles.mapFallbackSubtext}>
              Unable to load the map. You can still browse salons below.
            </Text>
          </View>

          {/* Fallback Salon List */}
          {isLoading ? (
            <View style={styles.mapFallbackLoading}>
              <ActivityIndicator size="large" color={COLORS.primaryGreen} />
              <Text style={styles.mapFallbackLoadingText}>Loading salons...</Text>
            </View>
          ) : filteredSalons.length > 0 ? (
            <ScrollView
              style={styles.mapFallbackList}
              contentContainerStyle={styles.mapFallbackListContent}
            >
              {filteredSalons.map((salon: Salon) => (
                <View key={salon.id} style={styles.mapFallbackCard}>
                  <View style={styles.mapFallbackSalonInfo}>
                    <Text style={styles.mapFallbackSalonName} numberOfLines={1}>
                      {salon.businessName}
                    </Text>
                    <View style={styles.mapFallbackAddressRow}>
                      <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.mapFallbackSalonAddress} numberOfLines={2}>
                        {salon.address || 'Address not available'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.mapFallbackDirectionsBtn}
                    onPress={() => openDirections(salon)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="navigate-outline" size={16} color="#fff" />
                    <Text style={styles.mapFallbackDirectionsText}>
                      {salon.latitude && salon.longitude ? 'Directions' : 'Search'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.mapFallbackEmpty}>
              <Ionicons name="search-outline" size={40} color={COLORS.textSecondary} />
              <Text style={styles.mapFallbackEmptyText}>No salons found in this area.</Text>
            </View>
          )}
        </View>
      ) : (
        <MapErrorBoundary onMapError={handleMapError}>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={region}
              onRegionChangeComplete={setRegion}
              showsUserLocation={locationPermission}
              showsMyLocationButton={false}
              showsCompass
              showsScale
              mapType="standard"
              onMapReady={() => console.log('Map loaded successfully')}

              minZoomLevel={0}
              maxZoomLevel={20}
            >
              {filteredSalons.map(renderMarker)}
            </MapView>

            {/* Loading Indicator */}
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={COLORS.primaryGreen} />
              </View>
            )}

            {/* Error State */}
            {error && (
              <View style={styles.errorOverlay}>
                <Ionicons name="alert-circle-outline" size={48} color={COLORS.accentRed} />
                <Text style={styles.errorText}>Failed to load salons</Text>
                <TouchableOpacity onPress={() => refetch()}>
                  <Text style={styles.retryText}>Tap to retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* No Salons with Location Data */}
            {!isLoading && filteredSalons.length > 0 && filteredSalons.every((s: Salon) => !s.latitude || !s.longitude) && (
              <View style={styles.noSalonsOverlay}>
                <Ionicons name="map-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.noSalonsTitle}>No Salons with Map Data</Text>
                <Text style={styles.noSalonsText}>
                  Salons in this area don't have location coordinates yet.
                </Text>
                <Text style={styles.noSalonsHint}>
                  Please browse salons from the Home screen instead.
                </Text>
              </View>
            )}

            {/* No Salons Found */}
            {!isLoading && (!filteredSalons || filteredSalons.length === 0) && (
              <View style={styles.noSalonsOverlay}>
                <Ionicons name="search-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.noSalonsTitle}>No Salons in This Area</Text>
                <Text style={styles.noSalonsText}>
                  Try zooming out or moving the map to find nearby salons.
                </Text>
                <Button
                  mode="outlined"
                  onPress={centerOnUserLocation}
                  style={styles.retryButton}
                  textColor={COLORS.primaryGreen}
                >
                  <Ionicons name="locate" size={16} color={COLORS.primaryGreen} style={{ marginRight: 4 }} />
                  Go to My Location
                </Button>
              </View>
            )}

            {/* My Location FAB */}
            <TouchableOpacity
              style={styles.myLocationButton}
              onPress={centerOnUserLocation}
              activeOpacity={0.8}
            >
              <View style={styles.myLocationButtonInner}>
                <Ionicons name="locate" size={24} color={COLORS.primaryGreen} />
              </View>
            </TouchableOpacity>

            {/* Legend */}
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.openGreen }]} />
                <Text style={styles.legendText}>Open (4.0+)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.accentGold }]} />
                <Text style={styles.legendText}>Open (&lt;4.0)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.closedGray }]} />
                <Text style={styles.legendText}>Closed</Text>
              </View>
            </View>
          </View>
        </MapErrorBoundary>
      )}
    </SafeAreaView>
  );
}

const createStyles = (COLORS: ReturnType<typeof createColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    padding: 12,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    height: 44,
  },
  filterContainer: {
    backgroundColor: COLORS.cardBackground,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterChips: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterChip: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
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
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    opacity: 0.9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  retryText: {
    marginTop: 8,
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  noSalonsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noSalonsTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  noSalonsText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  noSalonsHint: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  retryButton: {
    marginTop: 16,
    borderColor: COLORS.primaryGreen,
    borderWidth: 1,
    borderRadius: 8,
  },
  myLocationButton: {
    position: 'absolute',
    right: 16,
    bottom: 100,
  },
  myLocationButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  legendContainer: {
    position: 'absolute',
    left: 16,
    bottom: 24,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  calloutContainer: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 12,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  calloutTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  calloutType: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  calloutRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  calloutRating: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: 4,
  },
  calloutReviews: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  calloutStatusRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  viewDetailsButton: {
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 8,
  },
  viewDetailsButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  // Map Fallback Styles
  mapFallbackHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mapFallbackTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  mapFallbackSubtext: {
    marginTop: 6,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  mapFallbackLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  mapFallbackLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  mapFallbackList: {
    flex: 1,
  },
  mapFallbackListContent: {
    padding: 12,
    gap: 8,
  },
  mapFallbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapFallbackSalonInfo: {
    flex: 1,
    marginRight: 8,
  },
  mapFallbackSalonName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  mapFallbackAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mapFallbackSalonAddress: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 4,
    flex: 1,
    lineHeight: 18,
  },
  mapFallbackDirectionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  mapFallbackDirectionsText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  mapFallbackEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  mapFallbackEmptyText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  homeServiceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    marginLeft: 12,
    marginBottom: 8,
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

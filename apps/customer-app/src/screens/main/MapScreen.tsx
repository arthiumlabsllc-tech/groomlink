import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Text, Button, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import MapView, { Marker, Callout, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { salonApi } from '../../api/salon';
import { Salon } from '../../types';

// Design System Colors
const COLORS = {
  primaryGreen: '#006B3F',
  accentGold: '#FCD116',
  accentRed: '#CE1126',
  dark: '#1a1a2e',
  background: '#F9FAFB',
  cardBackground: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  openGreen: '#22C55E',
  closedGray: '#9CA3AF',
};

const SALON_TYPES = [
  { label: 'All', value: '' },
  { label: 'Barbershop', value: 'BARBERSHOP' },
  { label: 'Hair Salon', value: 'HAIR_SALON' },
  { label: 'Beauty Salon', value: 'BEAUTY_SALON' },
  { label: 'Nail Salon', value: 'NAIL_SALON' },
  { label: 'Spa', value: 'SPA' },
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

export default function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedType, setSelectedType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [region, setRegion] = useState<Region>(DEFAULT_LOCATION);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);

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
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = location.coords;
        setUserLocation({ latitude, longitude });
        setRegion({
          latitude,
          longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });
      } else {
        Alert.alert(
          'Location Permission Required',
          'Please enable location services to find nearby salons.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error getting location:', error);
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
    queryKey: ['salons-map', region.latitude, region.longitude],
    queryFn: () => salonApi.getSalonsForMap(region.latitude, region.longitude, 10),
    enabled: !!region,
  });

  // Filter salons based on selected type
  const filteredSalons = React.useMemo(() => {
    if (!salons) return [];
    if (!selectedType) return salons;
    return salons.filter((salon: Salon) => {
      // Check if salon has services that match the type
      const hasMatchingService = salon.services?.some((service) =>
        service.category?.toUpperCase().includes(selectedType)
      );
      return !!hasMatchingService;
    });
  }, [salons, selectedType]);

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

  // Handle search (simple text search - in real app would geocode)
  const handleSearch = useCallback(() => {
    // For now, just refresh the current region
    refetch();
  }, [refetch]);

  const renderMarker = (salon: Salon) => {
    if (!salon.latitude || !salon.longitude) return null;
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

      {/* Filter Chips */}
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
              onPress={() => setSelectedType(type.value)}
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

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass
          showsScale
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
});

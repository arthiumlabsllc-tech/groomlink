import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { salonApi } from '../../api/salon';
import { Salon } from '../../types';
import { useAppTheme } from '../../theme/ThemeContext';

/**
 * SafeMapScreen - Safe wrapper for the Map tab.
 * 
 * Attempts to load the real MapScreen (which uses react-native-maps).
 * If the native module fails to load or crashes, this component catches
 * the error and shows a browsable list of salons instead.
 */

// Lazy reference to MapScreen - only loaded when user taps Map tab
let MapScreenModule: any = null;
let mapModuleChecked = false;

function tryLoadMapModule(): boolean {
  if (mapModuleChecked) return !!MapScreenModule?.default;
  mapModuleChecked = true;
  try {
    MapScreenModule = require('../../screens/main/MapScreen');
    return !!MapScreenModule?.default;
  } catch (e) {
    console.warn('[SafeMapScreen] react-native-maps not available:', e);
    return false;
  }
}

// Design System Colors
const createColors = (theme: any) => ({
  primaryGreen: '#006B3F',
  accentGold: '#FCD116',
  background: theme.background,
  surface: theme.surface,
  text: theme.text,
  textSecondary: theme.textSecondary,
  border: theme.border,
});

function SalonListFallback() {
  const { theme } = useAppTheme();
  const COLORS = createColors(theme);
  const navigation = useNavigation<any>();
  const [selectedType, setSelectedType] = useState('');

  const SALON_TYPES = [
    { label: 'All', value: '' },
    { label: 'Barbershop', value: 'BARBERSHOP' },
    { label: 'Hair Salon', value: 'HAIR_SALON' },
    { label: 'Beauty Salon', value: 'BEAUTY_SALON' },
    { label: 'Nail Salon', value: 'NAIL_SALON' },
    { label: 'Spa', value: 'SPA' },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['salons-list-fallback', selectedType],
    queryFn: () => salonApi.searchSalons({ type: selectedType || undefined, limit: 50 }),
    staleTime: 1000 * 60 * 5,
  });

  const salons = data?.salons || [];

  const openDirections = (salon: Salon) => {
    if (salon.latitude && salon.longitude) {
      const { Linking } = require('react-native');
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${salon.latitude},${salon.longitude}`
      ).catch(() => Alert.alert('Error', 'Could not open Google Maps.'));
    } else {
      const query = encodeURIComponent(salon.address || salon.businessName);
      const { Linking } = require('react-native');
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${query}`
      ).catch(() => Alert.alert('Error', 'Could not open Google Maps.'));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="map-outline" size={36} color={COLORS.primaryGreen} />
        </View>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>Nearby Salons</Text>
        <Text style={[styles.headerSubtitle, { color: COLORS.textSecondary }]}>
          Map view unavailable — browse salons in list view
        </Text>
      </View>

      {/* Type Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={styles.chipContent}
      >
        {SALON_TYPES.map((type) => (
          <Chip
            key={type.value}
            selected={selectedType === type.value}
            onPress={() => setSelectedType(type.value)}
            style={[
              styles.chip,
              selectedType === type.value && { backgroundColor: COLORS.primaryGreen },
            ]}
            textStyle={[
              styles.chipText,
              { color: selectedType === type.value ? '#fff' : COLORS.text },
            ]}
          >
            {type.label}
          </Chip>
        ))}
      </ScrollView>

      {/* Salon List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryGreen} />
          <Text style={[styles.loadingText, { color: COLORS.textSecondary }]}>Loading salons...</Text>
        </View>
      ) : salons.length > 0 ? (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {salons.map((salon: Salon) => (
            <TouchableOpacity
              key={salon.id}
              style={[styles.salonCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}
              onPress={() => navigation.navigate('SalonDetail', { salonId: salon.id })}
              activeOpacity={0.7}
            >
              <View style={styles.salonInfo}>
                <Text style={[styles.salonName, { color: COLORS.text }]} numberOfLines={1}>
                  {salon.businessName}
                </Text>
                <View style={styles.salonAddressRow}>
                  <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={[styles.salonAddress, { color: COLORS.textSecondary }]} numberOfLines={1}>
                    {salon.address || 'Address not available'}
                  </Text>
                </View>
                {salon.rating ? (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color={COLORS.accentGold} />
                    <Text style={[styles.ratingText, { color: COLORS.text }]}>
                      {salon.rating.toFixed(1)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.directionsBtn}
                onPress={() => openDirections(salon)}
              >
                <Ionicons name="navigate-outline" size={16} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={48} color={COLORS.textSecondary} />
          <Text style={[styles.emptyText, { color: COLORS.textSecondary }]}>
            No salons found in this area.
          </Text>
        </View>
      )}
    </View>
  );
}

// Error boundary class to catch native module crashes during render
class MapErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.warn('[SafeMapScreen] MapScreen crashed:', error.message);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export default function SafeMapScreen() {
  const [mapFailed, setMapFailed] = useState(false);
  const [mapAvailable, setMapAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    // Try to load the map module when component mounts (Map tab tapped)
    const available = tryLoadMapModule();
    setMapAvailable(available);
    if (!available) {
      setMapFailed(true);
    }
  }, []);

  // Show loading while checking
  if (mapAvailable === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006B3F" />
      </View>
    );
  }

  // If we know the module isn't available, show fallback immediately
  if (mapFailed) {
    return <SalonListFallback />;
  }

  // Try to render the real MapScreen with error boundary protection
  if (mapAvailable && MapScreenModule?.default) {
    const RealMapScreen = MapScreenModule.default;
    return (
      <MapErrorBoundary fallback={<SalonListFallback />}>
        <RealMapScreen />
      </MapErrorBoundary>
    );
  }

  // Default: show fallback
  return <SalonListFallback />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  chipRow: {
    maxHeight: 50,
  },
  chipContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  salonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  salonInfo: {
    flex: 1,
  },
  salonName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  salonAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  salonAddress: {
    fontSize: 12,
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  directionsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#006B3F',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

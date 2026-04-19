import React, { useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { Text, Card, Button, Searchbar, ActivityIndicator, Avatar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Salon } from '../../types';
import { salonApi } from '../../api/salon';
import { useAuthStore } from '../../store/authStore';

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
};

type NavigationProp = any;

interface LocationState {
  lat: number | null;
  lng: number | null;
  permissionDenied: boolean;
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<LocationState>({
    lat: null,
    lng: null,
    permissionDenied: false,
  });

  // Request location permission on mount
  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocation(prev => ({ ...prev, permissionDenied: true }));
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        permissionDenied: false,
      });
    } catch (error) {
      console.log('Location permission error:', error);
      setLocation(prev => ({ ...prev, permissionDenied: true }));
    }
  };

  const { data: featuredSalons, isLoading: featuredLoading, error: featuredError, refetch: refetchFeatured } = useQuery({
    queryKey: ['featured-salons'],
    queryFn: () => salonApi.searchSalons({ limit: 10 }),
  });

  // Extract salons array from the response
  const featuredSalonsList = featuredSalons?.salons || [];

  const { data: nearbySalons, isLoading: nearbyLoading, error: nearbyError, refetch: refetchNearby } = useQuery({
    queryKey: ['nearby-salons', location.lat, location.lng],
    queryFn: async (): Promise<Salon[]> => {
      if (location.lat && location.lng) {
        return salonApi.getNearbySalons(location.lat, location.lng);
      }
      // Fallback: fetch all approved salons if no location
      const result = await salonApi.searchSalons({ limit: 10 });
      return result.salons;
    },
    enabled: !location.permissionDenied || location.lat !== null,
  });

  const isLoading = featuredLoading || nearbyLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
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
          <Text style={styles.ratingBadgeText}>{salon.rating.toFixed(1)}</Text>
        </View>
      </View>
      <Card.Content style={styles.cardContent}>
        <Text variant="titleSmall" numberOfLines={1} style={styles.salonName}>
          {salon.businessName}
        </Text>
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
        {/* Header with greeting */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Image
                source={require('../../assets/logo-black.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
              <View>
                <Text variant="bodyMedium" style={styles.greetingLabel}>
                  {getGreeting()},
                </Text>
                <Text variant="headlineSmall" style={styles.greetingName}>
                  {getUserName()}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.avatarButton}>
              <Avatar.Text
                size={44}
                label={`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`}
                style={styles.userAvatar}
                labelStyle={styles.userAvatarLabel}
              />
            </TouchableOpacity>
          </View>
          
          <Searchbar
            placeholder="Search salons, services..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            iconColor={COLORS.textSecondary}
            onSubmitEditing={() => navigation.getParent()?.navigate('Search', { query: searchQuery })}
          />
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
          ) : nearbySalons && nearbySalons.length > 0 ? (
            <View style={styles.nearbyList}>
              {nearbySalons.map((salon) => renderSalonCard(salon, false))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={48} color={COLORS.border} />
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
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 16,
    backgroundColor: COLORS.cardBackground,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 36,
    height: 36,
  },
  greetingLabel: {
    color: COLORS.textSecondary,
  },
  greetingName: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  avatarButton: {
    borderRadius: 22,
  },
  userAvatar: {
    backgroundColor: COLORS.primaryGreen,
  },
  userAvatarLabel: {
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
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
  emptyText: {
    marginTop: 8,
    color: COLORS.textSecondary,
  },
});

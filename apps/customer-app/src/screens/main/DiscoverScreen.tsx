import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Salon } from '../../types';
import { discoveryApi } from '../../api/discovery';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

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

export default function DiscoverScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [refreshing, setRefreshing] = React.useState(false);

  // Get location for nearby salons
  const [location, setLocation] = React.useState<{ lat: number; lng: number } | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      } catch {
        // Silent fail
      }
    })();
  }, []);

  const { data: nearbySalons, isLoading: nearbyLoading, error: nearbyError, refetch: refetchNearby } = useQuery({
    queryKey: ['discover-nearby', location?.lat, location?.lng],
    queryFn: () => discoveryApi.getNearbySalons(location!.lat, location!.lng),
    enabled: !!location,
  });

  const { data: topRatedSalons, isLoading: topRatedLoading, error: topRatedError, refetch: refetchTopRated } = useQuery({
    queryKey: ['discover-top-rated'],
    queryFn: () => discoveryApi.getTopRatedSalons(),
  });

  const { data: trendingSalons, isLoading: trendingLoading, error: trendingError, refetch: refetchTrending } = useQuery({
    queryKey: ['discover-trending'],
    queryFn: () => discoveryApi.getTrendingSalons(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchNearby(), refetchTopRated(), refetchTrending()]);
    setRefreshing(false);
  }, [refetchNearby, refetchTopRated, refetchTrending]);

  const renderSalonCard = useCallback((salon: Salon, index: number) => (
    <Card
      key={salon.id || index}
      style={styles.salonCard}
      onPress={() => navigation.navigate('SalonDetail', { salonId: salon.id })}
    >
      <View style={styles.cardImageContainer}>
        {salon.images?.[0] ? (
          <Image source={{ uri: salon.images[0] }} style={styles.cardImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="storefront" size={36} color={COLORS.textSecondary} />
          </View>
        )}
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color={COLORS.accentGold} />
          <Text style={styles.ratingBadgeText}>{(salon.rating ?? 0).toFixed(1)}</Text>
        </View>
      </View>
      <Card.Content style={styles.cardContent}>
        <Text variant="titleSmall" numberOfLines={1} style={styles.salonName}>
          {salon.businessName}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
          <Text variant="bodySmall" numberOfLines={1} style={styles.address}>
            {salon.address}
          </Text>
        </View>
        {salon.distance && (
          <Text variant="bodySmall" style={styles.distance}>
            {salon.distance.toFixed(1)} km
          </Text>
        )}
      </Card.Content>
    </Card>
  ), [COLORS, styles, navigation]);

  const renderSection = (
    title: string,
    icon: string,
    salons: Salon[] | undefined,
    loading: boolean,
    error: any,
    emptyText: string,
  ) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name={icon as any} size={18} color={COLORS.primaryGreen} />
          <Text variant="titleMedium" style={styles.sectionTitle}>{title}</Text>
        </View>
      </View>
      {loading ? (
        <View style={styles.sectionLoading}>
          <ActivityIndicator size="small" color={COLORS.primaryGreen} />
        </View>
      ) : error ? (
        <View style={styles.sectionError}>
          <Text variant="bodyMedium" style={styles.errorText}>Could not load {title.toLowerCase()}</Text>
        </View>
      ) : !salons || salons.length === 0 ? (
        <View style={styles.sectionEmpty}>
          <Text variant="bodyMedium" style={styles.emptyText}>{emptyText}</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {salons.map((salon, index) => renderSalonCard(salon, index))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryGreen]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.headerTitle}>Discover</Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            Find the best salons near you
          </Text>
        </View>

        {/* Trending Section */}
        {renderSection(
          'Trending Now',
          'flame',
          trendingSalons,
          trendingLoading,
          trendingError,
          'No trending salons right now',
        )}

        {/* Top Rated Section */}
        {renderSection(
          'Top Rated',
          'star',
          topRatedSalons,
          topRatedLoading,
          topRatedError,
          'No top rated salons yet',
        )}

        {/* Nearby Section */}
        {location && renderSection(
          'Nearby',
          'navigate',
          nearbySalons,
          nearbyLoading,
          nearbyError,
          'No salons nearby',
        )}

        {!location && (
          <View style={styles.noLocation}>
            <Ionicons name="location-outline" size={48} color={COLORS.textSecondary} />
            <Text variant="bodyMedium" style={styles.emptyText}>
              Enable location to see nearby salons
            </Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  horizontalScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  salonCard: {
    width: 220,
    marginRight: 14,
    borderRadius: 14,
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
    height: 120,
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
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardContent: {
    padding: 10,
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
    fontSize: 12,
  },
  sectionLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  sectionError: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  sectionEmpty: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.accentRed,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  noLocation: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
});

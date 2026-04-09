import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Divider,
  ActivityIndicator,
  Avatar,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { salonApi } from '../../api/salon';
import { reviewApi } from '../../api/review';
import { Salon, Review, Service } from '../../types';
import { MainStackParamList } from '../../types/navigation';

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

type SalonDetailRouteProp = RouteProp<MainStackParamList, 'SalonDetail'>;

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function SalonDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<SalonDetailRouteProp>();
  const { salonId } = route.params;
  const [refreshing, setRefreshing] = useState(false);

  const { data: salon, isLoading: salonLoading, error: salonError, refetch: refetchSalon } = useQuery({
    queryKey: ['salon', salonId],
    queryFn: () => salonApi.getSalonById(salonId),
  });

  const { data: reviews, refetch: refetchReviews } = useQuery({
    queryKey: ['salon-reviews', salonId],
    queryFn: () => reviewApi.getSalonReviews(salonId),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchSalon(), refetchReviews()]);
    setRefreshing(false);
  }, [refetchSalon, refetchReviews]);

  const handleBookNow = () => {
    navigation.navigate('Booking', { salonId });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const getDayName = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  const renderServiceItem = useCallback((item: Service) => (
    <View key={item.id} style={styles.serviceItem}>
      <View style={styles.serviceInfo}>
        <Text variant="titleSmall" style={styles.serviceName}>{item.name}</Text>
        {item.description && (
          <Text variant="bodySmall" style={styles.serviceDescription}>{item.description}</Text>
        )}
        <View style={styles.serviceDuration}>
          <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
          <Text variant="bodySmall" style={styles.serviceDurationText}>
            {formatDuration(item.duration)}
          </Text>
        </View>
      </View>
      <Text variant="titleMedium" style={styles.servicePrice}>
        GH₵ {item.price.toFixed(2)}
      </Text>
    </View>
  ), []);

  const renderReviewItem = useCallback((item: Review) => (
    <Card key={item.id} style={styles.reviewCard}>
      <Card.Content style={styles.reviewContent}>
        <View style={styles.reviewHeader}>
          <Avatar.Text
            size={44}
            label={`${item.user.firstName?.[0] || ''}${item.user.lastName?.[0] || ''}`}
            style={styles.reviewAvatar}
            labelStyle={styles.reviewAvatarLabel}
          />
          <View style={styles.reviewUserInfo}>
            <Text variant="titleSmall" style={styles.reviewUserName}>
              {item.user.firstName} {item.user.lastName}
            </Text>
            <View style={styles.reviewRating}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= item.rating ? 'star' : 'star-outline'}
                  size={14}
                  color={COLORS.accentGold}
                />
              ))}
            </View>
          </View>
        </View>
        {item.comment && (
          <Text variant="bodyMedium" style={styles.reviewComment}>{item.comment}</Text>
        )}
      </Card.Content>
    </Card>
  ), []);

  const renderOpeningHours = (salonData: Salon) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    return (
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Opening Hours</Text>
        <View style={styles.hoursContainer}>
          {DAYS.map((day) => {
            const hours = salonData.openingHours?.[day as keyof typeof salonData.openingHours];
            const isToday = day === today;
            return (
              <View 
                key={day} 
                style={[
                  styles.hoursRow,
                  isToday && styles.hoursRowToday
                ]}
              >
                <Text 
                  variant="bodyMedium" 
                  style={[
                    styles.dayName,
                    isToday && styles.dayNameToday
                  ]}
                >
                  {getDayName(day)}
                </Text>
                <Text 
                  variant="bodyMedium" 
                  style={[
                    styles.dayHours,
                    isToday && styles.dayHoursToday
                  ]}
                >
                  {hours?.isOpen
                    ? `${formatTime(hours.open)} - ${formatTime(hours.close)}`
                    : 'Closed'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (salonLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryGreen} />
        </View>
      </SafeAreaView>
    );
  }

  if (salonError || !salon) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.accentRed} />
          <Text variant="titleMedium" style={styles.errorTitle}>Failed to load salon</Text>
          <Button mode="contained" onPress={() => refetchSalon()} style={styles.retryButton}>
            Retry
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryGreen]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image Section */}
        <View style={styles.heroSection}>
          {salon.images?.[0] ? (
            <Image source={{ uri: salon.images[0] }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="storefront" size={64} color={COLORS.textSecondary} />
            </View>
          )}
          <View style={styles.heroOverlay}>
            <Text variant="headlineMedium" style={styles.heroTitle}>{salon.businessName}</Text>
          </View>
        </View>

        {/* Salon Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.ratingContainer}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={18} color={COLORS.accentGold} />
              <Text variant="titleMedium" style={styles.ratingText}>
                {salon.rating.toFixed(1)}
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.reviewCount}>
              ({salon.reviewCount} reviews)
            </Text>
          </View>
          
          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={20} color={COLORS.primaryGreen} />
            <Text variant="bodyMedium" style={styles.address}>
              {salon.address}, {salon.city}
            </Text>
          </View>
          
          {salon.phone && (
            <View style={styles.phoneContainer}>
              <Ionicons name="call-outline" size={20} color={COLORS.primaryGreen} />
              <Text variant="bodyMedium" style={styles.phone}>{salon.phone}</Text>
            </View>
          )}
          
          {salon.description && (
            <Text variant="bodyMedium" style={styles.description}>{salon.description}</Text>
          )}
        </View>

        {/* Services Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Services</Text>
          <View style={styles.servicesCard}>
            {salon.services?.length > 0 ? (
              salon.services.map((service) => renderServiceItem(service))
            ) : (
              <Text variant="bodyMedium" style={styles.emptyText}>No services available</Text>
            )}
          </View>
        </View>

        {/* Opening Hours Section */}
        {salon.openingHours && renderOpeningHours(salon)}

        {/* Reviews Section */}
        <View style={styles.section}>
          <View style={styles.reviewsHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Reviews</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.reviewsContainer}>
            {reviews && reviews.length > 0 ? (
              reviews.slice(0, 3).map((review) => renderReviewItem(review))
            ) : (
              <Text variant="bodyMedium" style={styles.emptyText}>No reviews yet</Text>
            )}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Book Now Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.bookButton} onPress={handleBookNow}>
          <Ionicons name="calendar" size={20} color="#fff" />
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    padding: 32,
  },
  errorTitle: {
    marginTop: 16,
    color: COLORS.accentRed,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
  },
  // Hero Section
  heroSection: {
    height: 240,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 60,
    backgroundColor: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
  },
  heroTitle: {
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // Info Card
  infoCard: {
    margin: 16,
    marginTop: -30,
    padding: 20,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.accentGold}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  reviewCount: {
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  address: {
    color: COLORS.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  phone: {
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  description: {
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  // Sections
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
    color: COLORS.textPrimary,
  },
  // Services
  servicesCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  serviceDescription: {
    color: COLORS.textSecondary,
    marginTop: 2,
    fontSize: 13,
  },
  serviceDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  serviceDurationText: {
    color: COLORS.textSecondary,
  },
  servicePrice: {
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },
  // Hours
  hoursContainer: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  hoursRowToday: {
    backgroundColor: `${COLORS.primaryGreen}10`,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  dayName: {
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  dayNameToday: {
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  dayHours: {
    color: COLORS.textSecondary,
  },
  dayHoursToday: {
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  // Reviews
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  reviewsContainer: {
    gap: 12,
  },
  reviewCard: {
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  reviewContent: {
    padding: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewAvatar: {
    backgroundColor: COLORS.primaryGreen,
  },
  reviewAvatarLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  reviewUserInfo: {
    marginLeft: 12,
  },
  reviewUserName: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  reviewRating: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 2,
  },
  reviewComment: {
    marginTop: 12,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 32,
  },
  bottomPadding: {
    height: 100,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.cardBackground,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: COLORS.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

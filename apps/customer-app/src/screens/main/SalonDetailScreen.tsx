import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  FAB,
  Divider,
  ActivityIndicator,
  Avatar,
  Chip,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { salonApi } from '../../api/salon';
import { reviewApi } from '../../api/review';
import { Salon, Review, Service } from '../../types';
import { MainStackParamList } from '../../types/navigation';

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

  const renderServiceItem = useCallback(({ item }: { item: Service }) => (
    <View style={styles.serviceItem}>
      <View style={styles.serviceInfo}>
        <Text variant="titleSmall" style={styles.serviceName}>{item.name}</Text>
        {item.description && (
          <Text variant="bodySmall" style={styles.serviceDescription}>{item.description}</Text>
        )}
        <Text variant="bodySmall" style={styles.serviceDuration}>
          <Ionicons name="time-outline" size={14} /> {formatDuration(item.duration)}
        </Text>
      </View>
      <Text variant="titleMedium" style={styles.servicePrice}>
        GH₵ {item.price.toFixed(2)}
      </Text>
    </View>
  ), []);

  const renderReviewItem = useCallback(({ item }: { item: Review }) => (
    <Card style={styles.reviewCard}>
      <Card.Content style={styles.reviewContent}>
        <View style={styles.reviewHeader}>
          <Avatar.Text
            size={40}
            label={`${item.user.firstName?.[0] || ''}${item.user.lastName?.[0] || ''}`}
            style={styles.reviewAvatar}
          />
          <View style={styles.reviewUserInfo}>
            <Text variant="titleSmall">{item.user.firstName} {item.user.lastName}</Text>
            <View style={styles.reviewRating}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= item.rating ? 'star' : 'star-outline'}
                  size={14}
                  color="#FCD116"
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
    return (
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Opening Hours</Text>
        <View style={styles.hoursContainer}>
          {DAYS.map((day) => {
            const hours = salonData.openingHours?.[day as keyof typeof salonData.openingHours];
            return (
              <View key={day} style={styles.hoursRow}>
                <Text variant="bodyMedium" style={styles.dayName}>{getDayName(day)}</Text>
                <Text variant="bodyMedium" style={styles.dayHours}>
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
          <ActivityIndicator size="large" color="#006B3F" />
        </View>
      </SafeAreaView>
    );
  }

  if (salonError || !salon) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#CE1126" />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#006B3F']} />
        }
      >
        {/* Header Image */}
        <View style={styles.headerImage}>
          {salon.images?.[0] ? (
            <Card.Cover
              source={{ uri: salon.images[0] }}
              style={styles.coverImage}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="storefront" size={64} color="#ccc" />
            </View>
          )}
        </View>

        {/* Salon Info */}
        <View style={styles.salonInfo}>
          <Text variant="headlineSmall" style={styles.salonName}>{salon.businessName}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={20} color="#FCD116" />
            <Text variant="titleMedium" style={styles.ratingText}>
              {salon.rating.toFixed(1)}
            </Text>
            <Text variant="bodyMedium" style={styles.reviewCount}>
              ({salon.reviewCount} reviews)
            </Text>
          </View>
          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={18} color="#666" />
            <Text variant="bodyMedium" style={styles.address}>
              {salon.address}, {salon.city}
            </Text>
          </View>
          {salon.phone && (
            <View style={styles.phoneContainer}>
              <Ionicons name="call-outline" size={18} color="#666" />
              <Text variant="bodyMedium" style={styles.phone}>{salon.phone}</Text>
            </View>
          )}
          {salon.description && (
            <Text variant="bodyMedium" style={styles.description}>{salon.description}</Text>
          )}
        </View>

        <Divider />

        {/* Services */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Services</Text>
          {salon.services?.length > 0 ? (
            salon.services.map((service) => (
              <View key={service.id}>{renderServiceItem({ item: service })}</View>
            ))
          ) : (
            <Text variant="bodyMedium" style={styles.emptyText}>No services available</Text>
          )}
        </View>

        <Divider />

        {/* Opening Hours */}
        {salon.openingHours && renderOpeningHours(salon)}

        <Divider />

        {/* Reviews */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Reviews</Text>
          {reviews && reviews.length > 0 ? (
            reviews.map((review) => (
              <View key={review.id}>{renderReviewItem({ item: review })}</View>
            ))
          ) : (
            <Text variant="bodyMedium" style={styles.emptyText}>No reviews yet</Text>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="calendar-plus"
        style={styles.fab}
        onPress={handleBookNow}
        label="Book Now"
        color="#fff"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    color: '#CE1126',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#006B3F',
  },
  headerImage: {
    height: 200,
  },
  coverImage: {
    height: 200,
    borderRadius: 0,
  },
  placeholderImage: {
    height: 200,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  salonInfo: {
    padding: 16,
  },
  salonName: {
    fontWeight: 'bold',
    color: '#006B3F',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingText: {
    marginLeft: 4,
    fontWeight: '600',
  },
  reviewCount: {
    color: '#666',
    marginLeft: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  address: {
    color: '#666',
    marginLeft: 4,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  phone: {
    color: '#666',
    marginLeft: 4,
  },
  description: {
    marginTop: 12,
    color: '#444',
    lineHeight: 22,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
    color: '#006B3F',
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontWeight: '500',
  },
  serviceDescription: {
    color: '#666',
    marginTop: 2,
  },
  serviceDuration: {
    color: '#888',
    marginTop: 4,
  },
  servicePrice: {
    fontWeight: '600',
    color: '#006B3F',
  },
  hoursContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  dayName: {
    fontWeight: '500',
  },
  dayHours: {
    color: '#666',
  },
  reviewCard: {
    marginBottom: 12,
    borderRadius: 8,
  },
  reviewContent: {
    padding: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewAvatar: {
    backgroundColor: '#006B3F',
  },
  reviewUserInfo: {
    marginLeft: 12,
  },
  reviewRating: {
    flexDirection: 'row',
    marginTop: 2,
  },
  reviewComment: {
    marginTop: 12,
    color: '#444',
    lineHeight: 20,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    paddingVertical: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 16,
    backgroundColor: '#006B3F',
    borderRadius: 30,
  },
});

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
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
import { queueApi, QueueStatus, MyQueuePosition } from '../../api/queue';
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

// Default GroomLink assets
const DEFAULT_LOGO_ICON = 'https://groomlinkgh.com/api/uploads/assets/logo-icon.png';
const DEFAULT_LOGO_WHITE = 'https://groomlinkgh.com/api/uploads/assets/email-logo.png';

type SalonDetailRouteProp = RouteProp<MainStackParamList, 'SalonDetail'>;

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function SalonDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<SalonDetailRouteProp>();
  const { salonId } = route.params;
  const [refreshing, setRefreshing] = useState(false);

  // Queue state
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [myPosition, setMyPosition] = useState<MyQueuePosition | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [queueNotes, setQueueNotes] = useState('');
  const [joiningQueue, setJoiningQueue] = useState(false);
  const [leavingQueue, setLeavingQueue] = useState(false);

  const { data: salon, isLoading: salonLoading, error: salonError, refetch: refetchSalon } = useQuery({
    queryKey: ['salon', salonId],
    queryFn: () => salonApi.getSalonById(salonId),
  });

  const { data: reviews, refetch: refetchReviews } = useQuery({
    queryKey: ['salon-reviews', salonId],
    queryFn: () => reviewApi.getSalonReviews(salonId),
  });

  // Fetch queue data
  const fetchQueueData = useCallback(async () => {
    setQueueLoading(true);
    try {
      const [status, position] = await Promise.all([
        queueApi.getSalonQueue(salonId),
        queueApi.getMyPosition(salonId)
      ]);
      setQueueStatus(status);
      setMyPosition(position);
    } catch (err) {
      console.error('Failed to fetch queue data:', err);
    } finally {
      setQueueLoading(false);
    }
  }, [salonId]);

  useEffect(() => {
    fetchQueueData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchQueueData, 30000);
    return () => clearInterval(interval);
  }, [fetchQueueData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchSalon(), refetchReviews(), fetchQueueData()]);
    setRefreshing(false);
  }, [refetchSalon, refetchReviews, fetchQueueData]);

  const handleJoinQueue = async () => {
    setJoiningQueue(true);
    try {
      await queueApi.joinQueue({
        salonId,
        serviceId: selectedServiceId || undefined,
        notes: queueNotes || undefined
      });
      await fetchQueueData();
      setShowJoinModal(false);
      setSelectedServiceId('');
      setQueueNotes('');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to join queue');
    } finally {
      setJoiningQueue(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!myPosition?.queueId) return;
    setLeavingQueue(true);
    try {
      await queueApi.leaveQueue(myPosition.queueId);
      setMyPosition(null);
      await fetchQueueData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to leave queue');
    } finally {
      setLeavingQueue(false);
    }
  };

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
          {salon.images?.[0] || salon.coverImage ? (
            <Image source={{ uri: salon.images?.[0] || salon.coverImage }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: COLORS.primaryGreen }]}>
              <Image source={{ uri: DEFAULT_LOGO_WHITE }} style={styles.heroLogo} resizeMode="contain" />
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

        {/* Queue Section */}
        {salon.acceptsWalkIns && (
          <View style={styles.queueSection}>
            <View style={styles.queueHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>Live Queue</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.pulseDot}>
                  <View style={styles.pulseRing} />
                  <View style={styles.pulseCore} />
                </View>
                <Text style={styles.liveText}>Live</Text>
              </View>
            </View>

            <Card style={styles.queueCard}>
              <Card.Content>
                {queueLoading && !queueStatus ? (
                  <ActivityIndicator color={COLORS.primaryGreen} />
                ) : (
                  <View>
                    {/* Queue Stats */}
                    <View style={styles.queueStats}>
                      <View style={styles.queueStat}>
                        <View style={[styles.queueIconContainer, { backgroundColor: `${COLORS.primaryGreen}15` }]}>
                          <Ionicons name="people" size={24} color={COLORS.primaryGreen} />
                        </View>
                        <View>
                          <Text variant="headlineSmall" style={styles.queueStatNumber}>
                            {queueStatus?.totalWaiting || 0}
                          </Text>
                          <Text variant="bodySmall" style={styles.queueStatLabel}>waiting</Text>
                        </View>
                      </View>
                      <View style={styles.queueStat}>
                        <View style={[styles.queueIconContainer, { backgroundColor: `${COLORS.accentGold}25` }]}>
                          <Ionicons name="time-outline" size={24} color={COLORS.primaryGreen} />
                        </View>
                        <View>
                          <Text variant="headlineSmall" style={styles.queueStatNumber}>
                            ~{queueStatus?.averageWait || 0}
                          </Text>
                          <Text variant="bodySmall" style={styles.queueStatLabel}>min wait</Text>
                        </View>
                      </View>
                    </View>

                    {/* My Position or Join Button */}
                    {myPosition ? (
                      <View style={styles.myPositionCard}>
                        <View>
                          <Text variant="bodySmall" style={styles.positionLabel}>Your Position</Text>
                          <Text variant="headlineMedium" style={styles.positionNumber}>
                            #{myPosition.position}
                          </Text>
                          <Text variant="bodySmall" style={styles.positionWait}>
                            Est. wait: ~{myPosition.estimatedWait} min
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.leaveQueueButton, leavingQueue && styles.buttonDisabled]}
                          onPress={handleLeaveQueue}
                          disabled={leavingQueue}
                        >
                          {leavingQueue ? (
                            <ActivityIndicator size="small" color={COLORS.accentRed} />
                          ) : (
                            <>
                              <Ionicons name="exit-outline" size={18} color={COLORS.accentRed} />
                              <Text style={styles.leaveQueueText}>Leave</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.joinQueueButton}
                        onPress={() => setShowJoinModal(true)}
                      >
                        <Ionicons name="add-circle-outline" size={20} color="#fff" />
                        <Text style={styles.joinQueueButtonText}>Join Walk-in Queue</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </Card.Content>
            </Card>
          </View>
        )}

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

        {/* Join Queue Modal */}
        <Modal
          visible={showJoinModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowJoinModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge" style={styles.modalTitle}>Join Walk-in Queue</Text>
                <TouchableOpacity
                  onPress={() => setShowJoinModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text variant="bodyMedium" style={styles.modalDescription}>
                Join the queue and we'll notify you when it's your turn. You can wait nearby!
              </Text>

              {/* Service Selection */}
              {salon.services && salon.services.length > 0 && (
                <View style={styles.serviceSelection}>
                  <Text variant="bodyMedium" style={styles.inputLabel}>Select Service (Optional)</Text>
                  <ScrollView style={styles.serviceList} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity
                      style={[
                        styles.serviceOption,
                        selectedServiceId === '' && styles.serviceOptionSelected
                      ]}
                      onPress={() => setSelectedServiceId('')}
                    >
                      <Text style={[
                        styles.serviceOptionText,
                        selectedServiceId === '' && styles.serviceOptionTextSelected
                      ]}>
                        Any service
                      </Text>
                      {selectedServiceId === '' && (
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.primaryGreen} />
                      )}
                    </TouchableOpacity>
                    {salon.services.map((service) => (
                      <TouchableOpacity
                        key={service.id}
                        style={[
                          styles.serviceOption,
                          selectedServiceId === service.id && styles.serviceOptionSelected
                        ]}
                        onPress={() => setSelectedServiceId(service.id)}
                      >
                        <View style={styles.serviceOptionContent}>
                          <Text style={[
                            styles.serviceOptionText,
                            selectedServiceId === service.id && styles.serviceOptionTextSelected
                          ]}>
                            {service.name}
                          </Text>
                          <Text style={styles.serviceOptionPrice}>
                            GH₵ {service.price.toFixed(2)}
                          </Text>
                        </View>
                        {selectedServiceId === service.id && (
                          <Ionicons name="checkmark-circle" size={20} color={COLORS.primaryGreen} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Notes Input */}
              <View style={styles.notesInput}>
                <Text variant="bodyMedium" style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  value={queueNotes}
                  onChangeText={setQueueNotes}
                  placeholder="Any special requests..."
                  multiline
                  numberOfLines={3}
                  style={styles.textInput}
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowJoinModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, joiningQueue && styles.buttonDisabled]}
                  onPress={handleJoinQueue}
                  disabled={joiningQueue}
                >
                  {joiningQueue ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Join Queue</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
  heroLogo: {
    width: 120,
    height: 120,
    opacity: 0.9,
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
  // Queue Section Styles
  queueSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primaryGreen,
    opacity: 0.4,
  },
  pulseCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryGreen,
  },
  liveText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  queueCard: {
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  queueStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  queueStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  queueIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueStatNumber: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  queueStatLabel: {
    color: COLORS.textSecondary,
  },
  myPositionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: `${COLORS.primaryGreen}10`,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: `${COLORS.primaryGreen}20`,
  },
  positionLabel: {
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  positionNumber: {
    fontWeight: '700',
    color: COLORS.primaryGreen,
  },
  positionWait: {
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  leaveQueueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${COLORS.accentRed}15`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  leaveQueueText: {
    color: COLORS.accentRed,
    fontWeight: '600',
    fontSize: 14,
  },
  joinQueueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 14,
    borderRadius: 12,
  },
  joinQueueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  modalDescription: {
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  serviceSelection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  serviceList: {
    maxHeight: 200,
  },
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  serviceOptionSelected: {
    backgroundColor: `${COLORS.primaryGreen}15`,
    borderWidth: 1,
    borderColor: `${COLORS.primaryGreen}30`,
  },
  serviceOptionContent: {
    flex: 1,
  },
  serviceOptionText: {
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  serviceOptionTextSelected: {
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  serviceOptionPrice: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  notesInput: {
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primaryGreen,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

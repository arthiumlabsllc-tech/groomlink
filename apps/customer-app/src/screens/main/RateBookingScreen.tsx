import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  TextInput,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { bookingApi } from '../../api/booking';
import { MainStackParamList } from '../../types/navigation';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

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

type RateBookingRouteProp = RouteProp<MainStackParamList, 'RateBooking'>;

const STAR_SIZE = 40;

export default function RateBookingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RateBookingRouteProp>();
  const { theme } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { bookingId } = route.params;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  // Fetch booking details
  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingApi.getBookingById(bookingId),
    enabled: !!bookingId,
  });

  // Submit rating mutation
  const submitRatingMutation = useMutation({
    mutationFn: () => bookingApi.rateBooking(bookingId, rating, comment.trim() || undefined),
    onSuccess: () => {
      Alert.alert(
        'Thank You!',
        'Your review has been submitted successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to submit review. Please try again.'
      );
    },
  });

  const handleSubmit = useCallback(() => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }

    submitRatingMutation.mutate();
  }, [rating, comment, submitRatingMutation]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const renderStar = useCallback((starNumber: number) => {
    const isFilled = starNumber <= rating;
    return (
      <TouchableOpacity
        key={starNumber}
        onPress={() => setRating(starNumber)}
        style={styles.starButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={isFilled ? 'star' : 'star-outline'}
          size={STAR_SIZE}
          color={isFilled ? COLORS.accentGold : COLORS.border}
        />
      </TouchableOpacity>
    );
  }, [rating]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryGreen} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.headerTitle}>
              Rate Your Experience
            </Text>
            <Text variant="bodyMedium" style={styles.headerSubtitle}>
              Help others by sharing your experience
            </Text>
          </View>

          {/* Booking Info Card */}
          <Card style={styles.bookingCard}>
            <Card.Content style={styles.bookingContent}>
              <View style={styles.salonRow}>
                <View style={styles.salonIconContainer}>
                  <Ionicons name="storefront" size={24} color={COLORS.primaryGreen} />
                </View>
                <View style={styles.salonInfo}>
                  <Text variant="titleMedium" style={styles.salonName}>
                    {booking?.salon?.businessName || 'Salon'}
                  </Text>
                  <Text variant="bodySmall" style={styles.serviceText}>
                    {booking?.services?.map(s => s.name).join(', ') || 'Service'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.dateTimeRow}>
                <View style={styles.dateTimeItem}>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
                  <Text variant="bodyMedium" style={styles.dateTimeText}>
                    {booking?.scheduledDate ? formatDate(booking.scheduledDate) : ''}
                  </Text>
                </View>
                <View style={styles.dateTimeItem}>
                  <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
                  <Text variant="bodyMedium" style={styles.dateTimeText}>
                    {booking?.scheduledTime ? formatTime(booking.scheduledTime) : ''}
                  </Text>
                </View>
              </View>

              {booking?.worker && (
                <View style={styles.workerRow}>
                  <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} />
                  <Text variant="bodyMedium" style={styles.workerText}>
                    Served by {booking.worker.fullName}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Rating Section */}
          <View style={styles.ratingSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              How was your experience?
            </Text>
            
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map(renderStar)}
            </View>
            
            <Text variant="bodyMedium" style={styles.ratingLabel}>
              {rating === 0 && 'Tap to rate'}
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </Text>
          </View>

          {/* Comment Section */}
          <View style={styles.commentSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Write a review (optional)
            </Text>
            <TextInput
              mode="outlined"
              placeholder="Share your experience with others..."
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              style={styles.commentInput}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primaryGreen}
              textColor={COLORS.textPrimary}
              placeholderTextColor={COLORS.textSecondary}
              maxLength={500}
            />
            <Text variant="bodySmall" style={styles.charCount}>
              {comment.length}/500
            </Text>
          </View>

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={submitRatingMutation.isPending}
            disabled={submitRatingMutation.isPending || rating === 0}
            style={styles.submitButton}
            buttonColor={COLORS.primaryGreen}
            contentStyle={styles.submitButtonContent}
          >
            Submit Review
          </Button>

          {/* Skip Button */}
          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            textColor={COLORS.textSecondary}
            style={styles.skipButton}
          >
            Skip for now
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (COLORS: ReturnType<typeof createColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
  },
  bookingCard: {
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  bookingContent: {
    padding: 16,
  },
  salonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  salonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${COLORS.primaryGreen}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  salonInfo: {
    flex: 1,
  },
  salonName: {
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  serviceText: {
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeText: {
    color: COLORS.textSecondary,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  workerText: {
    color: COLORS.textSecondary,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 20,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    color: COLORS.accentGold,
    fontWeight: '600',
  },
  commentSection: {
    marginBottom: 24,
  },
  commentInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  charCount: {
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    borderRadius: 12,
    marginBottom: 12,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  skipButton: {
    marginBottom: 16,
  },
});

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  primaryGreen: '#006B3F',
  accentGold: '#FCD116',
  background: '#F9FAFB',
  cardBackground: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};

const PLATFORM_FEEDBACK_KEY = '@groomlink_partners_platform_feedback';
const STAR_SIZE = 44;

export default function PlatformFeedbackScreen() {
  const navigation = useNavigation<any>();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (rating === 0) return;

    setSubmitting(true);
    try {
      const feedback = {
        rating,
        comment: comment.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      // Store in AsyncStorage since no backend endpoint exists yet
      const existingFeedback = await AsyncStorage.getItem(PLATFORM_FEEDBACK_KEY);
      const feedbackList = existingFeedback ? JSON.parse(existingFeedback) : [];
      feedbackList.push(feedback);
      await AsyncStorage.setItem(PLATFORM_FEEDBACK_KEY, JSON.stringify(feedbackList));

      setSubmitted(true);
    } catch (error) {
      console.error('Failed to save feedback:', error);
    } finally {
      setSubmitting(false);
    }
  }, [rating, comment]);

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

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.primaryGreen} />
          </View>
          <Text variant="headlineSmall" style={styles.successTitle}>
            Thank you for your feedback! 🙏
          </Text>
          <Text variant="bodyMedium" style={styles.successSubtitle}>
            Your input helps us improve GroomLink for everyone.
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.doneButton}
            buttonColor={COLORS.primaryGreen}
            contentStyle={styles.doneButtonContent}
          >
            Done
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
            <View style={styles.headerIconContainer}>
              <Ionicons name="heart" size={32} color={COLORS.primaryGreen} />
            </View>
            <Text variant="headlineSmall" style={styles.headerTitle}>
              How would you rate GroomLink?
            </Text>
            <Text variant="bodyMedium" style={styles.headerSubtitle}>
              Your feedback helps us build a better experience
            </Text>
          </View>

          {/* Stars */}
          <View style={styles.ratingSection}>
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

          {/* Comment */}
          <View style={styles.commentSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Tell us more (optional)
            </Text>
            <TextInput
              mode="outlined"
              placeholder="What do you love? What can we improve?"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              style={styles.commentInput}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primaryGreen}
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
            loading={submitting}
            disabled={submitting || rating === 0}
            style={styles.submitButton}
            buttonColor={COLORS.primaryGreen}
            contentStyle={styles.submitButtonContent}
          >
            Submit Feedback
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 16,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${COLORS.primaryGreen}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 32,
    padding: 24,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
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
  sectionTitle: {
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
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
  // Success state
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${COLORS.primaryGreen}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  doneButton: {
    borderRadius: 12,
    minWidth: 160,
  },
  doneButtonContent: {
    paddingVertical: 8,
  },
});

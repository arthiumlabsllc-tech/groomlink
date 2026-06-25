import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/ThemeContext';
import { AppTheme } from '../../theme/colors';
import { reviewsApi, Review } from '../../api/reviews';
import { salonApi } from '../../api/salon';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialCommunityIcons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={size}
          color={star <= rating ? '#FFB300' : '#9CA3AF'}
        />
      ))}
    </View>
  );
}

export default function ReviewsScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();

  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');

  // Fetch salon to get salonId
  const { data: salon } = useQuery({
    queryKey: ['mySalon'],
    queryFn: salonApi.getMySalon,
  });

  const salonId = salon?.id;

  const { data: reviewsData, isLoading, refetch } = useQuery({
    queryKey: ['salonReviews', salonId],
    queryFn: () => (salonId ? reviewsApi.getReviews(salonId) : null),
    enabled: !!salonId,
  });

  const replyMutation = useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) =>
      salonId ? reviewsApi.replyToReview(salonId, reviewId, reply) : Promise.reject(new Error('No salon')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salonReviews', salonId] });
      setReplyModalVisible(false);
      setReplyText('');
      setSelectedReview(null);
    },
  });

  const openReplyModal = useCallback((review: Review) => {
    setSelectedReview(review);
    setReplyText(review.reply?.text || '');
    setReplyModalVisible(true);
  }, []);

  const submitReply = useCallback(() => {
    if (!selectedReview || !replyText.trim()) return;
    replyMutation.mutate({ reviewId: selectedReview.id, reply: replyText.trim() });
  }, [selectedReview, replyText, replyMutation]);

  const reviews = reviewsData?.reviews || [];
  const summary = reviewsData?.summary;

  const renderReviewItem = ({ item }: { item: Review }) => {
    const customerName = `${item.customer.firstName} ${item.customer.lastName}`.trim();
    const serviceName = item.booking?.service?.name || 'Service';
    const bookingDate = item.booking?.date ? formatDate(item.booking.date) : '';

    return (
      <Surface style={[styles.reviewCard, { backgroundColor: theme.surface }]} elevation={0}>
        <View style={styles.reviewHeader}>
          <View style={styles.customerRow}>
            <View style={[styles.avatarCircle, { backgroundColor: theme.primaryLight + '30' }]}>
              <Text style={[styles.avatarText, { color: theme.primary }]}>
                {item.customer.firstName?.[0]}{item.customer.lastName?.[0]}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.customerName, { color: theme.text }]} numberOfLines={1}>
                {customerName}
              </Text>
              <Text style={[styles.serviceInfo, { color: theme.textTertiary }]} numberOfLines={1}>
                {serviceName} · {bookingDate}
              </Text>
            </View>
            <StarRating rating={item.rating} />
          </View>
        </View>

        {item.comment ? (
          <Text style={[styles.commentText, { color: theme.textSecondary }]}>
            {item.comment}
          </Text>
        ) : (
          <Text style={[styles.noCommentText, { color: theme.textTertiary }]}>
            No comment left
          </Text>
        )}

        {item.reply ? (
          <View style={[styles.replyContainer, { backgroundColor: theme.surfaceVariant, borderLeftColor: theme.primary }]}>
            <View style={styles.replyHeader}>
              <MaterialCommunityIcons name="reply" size={14} color={theme.primary} />
              <Text style={[styles.replyLabel, { color: theme.primary }]}>Your Reply</Text>
              <Text style={[styles.replyDate, { color: theme.textTertiary }]}>
                {formatDate(item.reply.createdAt)}
              </Text>
            </View>
            <Text style={[styles.replyText, { color: theme.textSecondary }]}>
              {item.reply.text}
            </Text>
            <TouchableOpacity onPress={() => openReplyModal(item)} style={styles.editReplyBtn}>
              <Text style={[styles.editReplyText, { color: theme.primary }]}>Edit Reply</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => openReplyModal(item)} style={styles.replyBtn}>
            <MaterialCommunityIcons name="reply-outline" size={16} color={theme.primary} />
            <Text style={[styles.replyBtnText, { color: theme.primary }]}>Reply</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.reviewDate, { color: theme.textTertiary }]}>
          {formatDate(item.createdAt)}
        </Text>
      </Surface>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.surfaceVariant }]}>
        <MaterialCommunityIcons name="star-outline" size={40} color={theme.textTertiary} />
      </View>
      <Text variant="titleMedium" style={[styles.emptyTitle, { color: theme.text }]}>
        No reviews yet
      </Text>
      <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Customer reviews will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={[styles.headerTitle, { color: theme.text }]}>
          Reviews
        </Text>
        {summary && (
          <View style={styles.summaryRow}>
            <StarRating rating={Math.round(summary.averageRating)} size={16} />
            <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
              {summary.averageRating.toFixed(1)} ({summary.totalReviews} review{summary.totalReviews !== 1 ? 's' : ''})
            </Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={renderReviewItem}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[styles.listContent, reviews.length === 0 && styles.emptyListContent]}
          refreshing={false}
          onRefresh={refetch}
        />
      )}

      {/* Reply Modal */}
      <Modal
        visible={replyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReplyModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setReplyModalVisible(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {selectedReview?.reply ? 'Edit Reply' : 'Reply to Review'}
            </Text>
            <TextInput
              style={[
                styles.replyInput,
                {
                  backgroundColor: theme.surfaceVariant,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Write your reply..."
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={4}
              value={replyText}
              onChangeText={setReplyText}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setReplyModalVisible(false)}
                style={[styles.modalBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.modalBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitReply}
                disabled={replyMutation.isPending || !replyText.trim()}
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  { backgroundColor: replyText.trim() ? theme.primary : theme.textTertiary },
                ]}
              >
                {replyMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Send Reply</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerTitle: { fontWeight: 'bold' },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 8,
    },
    summaryText: { fontSize: 13 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 24 },
    emptyListContent: { flexGrow: 1, justifyContent: 'center' },
    reviewCard: {
      marginBottom: 12,
      borderRadius: 14,
      padding: 14,
      overflow: 'hidden',
    },
    reviewHeader: { marginBottom: 8 },
    customerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    avatarCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontSize: 13, fontWeight: '700' },
    customerName: { fontSize: 14, fontWeight: '600' },
    serviceInfo: { fontSize: 12, marginTop: 1 },
    commentText: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
    noCommentText: { fontSize: 13, fontStyle: 'italic', marginBottom: 10 },
    replyContainer: {
      borderRadius: 10,
      padding: 10,
      borderLeftWidth: 3,
      marginBottom: 8,
    },
    replyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 4,
    },
    replyLabel: { fontSize: 12, fontWeight: '600', flex: 1 },
    replyDate: { fontSize: 11 },
    replyText: { fontSize: 13, lineHeight: 18 },
    editReplyBtn: { marginTop: 6, alignSelf: 'flex-end' },
    editReplyText: { fontSize: 12, fontWeight: '600' },
    replyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 8,
      alignSelf: 'flex-start',
    },
    replyBtnText: { fontSize: 13, fontWeight: '600' },
    reviewDate: { fontSize: 11, marginTop: 4 },
    emptyState: { padding: 40, alignItems: 'center' },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyTitle: { marginBottom: 8, fontWeight: '600' },
    emptySubtitle: { textAlign: 'center' },
    // Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    replyInput: {
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      fontSize: 14,
      minHeight: 100,
      marginBottom: 16,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
    },
    modalBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
    },
    modalBtnPrimary: { borderWidth: 0 },
    modalBtnText: { fontSize: 14, fontWeight: '600' },
  });

import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { favoritesApi } from '../../api/favorites';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';
import { Salon } from '../../types';
import { resolveImageUrl } from '../../utils/imageUrl';

const createColors = (t: AppTheme) => ({
  primaryGreen: '#006B3F',
  accentGold: '#FCD116',
  accentRed: '#CE1126',
  background: t.background,
  cardBackground: t.surface,
  textPrimary: t.text,
  textSecondary: t.textSecondary,
  border: t.border,
});

export default function FavoritesScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesApi.getFavorites(),
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: (salonId: string) => favoritesApi.removeFavorite(salonId),
    onMutate: async (salonId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      const previous = queryClient.getQueryData(['favorites']);
      queryClient.setQueryData(['favorites'], (old: any) => {
        if (!old) return old;
        return { ...old, salons: old.salons.filter((s: any) => (s.id ?? s.salonId) !== salonId) };
      });
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) queryClient.setQueryData(['favorites'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const handleRemove = useCallback((salonId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeFavoriteMutation.mutate(salonId);
  }, [removeFavoriteMutation]);

  const renderSalonCard = useCallback(({ item }: { item: Salon }) => {
    const salonId = item.id ?? (item as any).salonId;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('SalonDetail', { salonId })}
        activeOpacity={0.8}
      >
        <View style={styles.cardImageContainer}>
          {item.images?.[0] ? (
            <Image source={{ uri: item.images[0] }} style={styles.cardImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="storefront" size={36} color={COLORS.textSecondary} />
            </View>
          )}
          <TouchableOpacity
            style={styles.heartButton}
            onPress={() => handleRemove(salonId)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="heart" size={20} color={COLORS.accentRed} />
          </TouchableOpacity>
        </View>
        <View style={styles.cardContent}>
          <Text variant="titleSmall" numberOfLines={1} style={styles.salonName}>
            {item.businessName}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text variant="bodySmall" numberOfLines={1} style={styles.address}>
              {item.address}
            </Text>
          </View>
          {item.rating != null && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={COLORS.accentGold} />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [navigation, handleRemove, COLORS]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primaryGreen} />
        </View>
      </SafeAreaView>
    );
  }

  const salons = data?.salons ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={styles.headerTitle}>Saved Salons</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={salons}
        keyExtractor={(item) => item.id ?? (item as any).salonId}
        renderItem={renderSalonCard}
        contentContainerStyle={salons.length === 0 ? styles.centered : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[COLORS.primaryGreen]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color={COLORS.border} />
            <Text variant="titleMedium" style={styles.emptyTitle}>No saved salons yet</Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              Tap the heart icon on any salon to save it here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (COLORS: ReturnType<typeof createColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: { padding: 4 },
    headerTitle: { fontWeight: '600', color: COLORS.textPrimary },
    list: { padding: 16, gap: 16 },
    card: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    cardImageContainer: { position: 'relative', height: 160 },
    cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    placeholderImage: {
      width: '100%',
      height: '100%',
      backgroundColor: COLORS.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    heartButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardContent: { padding: 12 },
    salonName: { fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    address: { color: COLORS.textSecondary, flex: 1 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    ratingText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
    emptyState: { alignItems: 'center', padding: 32 },
    emptyTitle: { fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 },
    emptySubtitle: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
  });

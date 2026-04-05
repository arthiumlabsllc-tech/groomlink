import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, Favorite } from '../../types';
import { salonsApi } from '../../api/salons';

type Props = NativeStackScreenProps<MainTabParamList, 'Favorites'>;

export default function FavoritesScreen({ navigation }: Props) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = async () => {
    try {
      const data = await salonsApi.getFavorites();
      setFavorites(data);
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const renderFavoriteItem = ({ item }: { item: Favorite }) => (
    <TouchableOpacity
      style={styles.salonCard}
      onPress={() => (navigation as any).navigate('SalonDetails', { salonId: item.salon.id })}
    >
      <Text style={styles.salonName}>{item.salon.name}</Text>
      <Text style={styles.salonType}>{item.salon.type}</Text>
      <Text style={styles.salonAddress}>{item.salon.address}</Text>
      <View style={styles.ratingContainer}>
        <Text style={styles.rating}>★ {item.salon.rating.toFixed(1)}</Text>
        <Text style={styles.reviewCount}>({item.salon.reviewCount} reviews)</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Favorites</Text>
      <FlatList
        data={favorites}
        renderItem={renderFavoriteItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {loading ? 'Loading...' : 'No favorites yet'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  list: {
    padding: 16,
  },
  salonCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  salonName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  salonType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  salonAddress: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFB800',
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#888',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
});

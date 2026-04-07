import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Avatar, Button, Searchbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Salon } from '../../types';
import { MainStackParamList, TabParamList } from '../../types/navigation';
import apiClient from '../../api/client';

type NavigationProp = any;

const fetchFeaturedSalons = async (): Promise<Salon[]> => {
  const response = await apiClient.get('/salons/featured');
  return response.data.data;
};

const fetchNearbySalons = async (): Promise<Salon[]> => {
  const response = await apiClient.get('/salons/nearby');
  return response.data.data;
};

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: featuredSalons, refetch: refetchFeatured } = useQuery({
    queryKey: ['featured-salons'],
    queryFn: fetchFeaturedSalons,
  });

  const { data: nearbySalons, refetch: refetchNearby } = useQuery({
    queryKey: ['nearby-salons'],
    queryFn: fetchNearbySalons,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchFeatured(), refetchNearby()]);
    setRefreshing(false);
  };

  const renderSalonCard = (salon: Salon) => (
    <Card
      key={salon.id}
      style={styles.salonCard}
      onPress={() => navigation.navigate('SalonDetail', { salonId: salon.id })}
    >
      <Card.Cover source={{ uri: salon.images[0] || 'https://via.placeholder.com/300x150' }} />
      <Card.Content style={styles.cardContent}>
        <Text variant="titleMedium" numberOfLines={1}>{salon.businessName}</Text>
        <Text variant="bodySmall" numberOfLines={1} style={styles.address}>{salon.address}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text variant="bodySmall">{salon.rating.toFixed(1)} ({salon.reviewCount})</Text>
          {salon.distance && (
            <Text variant="bodySmall" style={styles.distance}>• {salon.distance.toFixed(1)} km</Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.greeting}>Find Your Style</Text>
          <Searchbar
            placeholder="Search salons, services..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            onSubmitEditing={() => navigation.navigate('Search', { query: searchQuery })}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Featured Salons</Text>
            <Button onPress={() => navigation.navigate('Search')}>See All</Button>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {featuredSalons?.map(renderSalonCard)}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Nearby Salons</Text>
            <Button onPress={() => navigation.navigate('Search')}>See All</Button>
          </View>
          {nearbySalons?.map(renderSalonCard)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
  },
  greeting: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#CE1126',
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  horizontalScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  salonCard: {
    width: 280,
    marginRight: 12,
    marginBottom: 12,
  },
  cardContent: {
    paddingTop: 12,
  },
  address: {
    color: '#666',
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  distance: {
    color: '#666',
  },
});

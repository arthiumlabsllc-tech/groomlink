import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Salon } from '../../types';
import { salonsApi } from '../../api/salons';

type Props = NativeStackScreenProps<RootStackParamList, 'SalonDetails'>;

export default function SalonDetailsScreen({ route, navigation }: Props) {
  const { salonId } = route.params;
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalonDetails();
  }, [salonId]);

  const fetchSalonDetails = async () => {
    try {
      const data = await salonsApi.getById(salonId);
      setSalon(data);
    } catch (error) {
      console.error('Failed to fetch salon:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!salon) {
    return (
      <View style={styles.centerContainer}>
        <Text>Salon not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{salon.name}</Text>
        <Text style={styles.type}>{salon.type}</Text>
        <View style={styles.ratingContainer}>
          <Text style={styles.rating}>★ {salon.rating.toFixed(1)}</Text>
          <Text style={styles.reviewCount}>({salon.reviewCount} reviews)</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>{salon.description || 'No description available'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <Text style={styles.address}>{salon.address}</Text>
        <Text style={styles.city}>{salon.city}, {salon.region}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Working Hours</Text>
        <Text style={styles.hours}>{salon.openingTime} - {salon.closingTime}</Text>
        <Text style={styles.workingDays}>{salon.workingDays.join(', ')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.phone}>{salon.phoneNumber}</Text>
        {salon.email && <Text style={styles.email}>{salon.email}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Amenities</Text>
        <View style={styles.amenities}>
          {salon.hasParking && <Text style={styles.amenity}>🅿️ Parking</Text>}
          {salon.hasWifi && <Text style={styles.amenity}>📶 WiFi</Text>}
          {salon.hasAC && <Text style={styles.amenity}>❄️ AC</Text>}
          {salon.acceptsWalkIns && <Text style={styles.amenity}>🚶 Walk-ins</Text>}
        </View>
      </View>

      {salon.services && salon.services.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          {salon.services.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={styles.serviceCard}
              onPress={() => navigation.navigate('Booking', { salonId, serviceId: service.id })}
            >
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDuration}>{service.duration} mins</Text>
              </View>
              <Text style={styles.servicePrice}>GH₵ {service.price.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.bookButton}
        onPress={() => navigation.navigate('Booking', { salonId })}
      >
        <Text style={styles.bookButtonText}>Book Appointment</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  type: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFB800',
    marginRight: 8,
  },
  reviewCount: {
    fontSize: 14,
    color: '#888',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  address: {
    fontSize: 14,
    color: '#333',
  },
  city: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  hours: {
    fontSize: 14,
    color: '#333',
  },
  workingDays: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  phone: {
    fontSize: 14,
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  amenity: {
    fontSize: 14,
    color: '#333',
  },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
  },
  serviceDuration: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  bookButton: {
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

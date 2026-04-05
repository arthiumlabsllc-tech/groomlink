import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Salon, Service, TimeSlot } from '../../types';
import { salonsApi } from '../../api/salons';
import { bookingsApi } from '../../api/bookings';

type Props = NativeStackScreenProps<RootStackParamList, 'Booking'>;

export default function BookingScreen({ route, navigation }: Props) {
  const { salonId, serviceId } = route.params;
  const [salon, setSalon] = useState<Salon | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSalonDetails();
  }, [salonId]);

  useEffect(() => {
    if (selectedDate) {
      fetchTimeSlots();
    }
  }, [selectedDate]);

  const fetchSalonDetails = async () => {
    try {
      const data = await salonsApi.getById(salonId);
      setSalon(data);
      if (serviceId) {
        const service = data.services?.find((s) => s.id === serviceId);
        if (service) setSelectedService(service);
      }
    } catch (error) {
      console.error('Failed to fetch salon:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const slots = await salonsApi.getTimeSlots(salonId, selectedDate);
      setTimeSlots(slots);
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
    }
  };

  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      Alert.alert('Error', 'Please select a service, date, and time');
      return;
    }

    setSubmitting(true);
    try {
      const booking = await bookingsApi.create({
        salonId,
        serviceId: selectedService.id,
        date: selectedDate,
        startTime: selectedTime,
      });
      
      navigation.navigate('Payment', { bookingId: booking.id, amount: booking.finalAmount });
    } catch (error) {
      Alert.alert('Error', 'Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Book Appointment</Text>
      
      {salon && (
        <View style={styles.salonInfo}>
          <Text style={styles.salonName}>{salon.name}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Service</Text>
        {salon?.services?.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[
              styles.serviceCard,
              selectedService?.id === service.id && styles.selectedCard,
            ]}
            onPress={() => setSelectedService(service)}
          >
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDuration}>{service.duration} mins</Text>
            </View>
            <Text style={styles.servicePrice}>GH₵ {service.price.toFixed(2)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {generateDates().map((date) => (
            <TouchableOpacity
              key={date}
              style={[
                styles.dateCard,
                selectedDate === date && styles.selectedCard,
              ]}
              onPress={() => setSelectedDate(date)}
            >
              <Text style={styles.dateText}>
                {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <Text style={styles.dateNumber}>
                {new Date(date).getDate()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {selectedDate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Time</Text>
          <View style={styles.timeGrid}>
            {timeSlots
              .filter((slot) => slot.available)
              .map((slot) => (
                <TouchableOpacity
                  key={slot.startTime}
                  style={[
                    styles.timeCard,
                    selectedTime === slot.startTime && styles.selectedCard,
                  ]}
                  onPress={() => setSelectedTime(slot.startTime)}
                >
                  <Text style={styles.timeText}>{slot.startTime}</Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.bookButton,
          (!selectedService || !selectedDate || !selectedTime) && styles.bookButtonDisabled,
        ]}
        onPress={handleBooking}
        disabled={!selectedService || !selectedDate || !selectedTime || submitting}
      >
        <Text style={styles.bookButtonText}>
          {submitting ? 'Booking...' : 'Confirm Booking'}
        </Text>
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
    fontSize: 24,
    fontWeight: 'bold',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  salonInfo: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  salonName: {
    fontSize: 18,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedCard: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
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
  dateCard: {
    width: 60,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginRight: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  dateNumber: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 4,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  timeText: {
    fontSize: 14,
  },
  bookButton: {
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: '#ccc',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

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
  Checkbox,
  Divider,
  ActivityIndicator,
  Surface,
  TextInput,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { salonApi } from '../../api/salon';
import { bookingApi, AvailableSlot } from '../../api/booking';
import { Service, Worker } from '../../types';
import { MainStackParamList } from '../../types/navigation';

type BookingRouteProp = RouteProp<MainStackParamList, 'Booking'>;

interface TimeSlot {
  time: string;
  available: boolean;
}

const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    slots.push({ time: `${hour.toString().padStart(2, '0')}:00`, available: true });
    if (hour < 20) {
      slots.push({ time: `${hour.toString().padStart(2, '0')}:30`, available: true });
    }
  }
  return slots;
};

export default function BookingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<BookingRouteProp>();
  const queryClient = useQueryClient();
  const { salonId, workerId, services: preselectedServices } = route.params;

  const [selectedServices, setSelectedServices] = useState<string[]>(preselectedServices || []);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(workerId || null);
  const [notes, setNotes] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  // Fetch salon data
  const { data: salon, isLoading: salonLoading } = useQuery({
    queryKey: ['salon', salonId],
    queryFn: () => salonApi.getSalonById(salonId),
  });

  // Fetch staff
  const { data: workers } = useQuery({
    queryKey: ['salon-staff', salonId],
    queryFn: () => salonApi.getSalonStaff(salonId),
  });

  // Fetch available slots
  const formattedDate = selectedDate.toISOString().split('T')[0];
  const { data: availableSlots, isLoading: slotsLoading } = useQuery({
    queryKey: ['available-slots', salonId, formattedDate, selectedWorker],
    queryFn: () => bookingApi.getAvailableSlots(salonId, formattedDate, selectedWorker || undefined),
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: (data: { serviceId: string; date: string; startTime: string; workerId?: string; notes?: string }) => 
      bookingApi.createBooking({
        salonId,
        serviceId: data.serviceId,
        date: data.date,
        startTime: data.startTime,
        workerId: data.workerId,
        customerNotes: data.notes,
      }),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      navigation.navigate('BookingConfirmation', { bookingId: booking.id });
    },
    onError: (error: any) => {
      Alert.alert('Booking Failed', error.response?.data?.message || 'Please try again');
    },
  });

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const totalPrice = useMemo(() => {
    if (!salon?.services) return 0;
    return salon.services
      .filter(s => selectedServices.includes(s.id))
      .reduce((sum, s) => sum + s.price, 0);
  }, [salon?.services, selectedServices]);

  const totalDuration = useMemo(() => {
    if (!salon?.services) return 0;
    return salon.services
      .filter(s => selectedServices.includes(s.id))
      .reduce((sum, s) => sum + s.duration, 0);
  }, [salon?.services, selectedServices]);

  const handleConfirmBooking = () => {
    if (selectedServices.length === 0) {
      Alert.alert('Select Services', 'Please select at least one service');
      return;
    }
    if (!selectedTime) {
      Alert.alert('Select Time', 'Please select a time slot');
      return;
    }

    // For simplicity, we'll book the first selected service
    // In a real app, you might want to handle multiple services
    const primaryService = selectedServices[0];
    
    createBookingMutation.mutate({
      serviceId: primaryService,
      date: selectedDate.toISOString(),
      startTime: selectedTime,
      workerId: selectedWorker || undefined,
      notes: notes || undefined,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
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

  const getDates = () => {
    const dates: Date[] = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const isSlotAvailable = (time: string): boolean => {
    if (!availableSlots) return true;
    const slot = availableSlots.find(s => s.time === time);
    return slot?.available ?? true;
  };

  const timeSlots = generateTimeSlots();

  if (salonLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#006B3F" />
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
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Services Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Select Services</Text>
          {salon?.services?.map((service: Service) => (
            <TouchableOpacity
              key={service.id}
              style={styles.serviceItem}
              onPress={() => toggleService(service.id)}
            >
              <View style={styles.serviceCheckbox}>
                <Checkbox
                  status={selectedServices.includes(service.id) ? 'checked' : 'unchecked'}
                  color="#006B3F"
                />
              </View>
              <View style={styles.serviceInfo}>
                <Text variant="titleSmall" style={styles.serviceName}>{service.name}</Text>
                <Text variant="bodySmall" style={styles.serviceDuration}>
                  {formatDuration(service.duration)}
                </Text>
              </View>
              <Text variant="titleMedium" style={styles.servicePrice}>
                GH₵ {service.price.toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Divider />

        {/* Staff Selection */}
        {workers && workers.length > 0 && (
          <>
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Select Stylist (Optional)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.staffItem, !selectedWorker && styles.staffItemSelected]}
                  onPress={() => setSelectedWorker(null)}
                >
                  <View style={[styles.staffAvatar, !selectedWorker && styles.staffAvatarSelected]}>
                    <Ionicons name="shuffle" size={20} color={!selectedWorker ? '#006B3F' : '#666'} />
                  </View>
                  <Text variant="bodySmall" style={styles.staffName}>Any Available</Text>
                </TouchableOpacity>
                {workers.map((worker: Worker) => (
                  <TouchableOpacity
                    key={worker.id}
                    style={[styles.staffItem, selectedWorker === worker.id && styles.staffItemSelected]}
                    onPress={() => setSelectedWorker(worker.id)}
                  >
                    {worker.avatar ? (
                      <View style={[styles.staffAvatar, selectedWorker === worker.id && styles.staffAvatarSelected]}>
                        <Text>{worker.avatar}</Text>
                      </View>
                    ) : (
                      <View style={[styles.staffAvatar, selectedWorker === worker.id && styles.staffAvatarSelected]}>
                        <Text style={styles.staffInitials}>
                          {worker.name.split(' ').map(n => n[0]).join('')}
                        </Text>
                      </View>
                    )}
                    <Text variant="bodySmall" style={styles.staffName}>{worker.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <Divider />
          </>
        )}

        {/* Date Selection */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesScroll}>
            {getDates().map((date, index) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.dateItem, isSelected && styles.dateItemSelected]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text variant="labelSmall" style={[styles.dateDay, isSelected && styles.dateTextSelected]}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text variant="titleMedium" style={[styles.dateNumber, isSelected && styles.dateTextSelected]}>
                    {date.getDate()}
                  </Text>
                  {isToday && (
                    <View style={styles.todayIndicator} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <Divider />

        {/* Time Selection */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Select Time</Text>
          {slotsLoading ? (
            <ActivityIndicator size="small" color="#006B3F" style={styles.slotsLoader} />
          ) : (
            <View style={styles.timeGrid}>
              {timeSlots.map((slot) => {
                const isAvailable = isSlotAvailable(slot.time);
                const isSelected = selectedTime === slot.time;
                return (
                  <TouchableOpacity
                    key={slot.time}
                    style={[
                      styles.timeSlot,
                      isSelected && styles.timeSlotSelected,
                      !isAvailable && styles.timeSlotUnavailable,
                    ]}
                    onPress={() => isAvailable && setSelectedTime(slot.time)}
                    disabled={!isAvailable}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        isSelected && styles.timeSlotTextSelected,
                        !isAvailable && styles.timeSlotTextUnavailable,
                      ]}
                    >
                      {formatTime(slot.time)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <Divider />

        {/* Notes */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            mode="outlined"
            placeholder="Any special requests or notes..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={styles.notesInput}
            outlineColor="#ddd"
            activeOutlineColor="#006B3F"
          />
        </View>

        <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Summary Footer */}
        <Surface style={styles.footer} elevation={4}>
        <View style={styles.summaryRow}>
          <View>
            <Text variant="bodySmall" style={styles.summaryLabel}>
              {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} • {formatDuration(totalDuration)}
            </Text>
            <Text variant="titleLarge" style={styles.totalPrice}>
              GH₵ {totalPrice.toFixed(2)}
            </Text>
          </View>
          <Button
            mode="contained"
            onPress={handleConfirmBooking}
            loading={createBookingMutation.isPending}
            disabled={selectedServices.length === 0 || !selectedTime || createBookingMutation.isPending}
            style={styles.confirmButton}
            contentStyle={styles.confirmButtonContent}
          >
            Confirm Booking
          </Button>
        </View>
      </Surface>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  serviceCheckbox: {
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontWeight: '500',
  },
  serviceDuration: {
    color: '#888',
    marginTop: 2,
  },
  servicePrice: {
    fontWeight: '600',
    color: '#006B3F',
  },
  staffItem: {
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  staffItemSelected: {
    borderColor: '#006B3F',
    backgroundColor: '#E8F5EE',
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  staffAvatarSelected: {
    backgroundColor: '#006B3F',
  },
  staffInitials: {
    color: '#fff',
    fontWeight: '600',
  },
  staffName: {
    textAlign: 'center',
  },
  datesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  dateItem: {
    width: 56,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  dateItemSelected: {
    backgroundColor: '#006B3F',
  },
  dateDay: {
    color: '#666',
    marginBottom: 4,
  },
  dateNumber: {
    fontWeight: '600',
  },
  dateTextSelected: {
    color: '#fff',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FCD116',
  },
  slotsLoader: {
    paddingVertical: 20,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    width: '22%',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  timeSlotSelected: {
    backgroundColor: '#006B3F',
  },
  timeSlotUnavailable: {
    backgroundColor: '#f5f5f5',
    opacity: 0.5,
  },
  timeSlotText: {
    fontWeight: '500',
  },
  timeSlotTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  timeSlotTextUnavailable: {
    color: '#ccc',
  },
  notesInput: {
    backgroundColor: '#fafafa',
  },
  bottomPadding: {
    height: 100,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#666',
  },
  totalPrice: {
    fontWeight: 'bold',
    color: '#006B3F',
  },
  confirmButton: {
    backgroundColor: '#006B3F',
    borderRadius: 8,
  },
  confirmButtonContent: {
    paddingHorizontal: 24,
  },
});

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
  ProgressBar,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { salonApi } from '../../api/salon';
import { bookingApi, AvailableSlot } from '../../api/booking';
import { Service, Worker } from '../../types';
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

  const getStepProgress = () => {
    let completed = 0;
    if (selectedServices.length > 0) completed++;
    if (selectedDate) completed++;
    if (selectedTime) completed++;
    return completed / 3;
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Progress Header */}
        <View style={styles.progressHeader}>
          <Text variant="titleMedium" style={styles.progressTitle}>Book Appointment</Text>
          <View style={styles.progressSteps}>
            <View style={[styles.step, selectedServices.length > 0 && styles.stepActive]}>
              <Ionicons 
                name={selectedServices.length > 0 ? "checkmark-circle" : "ellipse-outline"} 
                size={20} 
                color={selectedServices.length > 0 ? COLORS.primaryGreen : COLORS.border} 
              />
              <Text style={[styles.stepText, selectedServices.length > 0 && styles.stepTextActive]}>Service</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={[styles.step, selectedDate && styles.stepActive]}>
              <Ionicons 
                name={selectedDate ? "checkmark-circle" : "ellipse-outline"} 
                size={20} 
                color={selectedDate ? COLORS.primaryGreen : COLORS.border} 
              />
              <Text style={[styles.stepText, selectedDate ? styles.stepTextActive : undefined]}>Date</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={[styles.step, selectedTime && styles.stepActive]}>
              <Ionicons 
                name={selectedTime ? "checkmark-circle" : "ellipse-outline"} 
                size={20} 
                color={selectedTime ? COLORS.primaryGreen : COLORS.border} 
              />
              <Text style={[styles.stepText, selectedTime ? styles.stepTextActive : undefined]}>Time</Text>
            </View>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Services Section */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>1. Select Services</Text>
            <View style={styles.servicesCard}>
              {salon?.services?.map((service: Service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceItem,
                    selectedServices.includes(service.id) && styles.serviceItemSelected
                  ]}
                  onPress={() => toggleService(service.id)}
                >
                  <View style={styles.serviceCheckbox}>
                    <Checkbox
                      status={selectedServices.includes(service.id) ? 'checked' : 'unchecked'}
                      color={COLORS.primaryGreen}
                    />
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text variant="titleSmall" style={styles.serviceName}>{service.name}</Text>
                    <View style={styles.serviceDuration}>
                      <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                      <Text variant="bodySmall" style={styles.serviceDurationText}>
                        {formatDuration(service.duration)}
                      </Text>
                    </View>
                  </View>
                  <Text variant="titleMedium" style={styles.servicePrice}>
                    GH₵ {service.price.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Staff Selection */}
          {workers && workers.length > 0 && (
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
                    <Ionicons name="shuffle" size={20} color={!selectedWorker ? COLORS.primaryGreen : COLORS.textSecondary} />
                  </View>
                  <Text variant="bodySmall" style={[styles.staffName, !selectedWorker && styles.staffNameSelected]}>
                    Any Available
                  </Text>
                </TouchableOpacity>
                {workers.map((worker: Worker) => (
                  <TouchableOpacity
                    key={worker.id}
                    style={[styles.staffItem, selectedWorker === worker.id && styles.staffItemSelected]}
                    onPress={() => setSelectedWorker(worker.id)}
                  >
                    <View style={[styles.staffAvatar, selectedWorker === worker.id && styles.staffAvatarSelected]}>
                      <Text style={styles.staffInitials}>
                        {worker.name.split(' ').map(n => n[0]).join('')}
                      </Text>
                    </View>
                    <Text variant="bodySmall" style={[styles.staffName, selectedWorker === worker.id && styles.staffNameSelected]}>
                      {worker.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Date Selection */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>2. Select Date</Text>
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

          {/* Time Selection */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>3. Select Time</Text>
            {slotsLoading ? (
              <ActivityIndicator size="small" color={COLORS.primaryGreen} style={styles.slotsLoader} />
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

          {/* Notes */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Additional Notes (Optional)</Text>
            <TextInput
              mode="outlined"
              placeholder="Any special requests or notes..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={styles.notesInput}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primaryGreen}
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
              buttonColor={COLORS.primaryGreen}
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
    backgroundColor: COLORS.background,
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
  // Progress Header
  progressHeader: {
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  progressTitle: {
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: {
    alignItems: 'center',
    gap: 4,
  },
  stepActive: {
    // Active state styling
  },
  stepText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  stepTextActive: {
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  stepLine: {
    width: 40,
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  // Sections
  section: {
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
    color: COLORS.textPrimary,
  },
  // Services
  servicesCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  serviceItemSelected: {
    backgroundColor: `${COLORS.primaryGreen}08`,
  },
  serviceCheckbox: {
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  serviceDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  serviceDurationText: {
    color: COLORS.textSecondary,
  },
  servicePrice: {
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },
  // Staff
  staffItem: {
    alignItems: 'center',
    marginRight: 16,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
  },
  staffItemSelected: {
    borderColor: COLORS.primaryGreen,
    backgroundColor: `${COLORS.primaryGreen}10`,
  },
  staffAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  staffAvatarSelected: {
    backgroundColor: COLORS.primaryGreen,
  },
  staffInitials: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  staffName: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  staffNameSelected: {
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  // Dates
  datesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  dateItem: {
    width: 64,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 2,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  dateItemSelected: {
    backgroundColor: COLORS.primaryGreen,
    borderColor: COLORS.primaryGreen,
  },
  dateDay: {
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontSize: 12,
  },
  dateNumber: {
    fontWeight: '700',
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  dateTextSelected: {
    color: '#fff',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accentGold,
  },
  // Time Slots
  slotsLoader: {
    paddingVertical: 20,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    width: '23%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.cardBackground,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  timeSlotSelected: {
    backgroundColor: COLORS.primaryGreen,
    borderColor: COLORS.primaryGreen,
  },
  timeSlotUnavailable: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    opacity: 0.5,
  },
  timeSlotText: {
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  timeSlotTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  timeSlotTextUnavailable: {
    color: COLORS.textSecondary,
  },
  // Notes
  notesInput: {
    backgroundColor: COLORS.cardBackground,
  },
  bottomPadding: {
    height: 120,
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: COLORS.textSecondary,
  },
  totalPrice: {
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    fontSize: 24,
  },
  confirmButton: {
    borderRadius: 12,
  },
  confirmButtonContent: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
});

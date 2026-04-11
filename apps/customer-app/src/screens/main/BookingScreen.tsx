import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
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
import { Service, Worker, OpeningHours } from '../../types';
import { MainStackParamList } from '../../types/navigation';
import AvailabilityCalendar from '../../components/AvailabilityCalendar';
import TimeSlotSelector, { TimeSlotData } from '../../components/TimeSlotSelector';
import { useSocket } from '../../hooks/useSocket';
import { useWorkerPreference } from '../../hooks/useWorkerPreference';

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

const getDayOfWeek = (date: Date): keyof OpeningHours => {
  const days: (keyof OpeningHours)[] = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
  ];
  return days[date.getDay()];
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

export default function BookingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<BookingRouteProp>();
  const queryClient = useQueryClient();
  const { salonId, workerId, services: preselectedServices } = route.params;
  
  // Slot update toast animation
  const slotUpdateAnim = useRef(new Animated.Value(0)).current;
  const [showSlotUpdateToast, setShowSlotUpdateToast] = useState(false);

  // Selected state
  const [selectedServices, setSelectedServices] = useState<string[]>(preselectedServices || []);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(workerId || null);
  const [notes, setNotes] = useState('');

  // Worker preference hook
  const { lastWorkerId, saveWorkerPreference } = useWorkerPreference(salonId);

  // Pre-select worker from preference if no worker was passed
  useEffect(() => {
    if (!workerId && lastWorkerId && !selectedWorker) {
      // Check if the worker is still valid for this salon
      setSelectedWorker(lastWorkerId);
    }
  }, [lastWorkerId, workerId, selectedWorker]);

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
  const { data: availableSlots, isLoading: slotsLoading, refetch: refetchSlots } = useQuery({
    queryKey: ['available-slots', salonId, selectedDate, selectedWorker],
    queryFn: () => bookingApi.getAvailableSlots(salonId, selectedDate, selectedWorker || undefined),
    enabled: !!selectedDate,
  });

  // Socket.io for real-time updates
  const { isConnected, lastUpdate } = useSocket({
    salonId,
    onSlotUpdated: (data) => {
      // Show toast notification
      setShowSlotUpdateToast(true);
      Animated.sequence([
        Animated.timing(slotUpdateAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(slotUpdateAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setShowSlotUpdateToast(false));
      
      // Refetch slots if the date matches
      if (data.date === selectedDate) {
        refetchSlots();
      }
    },
    onBookingConfirmed: (data) => {
      Alert.alert('Booking Confirmed', `Your booking has been confirmed!`);
    },
    onBookingRejected: (data) => {
      Alert.alert('Booking Rejected', data.reason || 'Please try another time slot.');
    },
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
      // Save worker preference on successful booking
      if (selectedWorker) {
        saveWorkerPreference(selectedWorker);
      }
      
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

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedTime(null); // Reset time when date changes
  }, []);

  const handleTimeSelect = useCallback((time: string) => {
    setSelectedTime(time);
  }, []);

  const handleConfirmBooking = () => {
    if (selectedServices.length === 0) {
      Alert.alert('Select Services', 'Please select at least one service');
      return;
    }
    if (!selectedDate) {
      Alert.alert('Select Date', 'Please select a date');
      return;
    }
    if (!selectedTime) {
      Alert.alert('Select Time', 'Please select a time slot');
      return;
    }

    const primaryService = selectedServices[0];
    
    createBookingMutation.mutate({
      serviceId: primaryService,
      date: selectedDate,
      startTime: selectedTime,
      workerId: selectedWorker || undefined,
      notes: notes || undefined,
    });
  };

  // Convert available slots to TimeSlotData format
  const timeSlotData: TimeSlotData[] = useMemo(() => {
    if (!availableSlots) return [];
    
    return availableSlots.map((slot: AvailableSlot) => ({
      time: slot.time,
      available: slot.available,
      isBreak: false, // API should provide this info
    }));
  }, [availableSlots]);

  // Get salon closing time info
  const salonHours = useMemo(() => {
    if (!salon?.openingHours || !selectedDate) return null;
    
    const date = new Date(selectedDate);
    const dayOfWeek = getDayOfWeek(date);
    const hours = salon.openingHours[dayOfWeek];
    
    return hours;
  }, [salon?.openingHours, selectedDate]);

  // Get last available slot
  const lastAvailableSlot = useMemo(() => {
    if (!timeSlotData.length) return undefined;
    const available = timeSlotData.filter(s => s.available);
    if (available.length === 0) return undefined;
    return available[available.length - 1].time;
  }, [timeSlotData]);

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
          
          {/* Real-time connection indicator */}
          {isConnected && (
            <View style={styles.connectionIndicator}>
              <View style={styles.connectionDot} />
              <Text style={styles.connectionText}>Live</Text>
            </View>
          )}
        </View>

        {/* Slot Update Toast */}
        {showSlotUpdateToast && (
          <Animated.View
            style={[
              styles.slotUpdateToast,
              {
                opacity: slotUpdateAnim,
                transform: [
                  {
                    translateY: slotUpdateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="refresh" size={16} color={COLORS.accentGold} />
            <Text style={styles.toastText}>Slots updated - someone just booked</Text>
          </Animated.View>
        )}

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

          {/* Date Selection - AvailabilityCalendar */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>2. Select Date</Text>
            <AvailabilityCalendar
              salonId={salonId}
              workerId={selectedWorker || undefined}
              serviceDuration={totalDuration}
              onDateSelect={handleDateSelect}
              selectedDate={selectedDate}
            />
          </View>

          {/* Time Selection - TimeSlotSelector */}
          {selectedDate && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>3. Select Time</Text>
              {slotsLoading ? (
                <ActivityIndicator size="small" color={COLORS.primaryGreen} style={styles.slotsLoader} />
              ) : (
                <TimeSlotSelector
                  slots={timeSlotData}
                  selectedTime={selectedTime || undefined}
                  onTimeSelect={handleTimeSelect}
                  closingTime={salonHours?.close}
                  lastAvailableSlot={lastAvailableSlot}
                />
              )}
            </View>
          )}

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
  connectionIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primaryGreen,
  },
  connectionText: {
    fontSize: 10,
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  // Slot Update Toast
  slotUpdateToast: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  toastText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
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
  // Time Slots
  slotsLoader: {
    paddingVertical: 20,
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

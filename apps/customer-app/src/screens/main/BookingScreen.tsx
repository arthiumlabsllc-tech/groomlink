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
  LayoutAnimation,
  UIManager,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { salonApi } from '../../api/salon';
import { bookingApi, AvailableSlot, GuestData } from '../../api/booking';
import { paymentApi, PaymentProvider } from '../../api/payment';
import { NoShowStatus } from '../../types';
import { Service, Worker, OpeningHours } from '../../types';
import { MainStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../store/authStore';
import AvailabilityCalendar from '../../components/AvailabilityCalendar';
import TimeSlotSelector, { TimeSlotData } from '../../components/TimeSlotSelector';
import { useSocket } from '../../hooks/useSocket';
import { useWorkerPreference } from '../../hooks/useWorkerPreference';
import { useBookingDraft } from '../../hooks/useBookingDraft';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';
import { a11yCurrency, a11yDuration } from '../../hooks/useAccessibility';
import { parseLocalDate } from '../../utils/dateUtils';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Design System Colors - theme-aware factory
const createColors = (t: AppTheme) => ({
  primaryGreen: '#006B3F',
  accentGold: '#FCD116',
  accentRed: '#CE1126',
  dark: '#1a1a2e',
  background: t.background,
  cardBackground: t.surface,
  textPrimary: t.text,
  textSecondary: t.textSecondary,
  border: t.border,
});

type BookingRouteProp = RouteProp<MainStackParamList, 'Booking'>;

const getDayOfWeek = (date: Date): keyof OpeningHours => {
  const days: (keyof OpeningHours)[] = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
  ];
  return days[date.getDay()];
};

const formatTime = (time: string | undefined | null) => {
  if (!time) return 'N/A';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  const [hours, minutes] = parts;
  const hour = parseInt(hours);
  if (isNaN(hour)) return time;
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
  const { theme } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuthStore();
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

  // Group booking state
  const [isGroupBooking, setIsGroupBooking] = useState(false);
  const [guests, setGuests] = useState<GuestData[]>([]);
  const [totalPeople, setTotalPeople] = useState(1);

  // Payment state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentProvider>('MTN_MOMO');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [initializingPayment, setInitializingPayment] = useState(false);

  // Booking draft persistence (resume after app close / back button)
  const { draft, isLoaded: draftLoaded, saveDraft, clearDraft } = useBookingDraft(salonId);

  // Restore draft state on mount (only once when draft is loaded)
  const draftRestored = useRef(false);
  useEffect(() => {
    if (draftLoaded && draft && !draftRestored.current) {
      draftRestored.current = true;
      if (draft.selectedServices.length > 0) setSelectedServices(draft.selectedServices);
      if (draft.selectedDate) setSelectedDate(draft.selectedDate);
      if (draft.selectedTime) setSelectedTime(draft.selectedTime);
      if (draft.selectedWorker) setSelectedWorker(draft.selectedWorker);
      if (draft.notes) setNotes(draft.notes);
      if (draft.isGroupBooking) setIsGroupBooking(draft.isGroupBooking);
      if (draft.guests.length > 0) setGuests(draft.guests);
      if (draft.phoneNumber) setPhoneNumber(draft.phoneNumber);
      if (draft.selectedPaymentMethod) setSelectedPaymentMethod(draft.selectedPaymentMethod);
    }
  }, [draftLoaded, draft]);

  // Auto-save draft whenever booking state changes
  useEffect(() => {
    if (!draftLoaded) return; // Don't save before draft is loaded
    saveDraft({
      salonId,
      selectedServices,
      selectedDate,
      selectedTime,
      selectedWorker,
      notes,
      isGroupBooking,
      guests,
      phoneNumber,
      selectedPaymentMethod,
    });
  }, [
    selectedServices, selectedDate, selectedTime, selectedWorker,
    notes, isGroupBooking, guests, phoneNumber, selectedPaymentMethod,
    salonId, draftLoaded, saveDraft,
  ]);

  // Fetch platform fee config
  const { data: paymentConfig } = useQuery({
    queryKey: ['payment-config'],
    queryFn: () => paymentApi.getConfig(),
    staleTime: 10 * 60 * 1000, // Cache for 10 mins
  });

  // Update totalPeople when group booking or guests change
  useEffect(() => {
    if (isGroupBooking) {
      setTotalPeople(1 + guests.length); // 1 for primary customer + guests
    } else {
      setTotalPeople(1);
    }
  }, [isGroupBooking, guests.length]);

  // Guest management functions
  const addGuest = () => {
    setGuests([
      ...guests,
      {
        guestName: '',
        guestPhone: '',
        guestAgeGroup: 'adult',
        serviceId: selectedServices[0] || '',
        staffId: selectedWorker || undefined,
        specialInstructions: '',
        isChild: false,
      },
    ]);
  };

  const removeGuest = (index: number) => {
    setGuests(guests.filter((_, i) => i !== index));
  };

  const updateGuest = (index: number, field: keyof GuestData, value: any) => {
    const updatedGuests = [...guests];
    updatedGuests[index] = { ...updatedGuests[index], [field]: value };
    // Update isChild based on age group
    if (field === 'guestAgeGroup') {
      updatedGuests[index].isChild = value === 'child';
    }
    setGuests(updatedGuests);
  };

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

  // Fetch no-show status
  const { data: noShowStatus } = useQuery({
    queryKey: ['no-show-status'],
    queryFn: () => bookingApi.getNoShowStatus(),
    enabled: isAuthenticated,
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
    mutationFn: (data: { 
      serviceId: string; 
      date: string; 
      startTime: string; 
      workerId?: string; 
      notes?: string;
      isGroupBooking?: boolean;
      totalPeople?: number;
      guests?: GuestData[];
      billingType?: 'combined' | 'separate';
    }) => 
      bookingApi.createBooking({
        salonId,
        serviceId: data.serviceId,
        date: data.date,
        startTime: data.startTime,
        workerId: data.workerId,
        customerNotes: data.notes,
        isGroupBooking: data.isGroupBooking,
        totalPeople: data.totalPeople,
        guests: data.guests,
        billingType: data.billingType,
      }),
    onSuccess: async (booking) => {
      // Save worker preference on successful booking
      if (selectedWorker) {
        saveWorkerPreference(selectedWorker);
      }

      // Clear booking draft since booking was successfully created
      clearDraft();

      queryClient.invalidateQueries({ queryKey: ['bookings'] });

      // Initialize payment via active gateway (Paystack/Hubtel)
      try {
        setInitializingPayment(true);
        const paymentResponse = await paymentApi.initialize({
          bookingId: booking.id,
          provider: selectedPaymentMethod,
          phoneNumber: `+233${phoneNumber.replace(/\s/g, '').replace(/\D/g, '')}`,
        });

        // Navigate to payment processing screen
        navigation.navigate('PaymentProcessing', {
          bookingId: booking.id,
          reference: paymentResponse.reference,
          provider: selectedPaymentMethod,
          checkoutUrl: paymentResponse.checkout_url,
        });
      } catch (paymentError: any) {
        // Payment initialization failed - navigate to confirmation anyway
        // so the user doesn't lose their booking
        console.error('Payment init failed:', paymentError);
        Alert.alert(
          'Payment Setup Failed',
          paymentError.response?.data?.message || 'Could not start payment. Your booking is saved as pending. You can pay later from booking details.',
          [
            {
              text: 'View Booking',
              onPress: () => navigation.navigate('BookingConfirmation', { bookingId: booking.id }),
            },
          ]
        );
      } finally {
        setInitializingPayment(false);
      }
    },
    onError: (error: any) => {
      const apiError = error.response?.data?.error;
      const message = apiError?.message || error.response?.data?.message || error.message || 'Please try again';
      console.error('Booking creation failed:', JSON.stringify(error.response?.data || error.message));
      Alert.alert('Booking Failed', message);
    },
  });

  const toggleService = (serviceId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const serviceSubtotal = useMemo(() => {
    if (!salon?.services) return 0;
    
    // Primary customer services
    let total = salon.services
      .filter(s => selectedServices.includes(s.id))
      .reduce((sum, s) => sum + parseFloat(String(s.price)), 0);
    
    // Add guest services for group bookings
    if (isGroupBooking && guests.length > 0) {
      guests.forEach(guest => {
        const guestService = salon?.services?.find(s => s.id === guest.serviceId);
        if (guestService) {
          total += parseFloat(String(guestService.price));
        }
      });
    }
    
    return total;
  }, [salon?.services, selectedServices, isGroupBooking, guests]);

  // Flat GHS 2 booking fee (non-refundable)
  const platformFee = useMemo(() => {
    return 2;
  }, []);

  const totalPrice = useMemo(() => {
    return serviceSubtotal + platformFee;
  }, [serviceSubtotal, platformFee]);

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
    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 9) {
      Alert.alert('Phone Number Required', 'Please enter your mobile money phone number');
      return;
    }

    // Validate group booking
    if (isGroupBooking && guests.length > 0) {
      const invalidGuests = guests.filter(g => !g.guestName.trim() || !g.serviceId);
      if (invalidGuests.length > 0) {
        Alert.alert('Incomplete Guest Info', 'Please fill in name and service for all guests');
        return;
      }
    }

    const primaryService = selectedServices[0];
    
    createBookingMutation.mutate({
      serviceId: primaryService,
      date: selectedDate,
      startTime: selectedTime,
      workerId: selectedWorker || undefined,
      notes: notes || undefined,
      isGroupBooking,
      totalPeople,
      guests: isGroupBooking ? guests : undefined,
      billingType: 'combined',
    });
  };

  // Convert available slots to TimeSlotData format
  const timeSlotData: TimeSlotData[] = useMemo(() => {
    if (!availableSlots) return [];
    
    return availableSlots.map((slot: AvailableSlot) => ({
      time: slot.startTime,
      available: slot.available,
      isBreak: false,
      remainingSpots: slot.remainingSpots,
      totalSpots: slot.totalSpots,
      bookedSpots: slot.bookedSpots,
    }));
  }, [availableSlots]);

  // Get salon closing time info
  const salonHours = useMemo(() => {
    if (!selectedDate) return null;
    
    // Timezone-safe: parse components explicitly to get correct day-of-week
    const date = parseLocalDate(selectedDate);
    const dayOfWeek = getDayOfWeek(date);
    
    // Try operatingHours first
    if (salon?.operatingHours) {
      const hours = (salon.operatingHours as any)?.[dayOfWeek];
      return hours ?? null;
    }
    
    // Fallback to openingTime/closingTime with workingDays
    if (salon?.openingTime && salon?.closingTime) {
      const dayUpper = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1).toUpperCase();
      if (salon.workingDays?.includes(dayUpper)) {
        return { open: salon.openingTime, close: salon.closingTime, isOpen: true };
      }
      return null;
    }
    
    return null;
  }, [salon?.operatingHours, salon?.openingTime, salon?.closingTime, salon?.workingDays, selectedDate]);

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

  const getConfirmButtonLabel = () => {
    if (noShowStatus?.restricted) return 'Booking Restricted';
    if (initializingPayment) return 'Processing Payment...';
    if (createBookingMutation.isPending) return 'Creating Booking...';
    if (selectedServices.length === 0) return 'Select a service';
    if (!selectedDate) return 'Pick a date';
    if (!selectedTime) return 'Choose a time slot';
    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 9) return 'Enter MoMo number';
    return 'Confirm & Pay';
  };

  const isConfirmDisabled = selectedServices.length === 0 || !selectedTime || !selectedDate || createBookingMutation.isPending || initializingPayment || noShowStatus?.restricted || !phoneNumber || phoneNumber.replace(/\D/g, '').length < 9;

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

        {/* No-Show Warning Banner */}
        {noShowStatus?.restricted && (
          <View style={styles.noShowBannerRestricted}>
            <Ionicons name="warning" size={20} color={COLORS.accentRed} />
            <View style={styles.noShowBannerContent}>
              <Text style={styles.noShowBannerTitle}>Booking Restricted</Text>
              <Text style={styles.noShowBannerText}>
                {noShowStatus.reason || 'You have multiple no-shows. Booking is temporarily restricted.'}
              </Text>
              {noShowStatus.restrictedUntil && (
                <Text style={styles.noShowBannerSubtext}>
                  Restricted until: {new Date(noShowStatus.restrictedUntil).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
        )}
        
        {!noShowStatus?.restricted && noShowStatus && noShowStatus.noShowCount > 0 && (
          <View style={styles.noShowBannerWarning}>
            <Ionicons name="alert-circle" size={20} color={COLORS.accentGold} />
            <View style={styles.noShowBannerContent}>
              <Text style={styles.noShowBannerTitleWarning}>No-Show Warning</Text>
              <Text style={styles.noShowBannerTextWarning}>
                You have {noShowStatus.noShowCount} no-show{noShowStatus.noShowCount > 1 ? 's' : ''}. 
                Multiple no-shows may result in booking restrictions.
              </Text>
            </View>
          </View>
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
                  accessible={true}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selectedServices.includes(service.id) }}
                  accessibilityLabel={`${service.name}, ${a11yDuration(service.duration)}, ${a11yCurrency(service.price)}`}
                  accessibilityHint="Double tap to toggle selection"
                >
                  <View style={styles.serviceCheckbox}>
                    <Checkbox
                      status={selectedServices.includes(service.id) ? 'checked' : 'unchecked'}
                      color={COLORS.primaryGreen}
                    />
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text variant="titleSmall" style={styles.serviceName}>{service.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <View style={styles.serviceDuration}>
                        <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                        <Text variant="bodySmall" style={styles.serviceDurationText}>
                          {formatDuration(service.duration)}
                        </Text>
                      </View>
                      {service.offersHomeService && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Ionicons name="home-outline" size={12} color="#4F46E5" />
                          <Text variant="bodySmall" style={{ color: '#4F46E5', fontSize: 11, fontWeight: '500' }}>Home</Text>
                        </View>
                      )}
                    </View>
                    {service.offersHomeService && service.homeServiceFee && parseFloat(String(service.homeServiceFee)) > 0 && (
                      <Text variant="bodySmall" style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 2 }}>
                        +GH₵ {parseFloat(String(service.homeServiceFee)).toFixed(2)} home fee
                      </Text>
                    )}
                  </View>
                  <Text variant="titleMedium" style={styles.servicePrice}>
                    GH₵ {parseFloat(String(service.price)).toFixed(2)}
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
                  accessible={true}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: !selectedWorker }}
                  accessibilityLabel="Any available stylist"
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
                    accessible={true}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: selectedWorker === worker.id }}
                    accessibilityLabel={`${worker.fullName}`}
                  >
                    <View style={[styles.staffAvatar, selectedWorker === worker.id && styles.staffAvatarSelected]}>
                      <Text style={styles.staffInitials}>
                        {(worker.fullName || '').split(' ').map(n => n?.[0] || '').join('')}
                      </Text>
                    </View>
                    <Text variant="bodySmall" style={[styles.staffName, selectedWorker === worker.id && styles.staffNameSelected]}>
                      {worker.fullName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Group Booking Selection */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Who's coming?
            </Text>
            <View style={styles.groupSelectionRow}>
              <TouchableOpacity
                style={[styles.groupOptionCard, !isGroupBooking && styles.groupOptionCardSelected]}
                onPress={() => setIsGroupBooking(false)}
                activeOpacity={0.8}
                accessible={true}
                accessibilityRole="radio"
                accessibilityState={{ selected: !isGroupBooking }}
                accessibilityLabel="Just me, solo appointment"
              >
                <View style={[styles.groupOptionIcon, !isGroupBooking && styles.groupOptionIconSelected]}>
                  <Ionicons name="person" size={24} color={!isGroupBooking ? '#fff' : COLORS.textSecondary} />
                </View>
                <Text variant="titleSmall" style={[styles.groupOptionTitle, !isGroupBooking && styles.groupOptionTitleSelected]}>
                  Just Me
                </Text>
                <Text variant="bodySmall" style={styles.groupOptionDesc}>
                  Solo appointment
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.groupOptionCard, isGroupBooking && styles.groupOptionCardSelected]}
                onPress={() => setIsGroupBooking(true)}
                activeOpacity={0.8}
                accessible={true}
                accessibilityRole="radio"
                accessibilityState={{ selected: isGroupBooking }}
                accessibilityLabel="With guests, book for multiple people"
              >
                <View style={[styles.groupOptionIcon, isGroupBooking && styles.groupOptionIconSelected]}>
                  <Ionicons name="people" size={24} color={isGroupBooking ? '#fff' : COLORS.textSecondary} />
                </View>
                <Text variant="titleSmall" style={[styles.groupOptionTitle, isGroupBooking && styles.groupOptionTitleSelected]}>
                  With Guests
                </Text>
                <Text variant="bodySmall" style={styles.groupOptionDesc}>
                  Book for multiple people
                </Text>
              </TouchableOpacity>
            </View>

            {/* Group Booking Details */}
            {isGroupBooking && (
              <View style={styles.groupBookingDetails}>
                {/* Primary Customer */}
                <View style={styles.primaryCustomerCard}>
                  <View style={styles.primaryCustomerHeader}>
                    <Ionicons name="person-circle" size={24} color={COLORS.primaryGreen} />
                    <Text variant="titleSmall" style={styles.primaryCustomerLabel}>
                      Primary Customer (You)
                    </Text>
                  </View>
                  <Text variant="bodyMedium" style={styles.primaryCustomerServices}>
                    {selectedServices.length > 0 
                      ? salon?.services?.filter(s => selectedServices.includes(s.id)).map(s => s.name).join(', ')
                      : 'No services selected'}
                  </Text>
                </View>

                {/* Guest Cards */}
                {guests.map((guest, index) => {
                  const guestService = salon?.services?.find(s => s.id === guest.serviceId);
                  return (
                    <View key={index} style={styles.guestCard}>
                      <View style={styles.guestCardHeader}>
                        <Text variant="titleSmall" style={styles.guestCardTitle}>
                          Guest {index + 1}
                        </Text>
                        <TouchableOpacity 
                          onPress={() => removeGuest(index)}
                          style={styles.removeGuestButton}
                        >
                          <Ionicons name="close-circle" size={22} color={COLORS.accentRed} />
                        </TouchableOpacity>
                      </View>
                      
                      {/* Guest Name */}
                      <TextInput
                        mode="outlined"
                        placeholder="Guest Name *"
                        value={guest.guestName}
                        onChangeText={(text) => updateGuest(index, 'guestName', text)}
                        style={styles.guestInput}
                        outlineColor={COLORS.border}
                        activeOutlineColor={COLORS.primaryGreen}
                        textColor={COLORS.textPrimary}
                        placeholderTextColor={COLORS.textSecondary}
                      />
                      
                      {/* Guest Phone */}
                      <TextInput
                        mode="outlined"
                        placeholder="Phone (Optional)"
                        value={guest.guestPhone || ''}
                        onChangeText={(text) => updateGuest(index, 'guestPhone', text)}
                        style={styles.guestInput}
                        outlineColor={COLORS.border}
                        activeOutlineColor={COLORS.primaryGreen}
                        textColor={COLORS.textPrimary}
                        placeholderTextColor={COLORS.textSecondary}
                        keyboardType="phone-pad"
                      />
                      
                      {/* Age Group */}
                      <View style={styles.ageGroupRow}>
                        {(['child', 'teen', 'adult', 'senior'] as const).map((age) => (
                          <TouchableOpacity
                            key={age}
                            style={[
                              styles.ageGroupChip,
                              guest.guestAgeGroup === age && styles.ageGroupChipSelected,
                            ]}
                            onPress={() => updateGuest(index, 'guestAgeGroup', age)}
                          >
                            <Text style={[
                              styles.ageGroupChipText,
                              guest.guestAgeGroup === age && styles.ageGroupChipTextSelected,
                            ]}>
                              {age.charAt(0).toUpperCase() + age.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      
                      {/* Service Selection */}
                      <Text variant="bodySmall" style={styles.guestInputLabel}>Service</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.guestServiceScroll}>
                        {salon?.services?.map((service) => (
                          <TouchableOpacity
                            key={service.id}
                            style={[
                              styles.guestServiceChip,
                              guest.serviceId === service.id && styles.guestServiceChipSelected,
                            ]}
                            onPress={() => updateGuest(index, 'serviceId', service.id)}
                          >
                            <Text style={[
                              styles.guestServiceChipText,
                              guest.serviceId === service.id && styles.guestServiceChipTextSelected,
                            ]}>
                              {service.name}
                            </Text>
                            <Text style={[
                              styles.guestServiceChipPrice,
                              guest.serviceId === service.id && styles.guestServiceChipTextSelected,
                            ]}>
                              GH₵{parseFloat(String(service.price)).toFixed(0)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      
                      {/* Special Instructions */}
                      <TextInput
                        mode="outlined"
                        placeholder="Special instructions (optional)"
                        value={guest.specialInstructions || ''}
                        onChangeText={(text) => updateGuest(index, 'specialInstructions', text)}
                        style={styles.guestInput}
                        outlineColor={COLORS.border}
                        activeOutlineColor={COLORS.primaryGreen}
                        textColor={COLORS.textPrimary}
                        placeholderTextColor={COLORS.textSecondary}
                        multiline
                        numberOfLines={2}
                      />
                    </View>
                  );
                })}

                {/* Add Guest Button */}
                <TouchableOpacity style={styles.addGuestButton} onPress={addGuest}>
                  <Ionicons name="add-circle-outline" size={22} color={COLORS.primaryGreen} />
                  <Text style={styles.addGuestButtonText}>Add Another Guest</Text>
                </TouchableOpacity>

                {/* Total People Counter */}
                <View style={styles.totalPeopleRow}>
                  <Ionicons name="people" size={20} color={COLORS.textSecondary} />
                  <Text variant="bodyMedium" style={styles.totalPeopleText}>
                    Total: {totalPeople} {totalPeople === 1 ? 'person' : 'people'}
                  </Text>
                </View>
              </View>
            )}
          </View>

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
                  closingTime={typeof salonHours === 'object' && salonHours !== null ? salonHours.close : undefined}
                  lastAvailableSlot={lastAvailableSlot}
                  totalPeople={totalPeople}
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
              textColor={COLORS.textPrimary}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.paymentMethodsRow}>
              {([
                { id: 'MTN_MOMO' as PaymentProvider, label: 'MTN', color: '#FFCC00', textColor: '#000' },
                { id: 'VODAFONE_CASH' as PaymentProvider, label: 'VOD', color: '#E60000', textColor: '#fff' },
                { id: 'AIRTELTIGO_MONEY' as PaymentProvider, label: 'AT', color: '#0066CC', textColor: '#fff' },
              ]).map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethodChip,
                    selectedPaymentMethod === method.id && styles.paymentMethodChipSelected,
                  ]}
                  onPress={() => setSelectedPaymentMethod(method.id)}
                  accessible={true}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedPaymentMethod === method.id }}
                  accessibilityLabel={`${method.id === 'MTN_MOMO' ? 'MTN Mobile Money' : method.id === 'VODAFONE_CASH' ? 'Vodafone Cash' : 'AirtelTigo Money'}`}
                >
                  <View style={[styles.paymentMethodIcon, { backgroundColor: method.color }]}>
                    <Text style={[styles.paymentMethodIconText, { color: method.textColor }]}>
                      {method.label}
                    </Text>
                  </View>
                  <Text style={[
                    styles.paymentMethodLabel,
                    selectedPaymentMethod === method.id && styles.paymentMethodLabelSelected,
                  ]}>
                    {method.id === 'MTN_MOMO' ? 'MTN MoMo' : method.id === 'VODAFONE_CASH' ? 'Vodafone' : 'AirtelTigo'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Phone Number for Mobile Money */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Mobile Money Number</Text>
            <View style={styles.phoneInputContainer}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>+233</Text>
              </View>
              <TextInput
                mode="outlined"
                placeholder="XX XXX XXXX"
                value={phoneNumber}
                onChangeText={(text) => setPhoneNumber(text.replace(/\D/g, '').slice(0, 9))}
                keyboardType="phone-pad"
                maxLength={9}
                style={styles.phoneInput}
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primaryGreen}
                textColor={COLORS.textPrimary}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <Text style={styles.phoneHint}>
              Enter your mobile money number. You'll receive a prompt on your phone.
            </Text>
          </View>

          {/* Booking Summary & Fee Breakdown */}
          {selectedServices.length > 0 && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>Booking Summary</Text>
              {isGroupBooking && (
                <View style={styles.groupBadge}>
                  <Ionicons name="people" size={14} color="#fff" />
                  <Text style={styles.groupBadgeText}>Group Booking • {totalPeople} people</Text>
                </View>
              )}
              <View style={styles.feeBreakdownCard}>
                {/* Service Info Row */}
                <View style={[styles.feeRow, { marginBottom: 8 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                    <Text variant="bodySmall" style={styles.feeLabel}>Est. Duration</Text>
                  </View>
                  <Text variant="bodySmall" style={styles.feeValue}>{formatDuration(totalDuration)}</Text>
                </View>
                {salon?.distance != null && salon.distance > 0 && (
                  <View style={[styles.feeRow, { marginBottom: 8 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="navigate-outline" size={14} color={COLORS.textSecondary} />
                      <Text variant="bodySmall" style={styles.feeLabel}>Distance</Text>
                    </View>
                    <Text variant="bodySmall" style={styles.feeValue}>{salon.distance.toFixed(1)} km</Text>
                  </View>
                )}
                <View style={styles.feeDivider} />
                <View style={styles.feeRow}>
                  <Text variant="bodySmall" style={styles.feeLabel}>Services Subtotal</Text>
                  <Text variant="bodySmall" style={styles.feeValue}>GH₵ {serviceSubtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.feeRow}>
                  <Text variant="bodySmall" style={styles.feeLabel}>Booking Fee (non-refundable)</Text>
                  <Text variant="bodySmall" style={styles.feeValue}>GH₵ {platformFee.toFixed(2)}</Text>
                </View>
                <View style={styles.feeDivider} />
                <View style={styles.feeRowTotal}>
                  <Text variant="bodyMedium" style={styles.feeTotalLabel}>Total Amount</Text>
                  <Text variant="titleMedium" style={styles.feeTotalValue}>GH₵ {totalPrice.toFixed(2)}</Text>
                </View>
                <View style={styles.escrowNote}>
                  <Ionicons name="shield-checkmark" size={14} color={COLORS.primaryGreen} />
                  <Text variant="bodySmall" style={styles.escrowText}>
                    Payment held securely until service completion
                  </Text>
                </View>
              </View>
              <View style={styles.policyNote}>
                <Ionicons name="information-circle" size={14} color={COLORS.textSecondary} />
                <Text variant="bodySmall" style={styles.policyText}>
                  Free cancellation up to 48h before appointment
                </Text>
              </View>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Compact Summary Footer */}
        <Surface style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]} elevation={4}>
          <View style={styles.summaryRow}>
            <View>
              <Text variant="bodySmall" style={styles.summaryLabel}>
                {isGroupBooking 
                  ? `${totalPeople} ${totalPeople === 1 ? 'person' : 'people'} • ${selectedServices.length + guests.filter(g => g.serviceId).length} services`
                  : `${selectedServices.length} service${selectedServices.length !== 1 ? 's' : ''} • ${formatDuration(totalDuration)}`
                }
              </Text>
              <Text variant="titleLarge" style={styles.totalPrice}>
                GH₵ {totalPrice.toFixed(2)}
              </Text>
            </View>
            <Button
              mode="contained"
              onPress={handleConfirmBooking}
              loading={createBookingMutation.isPending || initializingPayment}
              disabled={isConfirmDisabled}
              style={[styles.confirmButton, isConfirmDisabled && styles.confirmButtonDisabled]}
              contentStyle={styles.confirmButtonContent}
              buttonColor={COLORS.primaryGreen}
            >
              {getConfirmButtonLabel()}
            </Button>
          </View>
        </Surface>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (COLORS: ReturnType<typeof createColors>) => StyleSheet.create({
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
    height: 80,
  },
  // Compact sticky footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonContent: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  // Group Booking Styles
  groupSelectionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  groupOptionCard: {
    flex: 1,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  groupOptionCardSelected: {
    borderColor: COLORS.primaryGreen,
    backgroundColor: `${COLORS.primaryGreen}08`,
  },
  groupOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupOptionIconSelected: {
    backgroundColor: COLORS.primaryGreen,
  },
  groupOptionTitle: {
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  groupOptionTitleSelected: {
    color: COLORS.primaryGreen,
  },
  groupOptionDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  groupBookingDetails: {
    marginTop: 16,
  },
  primaryCustomerCard: {
    backgroundColor: `${COLORS.primaryGreen}08`,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: `${COLORS.primaryGreen}20`,
    marginBottom: 12,
  },
  primaryCustomerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  primaryCustomerLabel: {
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },
  primaryCustomerServices: {
    color: COLORS.textPrimary,
  },
  guestCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  guestCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  guestCardTitle: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  removeGuestButton: {
    padding: 4,
  },
  guestInput: {
    marginBottom: 12,
    backgroundColor: COLORS.background,
  },
  guestInputLabel: {
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: -4,
  },
  ageGroupRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  ageGroupChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ageGroupChipSelected: {
    backgroundColor: COLORS.primaryGreen,
    borderColor: COLORS.primaryGreen,
  },
  ageGroupChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  ageGroupChipTextSelected: {
    color: '#fff',
  },
  guestServiceScroll: {
    marginBottom: 12,
  },
  guestServiceChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  guestServiceChipSelected: {
    backgroundColor: COLORS.primaryGreen,
    borderColor: COLORS.primaryGreen,
  },
  guestServiceChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  guestServiceChipTextSelected: {
    color: '#fff',
  },
  guestServiceChipPrice: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addGuestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: `${COLORS.primaryGreen}10`,
    borderWidth: 1,
    borderColor: `${COLORS.primaryGreen}30`,
    borderStyle: 'dashed',
    gap: 8,
    marginBottom: 12,
  },
  addGuestButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },
  totalPeopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  totalPeopleText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  groupBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  // Fee Breakdown
  feeBreakdownCard: {
    backgroundColor: `${COLORS.primaryGreen}08`,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${COLORS.primaryGreen}20`,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  feeLabel: {
    color: COLORS.textSecondary,
  },
  feeValue: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  feeDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  feeRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feeTotalLabel: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  feeTotalValue: {
    color: COLORS.primaryGreen,
    fontWeight: 'bold',
  },
  escrowNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: `${COLORS.primaryGreen}15`,
  },
  escrowText: {
    color: COLORS.primaryGreen,
    fontSize: 12,
  },
  policyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  policyText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  // No-Show Banners
  noShowBannerRestricted: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${COLORS.accentRed}15`,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: `${COLORS.accentRed}30`,
  },
  noShowBannerWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${COLORS.accentGold}15`,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: `${COLORS.accentGold}30`,
  },
  noShowBannerContent: {
    flex: 1,
    marginLeft: 12,
  },
  noShowBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.accentRed,
    marginBottom: 4,
  },
  noShowBannerTitleWarning: {
    fontSize: 15,
    fontWeight: '600',
    color: '#B45309',
    marginBottom: 4,
  },
  noShowBannerText: {
    fontSize: 13,
    color: COLORS.accentRed,
    opacity: 0.9,
  },
  noShowBannerTextWarning: {
    fontSize: 13,
    color: '#B45309',
    opacity: 0.9,
  },
  noShowBannerSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  // Payment Method
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
  },
  paymentMethodChipSelected: {
    borderColor: COLORS.primaryGreen,
    backgroundColor: `${COLORS.primaryGreen}08`,
  },
  paymentMethodIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  paymentMethodIconText: {
    fontSize: 11,
    fontWeight: '700',
  },
  paymentMethodLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  paymentMethodLabelSelected: {
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
  // Phone Input
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  phonePrefix: {
    height: 56,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRightWidth: 0,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  phonePrefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: COLORS.cardBackground,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  phoneHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
});

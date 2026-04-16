import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Scissors,
  MapPin,
  Star,
  FileText,
  CheckCircle2,
  CalendarDays,
  RefreshCw,
  Users,
} from 'lucide-react';
import apiClient, { bookingApi, paymentApi, queueApi, QueueStatus, BookingGuest, NoShowStatus } from '../lib/api';

// Types
interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  duration: number;
  price: string;
  isActive: boolean;
}

interface Worker {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  email: string | null;
  bio: string | null;
  specialties: string[];
  rating: number;
  reviewCount: number;
  isActive: boolean;
  avatar: string | null;
}

interface Salon {
  id: string;
  businessName: string;
  address: string;
  city: string;
  logo: string | null;
  type: string;
  rating: number;
  reviewCount: number;
}

interface AvailableSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  remainingSpots?: number;
  totalSpots?: number;
  bookedSpots?: number;
}

interface BookingData {
  salonId: string;
  serviceId: string;
  workerId?: string;
  date: string;
  startTime: string;
  customerNotes?: string;
  isGroupBooking?: boolean;
  totalPeople?: number;
  guests?: BookingGuest[];
  billingType?: 'individual' | 'combined';
}

type BookingStep = 'service' | 'staff' | 'group' | 'datetime' | 'confirm' | 'success';

type PaymentProvider = 'MTN_MOMO' | 'VODAFONE_CASH' | 'AIRTELTIGO_MONEY' | 'CASH';



const formatPrice = (price: string | number): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return 'GH₵0.00';
  return `GH₵${numPrice.toFixed(2)}`;
};

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getDates = (days: number = 30): Date[] => {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }
  return dates;
};

const getDefaultSalonImage = (type: string): string => {
  const defaultImages: Record<string, string> = {
    BARBERSHOP: 'https://images.unsplash.com/photo-1585747860715-2d3b4c7e3a23?w=800&h=400&fit=crop',
    HAIR_SALON: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=400&fit=crop',
    NAIL_SALON: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&h=400&fit=crop',
    SPA: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&h=400&fit=crop',
  };
  return defaultImages[type] || 'https://images.unsplash.com/photo-1522337360788-8b13ee0af107?w=800&h=400&fit=crop';
};

export default function BookSalon() {
  const { id: salonId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [currentStep, setCurrentStep] = useState<BookingStep>('service');
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Worker[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  
  // Selection state
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  
  // Loading states
  const [loadingSalon, setLoadingSalon] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsLoaded, setSlotsLoaded] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Success state
  const [createdBooking, setCreatedBooking] = useState<{ id: string; reference: string; payment?: { id: string; reference: string } } | null>(null);
  
  // Payment state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentProvider>('CASH');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [initializingPayment, setInitializingPayment] = useState(false);
  const [paymentRedirecting, setPaymentRedirecting] = useState(false);

  // Queue state
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);

  // No-show status state
  const [noShowStatus, setNoShowStatus] = useState<NoShowStatus | null>(null);

  // Group booking state
  const [isGroupBooking, setIsGroupBooking] = useState(false);
  const [guests, setGuests] = useState<BookingGuest[]>([]);
  const [totalPeople, setTotalPeople] = useState(1);

  // Platform fee state
  const [platformFeePercentage, setPlatformFeePercentage] = useState(5); // Default 5%

  // Fetch platform fee percentage
  useEffect(() => {
    const fetchPlatformFee = async () => {
      try {
        const config = await paymentApi.getConfig();
        setPlatformFeePercentage(config.platformFeePercentage);
      } catch (err) {
        console.error('Failed to fetch platform fee percentage, using default 5%:', err);
      }
    };

    fetchPlatformFee();
  }, []);

  // Fetch salon data
  useEffect(() => {
    if (!salonId) {
      setError('Salon ID is required');
      setLoadingSalon(false);
      return;
    }

    const fetchSalon = async () => {
      try {
        setLoadingSalon(true);
        const response = await apiClient.get(`/salons/${salonId}`);
        if (response.data.success) {
          setSalon(response.data.data);
        } else {
          setError('Failed to load salon details');
        }
      } catch (err) {
        setError('Failed to load salon details');
      } finally {
        setLoadingSalon(false);
      }
    };

    fetchSalon();
  }, [salonId]);

  // Fetch services
  useEffect(() => {
    if (!salonId) return;

    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        const response = await apiClient.get(`/salons/${salonId}/services`);
        if (response.data.success) {
          setServices(response.data.data.services || []);
        }
      } catch (err) {
        toast.error('Failed to load services');
      } finally {
        setLoadingServices(false);
      }
    };

    fetchServices();
  }, [salonId]);

  // Fetch staff
  useEffect(() => {
    if (!salonId) return;

    const fetchStaff = async () => {
      try {
        setLoadingStaff(true);
        const response = await apiClient.get(`/salons/${salonId}/staff`);
        if (response.data.success) {
          setStaff(response.data.data.staff || []);
        }
      } catch (err) {
        toast.error('Failed to load staff');
      } finally {
        setLoadingStaff(false);
      }
    };

    fetchStaff();
  }, [salonId]);

  // Fetch queue status
  useEffect(() => {
    if (!salonId) return;

    const fetchQueueStatus = async () => {
      setQueueLoading(true);
      try {
        const status = await queueApi.getSalonQueue(salonId);
        setQueueStatus(status);
      } catch (err) {
        console.error('Failed to fetch queue status:', err);
      } finally {
        setQueueLoading(false);
      }
    };

    fetchQueueStatus();
  }, [salonId]);

  // Fetch no-show status
  useEffect(() => {
    const fetchNoShowStatus = async () => {
      try {
        const status = await bookingApi.getNoShowStatus();
        setNoShowStatus(status);
      } catch (err) {
        console.error('Failed to fetch no-show status:', err);
      }
    };

    fetchNoShowStatus();
  }, []);

  // Fetch available slots when date or worker changes
  useEffect(() => {
    if (!salonId || !selectedService) return;

    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        setSlotsLoaded(false);
        const dateStr = selectedDate.toISOString().split('T')[0];
        const slots = await bookingApi.getAvailableSlots(
          salonId,
          dateStr,
          selectedWorker?.id,
          selectedService.duration
        );
        setAvailableSlots(slots);
        setSlotsLoaded(true);
      } catch (err) {
        console.error('Failed to load available time slots:', err);
        toast.error('Failed to load available time slots. Please try again.');
        setAvailableSlots([]);
        setSlotsLoaded(true);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [salonId, selectedDate, selectedWorker, selectedService]);

  const handleCreateBooking = async () => {
    if (!salonId || !selectedService || !selectedTime) return;

    try {
      setCreatingBooking(true);
      
      // Prepare guests with priceAmount based on their selected services
      const guestsWithPrices = isGroupBooking && guests.length > 0
        ? guests.map(guest => {
            const guestService = services.find(s => s.id === guest.serviceId);
            return {
              ...guest,
              priceAmount: guestService ? parseFloat(guestService.price) : 0,
            };
          })
        : undefined;
      
      const bookingData: BookingData = {
        salonId,
        serviceId: selectedService.id,
        workerId: selectedWorker?.id,
        date: selectedDate.toISOString(),
        startTime: selectedTime,
        customerNotes: notes || undefined,
        isGroupBooking,
        totalPeople: isGroupBooking ? 1 + guests.length : 1,
        guests: guestsWithPrices,
        billingType: isGroupBooking ? 'combined' : undefined,
      };

      const response = await bookingApi.createBooking(bookingData);
      
      // If cash payment, show success directly
      if (selectedPaymentMethod === 'CASH') {
        setCreatedBooking({
          id: response.id,
          reference: response.reference,
        });
        setCurrentStep('success');
        toast.success('Booking created successfully! Pay at the salon when you arrive.');
        return;
      }
      
      // For mobile money, initialize payment
      setInitializingPayment(true);
      const paymentResponse = await paymentApi.initialize({
        bookingId: response.id,
        provider: selectedPaymentMethod,
        // Prepend +233 country code - phoneNumber state contains only 9 digits
        phoneNumber: `+233${phoneNumber.replace(/\s/g, '').replace(/\D/g, '')}`,
      });
      
      // Store booking info for after payment return
      setCreatedBooking({
        id: response.id,
        reference: response.reference,
        payment: {
          id: response.id, // Will be populated from payment response if available
          reference: paymentResponse.reference,
        },
      });
      
      // Show redirecting overlay before navigating to Paystack
      setPaymentRedirecting(true);
      
      // Redirect to Paystack checkout
      window.location.href = paymentResponse.authorization_url;
      
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Failed to create booking';
      toast.error(message);
    } finally {
      setCreatingBooking(false);
      setInitializingPayment(false);
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'service':
        if (!selectedService) {
          toast.error('Please select a service');
          return;
        }
        setCurrentStep('staff');
        break;
      case 'staff':
        setCurrentStep('group');
        break;
      case 'group':
        // Validate guests if group booking
        if (isGroupBooking && guests.length > 0) {
          const invalidGuest = guests.find(g => !g.guestName || !g.serviceId);
          if (invalidGuest) {
            toast.error('Please fill in all guest names and select services');
            return;
          }
        }
        setCurrentStep('datetime');
        break;
      case 'datetime':
        if (!selectedTime) {
          toast.error('Please select a time slot');
          return;
        }
        setCurrentStep('confirm');
        break;
      case 'confirm':
        handleCreateBooking();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'staff':
        setCurrentStep('service');
        break;
      case 'group':
        setCurrentStep('staff');
        break;
      case 'datetime':
        setCurrentStep('group');
        break;
      case 'confirm':
        setCurrentStep('datetime');
        break;
      default:
        navigate(`/salon/${salonId}`);
    }
  };

  const handleReset = () => {
    setSelectedService(null);
    setSelectedWorker(null);
    setSelectedDate(new Date());
    setSelectedTime(null);
    setNotes('');
    setSelectedPaymentMethod('CASH');
    setPhoneNumber('');
    setCreatedBooking(null);
    setIsGroupBooking(false);
    setGuests([]);
    setTotalPeople(1);
    setCurrentStep('service');
  };

  const totalPrice = useMemo(() => {
    if (!selectedService) return 0;
    let total = parseFloat(selectedService.price);
    // Add guest service prices
    guests.forEach(guest => {
      const guestService = services.find(s => s.id === guest.serviceId);
      if (guestService) {
        total += parseFloat(guestService.price);
      }
    });
    return total;
  }, [selectedService, guests, services]);



  // Use backend slots directly - they are generated based on service duration
  // If no slots loaded yet, show empty array (loading state handled separately)
  const displaySlots = useMemo(() => {
    // Return slots from backend, sorted by start time
    return [...availableSlots].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [availableSlots]);

  // Check if a slot is available - now uses backend slots directly
  const isSlotAvailable = (slot: AvailableSlot): boolean => {
    return slot.available;
  };

  const dates = useMemo(() => getDates(30), []);

  if (loadingSalon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#006B3F] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading salon details...</p>
        </div>
      </div>
    );
  }

  if (error || !salon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error === 'Salon not found' ? 'Salon Not Found' : 'Error Loading Salon'}
          </h2>
          <p className="text-gray-600 mb-6">{error || 'Unable to load salon details'}</p>
          <button
            onClick={() => navigate('/explore')}
            className="px-6 py-2 bg-[#006B3F] text-white rounded-lg hover:bg-[#006B3F]/90 transition-colors"
          >
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  // Progress Steps Component
  const ProgressSteps = () => {
    const steps = [
      { key: 'service', label: 'Service', icon: Scissors },
      { key: 'staff', label: 'Staff', icon: User },
      { key: 'group', label: 'Who\'s Coming', icon: Users },
      { key: 'datetime', label: 'Date & Time', icon: Calendar },
      { key: 'confirm', label: 'Confirm', icon: Check },
    ];

    const currentIndex = steps.findIndex((s) => s.key === currentStep);

    return (
      <div className="bg-white border-b border-gray-200 py-4 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index <= currentIndex;
              const isCurrent = index === currentIndex;

              return (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isCurrent
                          ? 'bg-[#006B3F] text-white'
                          : isActive
                          ? 'bg-[#006B3F]/10 text-[#006B3F]'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-xs mt-1 font-medium ${
                        isCurrent ? 'text-[#006B3F]' : isActive ? 'text-gray-700' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-8 sm:w-16 h-0.5 mx-1 sm:mx-2 ${
                        index < currentIndex ? 'bg-[#006B3F]' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Step 1: Select Service
  const renderServiceStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Select a Service</h2>
        <p className="text-gray-600 mt-1">Choose the service you'd like to book</p>
      </div>

      {/* No-Show Warning Banner - Restricted */}
      {noShowStatus?.restricted && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-800">
              Your account is temporarily restricted due to {noShowStatus.noShowCount} no-shows.
            </p>
            <p className="text-xs text-red-600 mt-1">
              You cannot make new bookings until {noShowStatus.restrictedUntil ? new Date(noShowStatus.restrictedUntil).toLocaleDateString('en-GH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'the restriction is lifted'}.
            </p>
          </div>
        </div>
      )}

      {/* No-Show Warning Banner - Warning (1-2 no-shows) */}
      {!noShowStatus?.restricted && noShowStatus && noShowStatus.noShowCount > 0 && noShowStatus.noShowCount < 3 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-yellow-800">
              You have {noShowStatus.noShowCount} no-show{noShowStatus.noShowCount !== 1 ? 's' : ''}.
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              Please attend your bookings to avoid account restrictions.
            </p>
          </div>
        </div>
      )}

      {/* Queue Info Banner */}
      {queueStatus && queueStatus.totalWaiting > 0 && (
        <div className="bg-ghana-gold/10 border border-ghana-gold/30 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-ghana-gold/20 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-ghana-green" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {queueStatus.totalWaiting} {queueStatus.totalWaiting === 1 ? 'person' : 'people'} currently at this salon
            </p>
            <p className="text-xs text-gray-600">
              Walk-in wait time: ~{queueStatus.averageWait} minutes
            </p>
          </div>
        </div>
      )}

      {loadingServices ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#006B3F] animate-spin" />
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Scissors className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No services available</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => setSelectedService(service)}
              className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                selectedService?.id === service.id
                  ? 'border-[#006B3F] bg-[#006B3F]/5'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    {selectedService?.id === service.id && (
                      <CheckCircle2 className="w-5 h-5 text-[#006B3F]" />
                    )}
                  </div>
                  {service.description && (
                    <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3">
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      {formatDuration(service.duration)}
                    </span>
                    {service.category && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {service.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-[#006B3F]">{formatPrice(service.price)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Step 2: Select Staff
  const renderStaffStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Select Staff</h2>
        <p className="text-gray-600 mt-1">Choose your preferred staff member (optional)</p>
      </div>

      {loadingStaff ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#006B3F] animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Any Available Option */}
          <button
            onClick={() => setSelectedWorker(null)}
            className={`p-4 rounded-xl border-2 transition-all text-center ${
              selectedWorker === null
                ? 'border-[#006B3F] bg-[#006B3F]/5'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div
              className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
                selectedWorker === null ? 'bg-[#006B3F]' : 'bg-gray-100'
              }`}
            >
              <RefreshCw
                className={`w-7 h-7 ${selectedWorker === null ? 'text-white' : 'text-gray-500'}`}
              />
            </div>
            <p className={`font-medium ${selectedWorker === null ? 'text-[#006B3F]' : 'text-gray-900'}`}>
              Any Available
            </p>
            <p className="text-xs text-gray-500 mt-1">We'll assign the best staff</p>
          </button>

          {/* Staff Members */}
          {staff.map((worker) => (
            <button
              key={worker.id}
              onClick={() => setSelectedWorker(worker)}
              className={`p-4 rounded-xl border-2 transition-all text-center ${
                selectedWorker?.id === worker.id
                  ? 'border-[#006B3F] bg-[#006B3F]/5'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div
                className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center overflow-hidden ${
                  selectedWorker?.id === worker.id ? 'bg-[#006B3F]' : 'bg-gray-100'
                }`}
              >
                {worker.avatar ? (
                  <img
                    src={worker.avatar}
                    alt={worker.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User
                    className={`w-7 h-7 ${
                      selectedWorker?.id === worker.id ? 'text-white' : 'text-gray-500'
                    }`}
                  />
                )}
              </div>
              <p
                className={`font-medium truncate ${
                  selectedWorker?.id === worker.id ? 'text-[#006B3F]' : 'text-gray-900'
                }`}
              >
                {worker.fullName}
              </p>
              {worker.specialties && worker.specialties.length > 0 && (
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {worker.specialties.slice(0, 2).join(', ')}
                </p>
              )}
              <div className="flex items-center justify-center gap-1 mt-2">
                <Star className="w-3 h-3 text-[#FCD116] fill-current" />
                <span className="text-xs font-medium">{worker.rating?.toFixed(1) || '0.0'}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Guest management functions
  const addGuest = () => {
    setGuests([...guests, { guestName: '', serviceId: '', guestAgeGroup: 'adult' }]);
    setTotalPeople(2 + guests.length);
  };

  const removeGuest = (index: number) => {
    const newGuests = guests.filter((_, i) => i !== index);
    setGuests(newGuests);
    setTotalPeople(1 + newGuests.length);
  };

  const updateGuest = (index: number, field: keyof BookingGuest, value: string | boolean) => {
    const newGuests = [...guests];
    newGuests[index] = { ...newGuests[index], [field]: value };
    setGuests(newGuests);
  };

  // Step 3: Group Selection
  const renderGroupStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Who's getting services?</h2>
        <p className="text-gray-600 mt-1">Are you booking for yourself or with guests?</p>
      </div>

      {/* Booking Type Selection */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => {
            setIsGroupBooking(false);
            setGuests([]);
            setTotalPeople(1);
          }}
          className={`p-6 rounded-xl border-2 transition-all text-center ${
            !isGroupBooking
              ? 'border-[#006B3F] bg-[#006B3F]/5'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div
            className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
              !isGroupBooking ? 'bg-[#006B3F]' : 'bg-gray-100'
            }`}
          >
            <User className={`w-8 h-8 ${!isGroupBooking ? 'text-white' : 'text-gray-500'}`} />
          </div>
          <p className={`font-semibold ${!isGroupBooking ? 'text-[#006B3F]' : 'text-gray-900'}`}>
            Just Me
          </p>
          <p className="text-xs text-gray-500 mt-1">Book for yourself only</p>
        </button>

        <button
          onClick={() => {
            setIsGroupBooking(true);
            if (guests.length === 0) {
              addGuest();
            }
          }}
          className={`p-6 rounded-xl border-2 transition-all text-center ${
            isGroupBooking
              ? 'border-[#006B3F] bg-[#006B3F]/5'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div
            className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
              isGroupBooking ? 'bg-[#006B3F]' : 'bg-gray-100'
            }`}
          >
            <Users className={`w-8 h-8 ${isGroupBooking ? 'text-white' : 'text-gray-500'}`} />
          </div>
          <p className={`font-semibold ${isGroupBooking ? 'text-[#006B3F]' : 'text-gray-900'}`}>
            With Guests
          </p>
          <p className="text-xs text-gray-500 mt-1">Book for multiple people</p>
        </button>
      </div>

      {/* Guest Forms */}
      {isGroupBooking && (
        <div className="space-y-4">
          {/* Primary (You) */}
          <div className="bg-[#006B3F]/5 rounded-xl p-4 border border-[#006B3F]/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#006B3F] flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">You (Primary)</h3>
            </div>
            <div className="pl-10">
              <p className="text-sm text-gray-600">
                Service: <span className="font-medium text-gray-900">{selectedService?.name}</span>
              </p>
              <p className="text-sm text-gray-600">
                Price: <span className="font-medium text-[#006B3F]">{formatPrice(selectedService?.price || 0)}</span>
              </p>
            </div>
          </div>

          {/* Guest Forms */}
          {guests.map((guest, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-4 border border-gray-200 relative"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Guest {index + 1}</h3>
                </div>
                <button
                  onClick={() => removeGuest(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove guest"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Guest Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Guest Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={guest.guestName}
                    onChange={(e) => updateGuest(index, 'guestName', e.target.value)}
                    placeholder="Enter guest name"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:border-transparent"
                  />
                </div>

                {/* Phone (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={guest.guestPhone || ''}
                    onChange={(e) => updateGuest(index, 'guestPhone', e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:border-transparent"
                  />
                </div>

                {/* Age Group */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age Group
                  </label>
                  <select
                    value={guest.guestAgeGroup || 'adult'}
                    onChange={(e) => {
                      const value = e.target.value as 'child' | 'teen' | 'adult' | 'senior';
                      updateGuest(index, 'guestAgeGroup', value);
                      updateGuest(index, 'isChild', value === 'child');
                    }}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:border-transparent bg-white"
                  >
                    <option value="child">Child (0-12)</option>
                    <option value="teen">Teen (13-19)</option>
                    <option value="adult">Adult (20-64)</option>
                    <option value="senior">Senior (65+)</option>
                  </select>
                </div>

                {/* Service Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={guest.serviceId}
                    onChange={(e) => updateGuest(index, 'serviceId', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:border-transparent bg-white"
                  >
                    <option value="">Select a service</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - {formatPrice(service.price)} ({formatDuration(service.duration)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Special Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Special Instructions <span className="text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    value={guest.specialInstructions || ''}
                    onChange={(e) => updateGuest(index, 'specialInstructions', e.target.value)}
                    placeholder="Any special requests or notes..."
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add Guest Button */}
          <button
            onClick={addGuest}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-[#006B3F] hover:text-[#006B3F] transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Another Guest
          </button>

          {/* Total Count */}
          <div className="text-center py-2">
            <p className="text-sm text-gray-600">
              Total: <span className="font-semibold text-gray-900">{totalPeople} person(s)</span>
              <span className="text-gray-500"> (You + {guests.length} guest{guests.length !== 1 ? 's' : ''})</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // Step 4: Select Date & Time
  const renderDateTimeStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Select Date & Time</h2>
        <p className="text-gray-600 mt-1">Choose when you'd like your appointment</p>
      </div>

      {/* Date Selection */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-[#006B3F]" />
          Select Date
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {dates.map((date, index) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = date.getDate();

            return (
              <button
                key={index}
                onClick={() => {
                  setSelectedDate(date);
                  setSelectedTime(null);
                }}
                className={`flex-shrink-0 w-16 h-20 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'border-[#006B3F] bg-[#006B3F] text-white'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                  {dayName}
                </span>
                <span className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                  {dayNum}
                </span>
                {isToday && (
                  <span
                    className={`text-[10px] mt-0.5 ${isSelected ? 'text-[#FCD116]' : 'text-[#006B3F]'}`}
                  >
                    Today
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Selection */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#006B3F]" />
          Select Time
        </h3>
        {loadingSlots ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-[#006B3F] animate-spin" />
          </div>
        ) : !slotsLoaded ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-[#006B3F] animate-spin" />
          </div>
        ) : displaySlots.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No available time slots for this date</p>
            <p className="text-sm text-gray-400 mt-1">Try selecting a different date or staff member</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {displaySlots.map((slot) => {
              const isAvailable = isSlotAvailable(slot);
              const isSelected = selectedTime === slot.startTime;
              const remainingSpots = slot.remainingSpots ?? (slot.available ? 10 : 0);
              const hasEnoughSpots = remainingSpots >= totalPeople;
              const isDisabled = !isAvailable || remainingSpots === 0 || !hasEnoughSpots;

              // Determine badge color and text based on remaining spots
              // Green (4+), Amber (2-3), Red (1), Disabled (0)
              let badgeColor = '';
              let badgeText = '';
              
              if (remainingSpots === 0) {
                badgeColor = 'bg-red-100 text-red-600';
                badgeText = 'Full';
              } else if (!hasEnoughSpots) {
                // Not enough spots for the group size
                badgeColor = 'bg-red-100 text-red-600';
                badgeText = remainingSpots === 1 ? '1 slot' : `${remainingSpots} slots`;
              } else if (remainingSpots === 1) {
                // Only 1 slot left - RED for urgency
                badgeColor = 'bg-red-100 text-red-600';
                badgeText = '1 slot left';
              } else if (remainingSpots <= 3) {
                // 2-3 slots left - AMBER for low availability
                badgeColor = 'bg-amber-100 text-amber-700';
                badgeText = `${remainingSpots} slots left`;
              } else {
                // 4+ slots - GREEN for good availability
                badgeColor = 'bg-green-100 text-green-700';
                badgeText = `${remainingSpots} slots left`;
              }

              return (
                <button
                  key={slot.startTime}
                  onClick={() => !isDisabled && setSelectedTime(slot.startTime)}
                  disabled={isDisabled}
                  title={!hasEnoughSpots && remainingSpots > 0 ? `Not enough slots for your group of ${totalPeople}. Only ${remainingSpots} available.` : ''}
                  className={`py-3 px-2 rounded-lg text-sm font-medium transition-all relative ${
                    isSelected
                      ? 'bg-[#006B3F] text-white'
                      : isDisabled
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white border border-gray-200 hover:border-[#006B3F] text-gray-700'
                  }`}
                >
                  {formatTime(slot.startTime)}
                  {/* Capacity Badge */}
                  <span
                    className={`absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      isSelected ? 'bg-white/20 text-white' : badgeColor
                    }`}
                  >
                    {isSelected ? (remainingSpots === 1 ? '1 slot left' : `${remainingSpots} slots left`) : badgeText}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // Payment method options
  const paymentMethods = [
    {
      id: 'MTN_MOMO' as PaymentProvider,
      name: 'MTN Mobile Money',
      description: 'Pay with MTN MoMo',
      color: 'bg-[#FFCC00]',
      textColor: 'text-gray-900',
      borderColor: 'border-[#FFCC00]',
      icon: (
        <div className="w-10 h-10 rounded-full bg-[#FFCC00] flex items-center justify-center font-bold text-gray-900 text-xs">
          MTN
        </div>
      ),
    },
    {
      id: 'VODAFONE_CASH' as PaymentProvider,
      name: 'Vodafone Cash',
      description: 'Pay with Vodafone Cash',
      color: 'bg-[#E60000]',
      textColor: 'text-white',
      borderColor: 'border-[#E60000]',
      icon: (
        <div className="w-10 h-10 rounded-full bg-[#E60000] flex items-center justify-center font-bold text-white text-xs">
          VOD
        </div>
      ),
    },
    {
      id: 'AIRTELTIGO_MONEY' as PaymentProvider,
      name: 'AirtelTigo Money',
      description: 'Pay with AirtelTigo',
      color: 'bg-gradient-to-r from-[#E60000] to-[#0066CC]',
      textColor: 'text-white',
      borderColor: 'border-[#0066CC]',
      icon: (
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#E60000] to-[#0066CC] flex items-center justify-center font-bold text-white text-xs">
          AT
        </div>
      ),
    },
    {
      id: 'CASH' as PaymentProvider,
      name: 'Pay at Salon',
      description: 'Pay when you arrive',
      color: 'bg-gray-500',
      textColor: 'text-white',
      borderColor: 'border-gray-400',
      icon: (
        <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      ),
    },
  ];

  // Step 4: Confirm & Book
  const renderConfirmStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Confirm Your Booking</h2>
        <p className="text-gray-600 mt-1">Review your appointment details</p>
      </div>

      {/* Salon Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <img
            src={salon.logo || getDefaultSalonImage(salon.type)}
            alt={salon.businessName}
            className="w-16 h-16 rounded-lg object-cover"
          />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{salon.businessName}</h3>
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{salon.address}</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 text-[#FCD116] fill-current" />
              <span className="text-sm font-medium">{salon.rating?.toFixed(1) || '0.0'}</span>
              <span className="text-sm text-gray-500">({salon.reviewCount || 0} reviews)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Booking Summary</h3>
          {isGroupBooking && (
            <span className="px-2 py-1 bg-[#006B3F]/10 text-[#006B3F] text-xs font-medium rounded-full">
              Group Booking
            </span>
          )}
        </div>

        <div className="space-y-3">
          {/* Primary Service */}
          <div className="flex items-start gap-3">
            <Scissors className="w-5 h-5 text-[#006B3F] mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{selectedService?.name}</p>
              <p className="text-sm text-gray-500">
                {isGroupBooking ? 'You (Primary)' : formatDuration(selectedService?.duration || 0)}
              </p>
            </div>
            <p className="font-semibold text-[#006B3F]">
              {formatPrice(selectedService?.price || 0)}
            </p>
          </div>

          {/* Guest Services */}
          {isGroupBooking && guests.length > 0 && (
            <div className="space-y-2 pl-8 border-l-2 border-gray-100">
              {guests.map((guest, index) => {
                const guestService = services.find(s => s.id === guest.serviceId);
                return (
                  <div key={index} className="flex items-start gap-3">
                    <User className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{guestService?.name || 'Service not selected'}</p>
                      <p className="text-xs text-gray-500">{guest.guestName || `Guest ${index + 1}`}</p>
                    </div>
                    <p className="font-semibold text-[#006B3F] text-sm">
                      {formatPrice(guestService?.price || 0)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-[#006B3F] mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">
                {selectedWorker?.fullName || 'Any Available Staff'}
              </p>
              <p className="text-sm text-gray-500">
                {selectedWorker ? 'Preferred staff member' : 'Best available staff'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-[#006B3F] mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">
                {formatDate(selectedDate.toISOString())}
              </p>
              <p className="text-sm text-gray-500">{formatTime(selectedTime || '')}</p>
            </div>
          </div>

          {isGroupBooking && (
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-[#006B3F] mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">
                  {totalPeople} {totalPeople === 1 ? 'person' : 'people'}
                </p>
                <p className="text-sm text-gray-500">
                  You + {guests.length} guest{guests.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4 space-y-3">
          {/* Fee Breakdown */}
          <div className="space-y-2">
            {/* Service price(s) */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {selectedService?.name} {isGroupBooking && guests.length > 0 ? '(You)' : ''}
              </span>
              <span className="text-gray-900">{formatPrice(selectedService?.price || 0)}</span>
            </div>
            
            {/* Guest services */}
            {isGroupBooking && guests.length > 0 && guests.map((guest, index) => {
              const guestService = services.find(s => s.id === guest.serviceId);
              return (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {guestService?.name || 'Service'} ({guest.guestName || `Guest ${index + 1}`})
                  </span>
                  <span className="text-gray-900">{formatPrice(guestService?.price || 0)}</span>
                </div>
              );
            })}
            
            {/* Platform fee */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 flex items-center gap-1">
                Platform fee
                <span className="text-xs text-gray-400">({platformFeePercentage}%)</span>
              </span>
              <span className="text-gray-900">{formatPrice(totalPrice * (platformFeePercentage / 100))}</span>
            </div>
          </div>
          
          {/* Total */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div>
              <span className="text-gray-900 font-semibold">Total Amount</span>
              {isGroupBooking && (
                <p className="text-xs text-gray-500">Combined billing for all services</p>
              )}
            </div>
            <span className="text-2xl font-bold text-[#006B3F]">{formatPrice(totalPrice * (1 + platformFeePercentage / 100))}</span>
          </div>
          
          {/* Security info */}
          <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Your payment is held securely until your service is completed</span>
          </div>
          
          {/* Cancellation policy */}
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Free cancellation up to 48 hours before. Partial refunds apply for later cancellations.</span>
          </div>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-[#006B3F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Select Payment Method
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => setSelectedPaymentMethod(method.id)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                selectedPaymentMethod === method.id
                  ? `${method.borderColor} bg-gray-50 ring-1 ring-[#006B3F]`
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {method.icon}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{method.name}</p>
                <p className="text-xs text-gray-500">{method.description}</p>
              </div>
              {selectedPaymentMethod === method.id && (
                <div className="w-5 h-5 rounded-full bg-[#006B3F] flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Phone Number Input for Mobile Money */}
      {selectedPaymentMethod !== 'CASH' && (
        <div className="bg-[#006B3F]/5 rounded-xl p-4">
          <label className="block font-medium text-gray-900 mb-2">
            Mobile Money Number
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
              +233
            </span>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                // Only allow digits and limit to 9 digits (Ghana format)
                const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                setPhoneNumber(value);
              }}
              placeholder="XX XXX XXXX"
              className="w-full pl-14 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:border-transparent"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Enter your mobile money number without the country code. You will receive a prompt to authorize the payment.
          </p>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="flex items-center gap-2 font-medium text-gray-900 mb-2">
          <FileText className="w-5 h-5 text-[#006B3F]" />
          Additional Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any special requests or notes for the salon..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:border-transparent resize-none"
        />
      </div>
    </div>
  );

  // Step 6: Success
  const renderSuccessStep = () => (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-[#006B3F]/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-12 h-12 text-[#006B3F]" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {isGroupBooking ? 'Group Booking Confirmed!' : 'Booking Confirmed!'}
      </h2>
      <p className="text-gray-600 mb-2">
        {selectedPaymentMethod === 'CASH' 
          ? "Your appointment has been booked. Please pay at the salon when you arrive."
          : "Your appointment has been successfully booked. We've sent a confirmation to your phone."}
      </p>
      {isGroupBooking && (
        <p className="text-[#006B3F] font-medium mb-6">
          {totalPeople} people booked
        </p>
      )}

      <div className="bg-[#006B3F]/5 rounded-xl p-6 mb-8">
        <p className="text-sm text-gray-600 mb-1">
          {isGroupBooking ? 'Group Reference' : 'Booking Reference'}
        </p>
        <p className="text-3xl font-bold text-[#006B3F] tracking-wider">
          {createdBooking?.reference}
        </p>
      </div>

      {selectedPaymentMethod === 'CASH' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">Payment:</span> You have selected to pay at the salon. 
            Please arrive 10 minutes early and pay <span className="font-semibold">{formatPrice(totalPrice)}</span> at the reception.
            {isGroupBooking && (
              <span className="block mt-1">This covers all {totalPeople} people in your group.</span>
            )}
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => navigate('/bookings')}
          className="px-6 py-3 bg-[#006B3F] text-white font-medium rounded-lg hover:bg-[#006B3F]/90 transition-colors flex items-center justify-center gap-2"
        >
          <Calendar className="w-5 h-5" />
          View My Bookings
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Book Another
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-900">Book Appointment</h1>
              <p className="text-sm text-gray-500 truncate">{salon.businessName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      {currentStep !== 'success' && <ProgressSteps />}

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {currentStep === 'service' && renderServiceStep()}
          {currentStep === 'staff' && renderStaffStep()}
          {currentStep === 'group' && renderGroupStep()}
          {currentStep === 'datetime' && renderDateTimeStep()}
          {currentStep === 'confirm' && renderConfirmStep()}
          {currentStep === 'success' && renderSuccessStep()}
        </div>

        {/* Navigation Buttons */}
        {currentStep !== 'success' && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={
                (currentStep === 'service' && !selectedService) ||
                (currentStep === 'datetime' && !selectedTime) ||
                (currentStep === 'confirm' && selectedPaymentMethod !== 'CASH' && phoneNumber.length < 9) ||
                creatingBooking ||
                initializingPayment
              }
              className="flex items-center gap-2 px-8 py-3 bg-[#006B3F] text-white font-medium rounded-lg hover:bg-[#006B3F]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingBooking || initializingPayment ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {initializingPayment ? 'Processing Payment...' : 'Booking...'}
                </>
              ) : currentStep === 'confirm' ? (
                <>
                  {selectedPaymentMethod === 'CASH' ? 'Confirm Booking' : 'Confirm & Pay'}
                  <Check className="w-5 h-5" />
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Payment Redirect Overlay */}
      {paymentRedirecting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
            <div className="w-20 h-20 bg-[#006B3F]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-[#006B3F] animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Redirecting to Payment...
            </h3>
            <p className="text-gray-600 mb-4">
              Please authorize the payment prompt on your phone
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-[#006B3F] rounded-full animate-pulse" />
              <span>Connecting to Paystack...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

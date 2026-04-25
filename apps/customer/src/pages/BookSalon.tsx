import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Icon from '../components/Icon';
import apiClient, { bookingApi, paymentApi, queueApi, QueueStatus, BookingGuest, NoShowStatus, waitlistApi, WaitlistEntry } from '../lib/api';

// Types
interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  duration: number;
  price: string;
  discountPrice?: string | null;
  promoLabel?: string | null;
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

type PaymentProvider = 'MTN_MOMO' | 'VODAFONE_CASH' | 'AIRTELTIGO_MONEY';



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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentProvider>('MTN_MOMO');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [initializingPayment, setInitializingPayment] = useState(false);

  // Queue state
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [_queueLoading, setQueueLoading] = useState(false);

  // No-show status state
  const [noShowStatus, setNoShowStatus] = useState<NoShowStatus | null>(null);

  // Group booking state
  const [isGroupBooking, setIsGroupBooking] = useState(false);
  const [guests, setGuests] = useState<BookingGuest[]>([]);
  const [totalPeople, setTotalPeople] = useState(1);

  // Platform fee state
  const [platformFeePercentage, setPlatformFeePercentage] = useState(5); // Default 5%

  // Waitlist state
  const [myWaitlistEntries, setMyWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);

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
          setServices(response.data?.data?.services || response.data?.data || []);
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
          setStaff(response.data?.data?.staff || response.data?.data || []);
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

  // Fetch my waitlist entries for this salon
  useEffect(() => {
    if (!salonId) return;

    const fetchWaitlist = async () => {
      try {
        const entries = await waitlistApi.getMyWaitlist();
        // Filter entries for current salon
        const salonEntries = entries.filter(entry => entry.salonId === salonId);
        setMyWaitlistEntries(salonEntries);
      } catch (err) {
        // User might not be logged in, ignore error
        console.log('Could not fetch waitlist entries');
        setMyWaitlistEntries([]);
      }
    };

    fetchWaitlist();
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
      
      // Initialize payment via Hubtel
      setInitializingPayment(true);
      const paymentResponse = await paymentApi.initialize({
        bookingId: response.id,
        provider: selectedPaymentMethod,
        // Prepend +233 country code - phoneNumber state contains only 9 digits
        phoneNumber: `+233${phoneNumber.replace(/\s/g, '').replace(/\D/g, '')}`,
      });
      
      // Navigate to the payment polling page with the client reference
      // Hubtel flow: customer gets USSD/STK prompt on phone, we poll for confirmation
      navigate(`/payment/callback?reference=${paymentResponse.clientReference}`);
      
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
    setSelectedPaymentMethod('MTN_MOMO');
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

  // Waitlist helper functions
  const isOnWaitlist = (date: string, timeSlot: string, staffId?: string): WaitlistEntry | undefined => {
    return myWaitlistEntries.find(entry =>
      entry.date === date &&
      entry.timeSlot === timeSlot &&
      (staffId ? entry.staffId === staffId : !entry.staffId)
    );
  };

  const handleJoinWaitlist = async (date: string, timeSlot: string, staffId?: string) => {
    if (!salonId) return;
    setJoiningWaitlist(true);
    try {
      const entry = await waitlistApi.joinWaitlist({
        salonId,
        staffId,
        date,
        timeSlot
      });
      setMyWaitlistEntries(prev => [...prev, entry]);
      toast.success('You\'ve joined the waitlist! We\'ll notify you if a slot opens up.');
    } catch (err: any) {
      if (err.response?.status === 401) {
        toast.error('Please log in to join the waitlist');
      } else {
        toast.error(err.response?.data?.error?.message || 'Failed to join waitlist');
      }
    } finally {
      setJoiningWaitlist(false);
    }
  };

  const handleLeaveWaitlist = async (waitlistId: string) => {
    try {
      await waitlistApi.leaveWaitlist(waitlistId);
      setMyWaitlistEntries(prev => prev.filter(entry => entry.id !== waitlistId));
      toast.success('You\'ve left the waitlist');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to leave waitlist');
    }
  };

  const dates = useMemo(() => getDates(30), []);

  if (loadingSalon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Icon name="progress_activity" size={48} className="text-[#006B3F] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading salon details...</p>
        </div>
      </div>
    );
  }

  if (error || !salon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <Icon name="error" size={64} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error === 'Salon not found' ? 'Salon Not Found' : 'Error Loading Salon'}
          </h2>
          <p className="text-gray-600 mb-6">{error || 'Unable to load salon details'}</p>
          <button
            onClick={() => navigate('/explore')}
            className="px-6 py-2 bg-[#CE1126] text-white rounded-xl hover:bg-[#CE1126]/90 transition-colors"
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
      { key: 'service', label: 'Service', iconName: 'content_cut' },
      { key: 'staff', label: 'Staff', iconName: 'person' },
      { key: 'group', label: 'Group', iconName: 'group' },
      { key: 'datetime', label: 'Date/Time', iconName: 'calendar_today' },
      { key: 'confirm', label: 'Confirm', iconName: 'check_circle' },
    ];
  
    const currentIndex = steps.findIndex((s) => s.key === currentStep);
  
    return (
      <div className="bg-white border-b border-gray-100 py-4 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;
  
              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-[#CE1126] text-white shadow-card'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Icon name="check" size={20} />
                      ) : (
                        <Icon name={step.iconName} size={20} />
                      )}
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs mt-1.5 font-medium text-center whitespace-nowrap ${
                        isCompleted
                          ? 'text-green-600'
                          : isCurrent
                          ? 'text-[#CE1126]'
                          : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 sm:mx-3 rounded-full transition-colors duration-300 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
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
            <Icon name="error" size={20} className="text-red-600" />
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
            <Icon name="error" size={20} className="text-yellow-600" />
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
            <Icon name="group" size={20} className="text-ghana-green" />
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
          <div className="space-y-4 w-full">
            <div className="skeleton-shimmer h-20 w-full rounded-xl" />
            <div className="skeleton-shimmer h-20 w-full rounded-xl" />
            <div className="skeleton-shimmer h-20 w-full rounded-xl" />
          </div>
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Icon name="content_cut" size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No services available</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => setSelectedService(service)}
              className={`card-v2 w-full text-left p-5 border-2 transition-all duration-200 ${
                selectedService?.id === service.id
                  ? 'border-[#CE1126] bg-[#CE1126]/5'
                  : 'border-transparent hover:border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    {selectedService?.id === service.id && (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#CE1126]">
                        <Icon name="check" size={14} className="text-white" />
                      </span>
                    )}
                    {service.promoLabel && (
                      <span className="px-2 py-0.5 bg-ghana-gold/20 text-amber-700 text-xs font-medium rounded-full">
                        {service.promoLabel}
                      </span>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3">
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <Icon name="schedule" size={16} />
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
                  {service.discountPrice && parseFloat(service.discountPrice) > 0 ? (
                    <div>
                      <p className="text-sm text-gray-400 line-through">{formatPrice(service.price)}</p>
                      <p className="text-xl font-bold text-[#CE1126]">{formatPrice(service.discountPrice)}</p>
                    </div>
                  ) : (
                    <p className="text-xl font-bold text-[#CE1126]">{formatPrice(service.price)}</p>
                  )}
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
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Select Staff</h2>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Choose your preferred staff member (optional)</p>
      </div>

      {loadingStaff ? (
        <div className="flex items-center justify-center py-12">
          <div className="space-y-4 w-full">
            <div className="flex gap-4 justify-center">
              <div className="skeleton-shimmer h-28 w-24 rounded-xl" />
              <div className="skeleton-shimmer h-28 w-24 rounded-xl" />
              <div className="skeleton-shimmer h-28 w-24 rounded-xl" />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Any Available Option */}
          <button
            onClick={() => setSelectedWorker(null)}
            className={`p-4 rounded-2xl border-2 transition-all duration-200 text-center ${
              selectedWorker === null
                ? 'border-[#CE1126] bg-[#CE1126]/5'
                : 'border-transparent card-v2 hover:border-gray-200'
            }`}
          >
            <div
              className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ring-2 ring-offset-2 transition-all ${
                selectedWorker === null ? 'ring-[#CE1126] bg-[#CE1126]/10' : 'ring-transparent bg-gray-100'
              }`}
            >
              <Icon name="refresh" size={28} className={selectedWorker === null ? 'text-[#CE1126]' : 'text-gray-500'} />
            </div>
            <p className={`font-semibold ${selectedWorker === null ? 'text-[#CE1126]' : 'text-gray-900'}`}>
              Any Available
            </p>
            <p className="text-xs text-gray-500 mt-1">We'll assign the best staff</p>
          </button>

          {/* Staff Members */}
          {staff.map((worker) => (
            <button
              key={worker.id}
              onClick={() => setSelectedWorker(worker)}
              className={`p-4 rounded-2xl border-2 transition-all duration-200 text-center ${
                selectedWorker?.id === worker.id
                  ? 'border-[#CE1126] bg-[#CE1126]/5'
                  : 'border-transparent card-v2 hover:border-gray-200'
              }`}
            >
              <div
                className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center overflow-hidden ring-2 ring-offset-2 transition-all ${
                  selectedWorker?.id === worker.id ? 'ring-[#CE1126]' : 'ring-transparent'
                }`}
              >
                {worker.avatar ? (
                  <img
                    src={worker.avatar}
                    alt={worker.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Icon name="person" size={28} className={
                      selectedWorker?.id === worker.id ? 'text-[#CE1126]' : 'text-gray-500'
                    } />
                )}
              </div>
              <p
                className={`font-semibold truncate ${
                  selectedWorker?.id === worker.id ? 'text-[#CE1126]' : 'text-gray-900'
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
                <Icon name="star" size={12} filled className="text-[#FCD116]" />
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
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Who's getting services?</h2>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Are you booking for yourself or with guests?</p>
      </div>

      {/* Booking Type Selection */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={() => {
            setIsGroupBooking(false);
            setGuests([]);
            setTotalPeople(1);
          }}
          className={`p-6 rounded-2xl border-2 transition-all duration-200 text-center ${
            !isGroupBooking
              ? 'border-[#CE1126] bg-[#CE1126]/5'
              : 'border-transparent card-v2 hover:border-gray-200'
          }`}
        >
          <div
            className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
              !isGroupBooking ? 'bg-[#CE1126]/10' : 'bg-gray-100'
            }`}
          >
            <Icon name="person" size={32} className={!isGroupBooking ? 'text-[#CE1126]' : 'text-gray-500'} />
          </div>
          <p className={`font-semibold ${!isGroupBooking ? 'text-[#CE1126]' : 'text-gray-900'}`}>
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
          className={`p-6 rounded-2xl border-2 transition-all duration-200 text-center ${
            isGroupBooking
              ? 'border-[#CE1126] bg-[#CE1126]/5'
              : 'border-transparent card-v2 hover:border-gray-200'
          }`}
        >
          <div
            className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
              isGroupBooking ? 'bg-[#CE1126]/10' : 'bg-gray-100'
            }`}
          >
            <Icon name="group" size={32} className={isGroupBooking ? 'text-[#CE1126]' : 'text-gray-500'} />
          </div>
          <p className={`font-semibold ${isGroupBooking ? 'text-[#CE1126]' : 'text-gray-900'}`}>
            With Guests
          </p>
          <p className="text-xs text-gray-500 mt-1">Book for multiple people</p>
        </button>
      </div>

      {/* Guest Forms */}
      {isGroupBooking && (
        <div className="space-y-4">
          {/* Primary (You) */}
          <div className="card-v2 p-4 border-l-4 border-l-[#CE1126]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#CE1126] flex items-center justify-center">
                <Icon name="person" size={16} className="text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">You (Primary)</h3>
            </div>
            <div className="pl-10">
              <p className="text-sm text-gray-600">
                Service: <span className="font-medium text-gray-900">{selectedService?.name}</span>
              </p>
              <p className="text-sm text-gray-600">
                Price: <span className="font-medium text-[#CE1126]">{formatPrice(selectedService?.price || 0)}</span>
              </p>
            </div>
          </div>

          {/* Guest Forms */}
          {guests.map((guest, index) => (
            <div
              key={index}
              className="card-v2 p-4 relative"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Icon name="person" size={16} className="text-gray-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Guest {index + 1}</h3>
                </div>
                <button
                  onClick={() => removeGuest(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  title="Remove guest"
                >
                  <Icon name="close" size={18} />
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
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CE1126] focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CE1126] focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CE1126] focus:border-transparent bg-white"
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
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CE1126] focus:border-transparent bg-white"
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
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CE1126] focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add Guest Button */}
          <button
            onClick={addGuest}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-[#CE1126] hover:text-[#CE1126] transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="add" size={20} />
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
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Select Date & Time</h2>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Choose when you'd like your appointment</p>
      </div>

      {/* Date Selection */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
          <Icon name="calendar_month" size={16} className="text-[#006B3F]" />
          Select Date
        </h3>
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
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
                className={`flex-shrink-0 w-16 h-20 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-200 ${
                  isSelected
                    ? 'border-[#CE1126] bg-[#CE1126] text-white'
                    : 'border-gray-200 bg-white hover:border-gray-300 shadow-card'
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
                    className={`text-[10px] mt-0.5 font-medium ${isSelected ? 'text-ghana-gold' : 'text-[#CE1126]'}`}
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
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
          <Icon name="schedule" size={20} className="text-[#006B3F]" />
          Select Time
        </h3>
        {loadingSlots ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="progress_activity" size={32} className="text-[#006B3F] animate-spin" />
          </div>
        ) : !slotsLoaded ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="progress_activity" size={32} className="text-[#006B3F] animate-spin" />
          </div>
        ) : displaySlots.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <Icon name="schedule" size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No available time slots for this date</p>
            <p className="text-sm text-gray-400 mt-1">Try selecting a different date or staff member</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {displaySlots.map((slot) => {
              const isAvailable = isSlotAvailable(slot);
              const isSelected = selectedTime === slot.startTime;
              const remainingSpots = slot.remainingSpots ?? (slot.available ? 10 : 0);
              const hasEnoughSpots = remainingSpots >= totalPeople;
              const isFullyBooked = remainingSpots === 0;
              const isDisabled = !isAvailable || (remainingSpots === 0) || !hasEnoughSpots;

              // Check if user is on waitlist for this slot
              const dateStr = selectedDate.toISOString().split('T')[0];
              const waitlistEntry = isOnWaitlist(dateStr, slot.startTime, selectedWorker?.id);
              const isOnWaitlistForSlot = !!waitlistEntry;


              // Fully booked slot with waitlist option
              if (isFullyBooked) {
                return (
                  <div key={slot.startTime} className="relative">
                    <div className="py-3 px-2 rounded-full text-sm font-medium bg-gray-100 text-gray-400 text-center line-through">
                      {formatTime(slot.startTime)}
                    </div>
                    {/* Waitlist button */}
                    {isOnWaitlistForSlot ? (
                      <button
                        onClick={() => waitlistEntry && handleLeaveWaitlist(waitlistEntry.id)}
                        disabled={joiningWaitlist}
                        className="mt-1 w-full py-1.5 px-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-full transition-colors flex items-center justify-center gap-1"
                      >
                        <Icon name="notifications" size={12} />
                        On waitlist
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinWaitlist(dateStr, slot.startTime, selectedWorker?.id)}
                        disabled={joiningWaitlist}
                        className="mt-1 w-full py-1.5 px-1 bg-[#CE1126] hover:bg-[#CE1126]/90 text-white text-xs font-medium rounded-full transition-colors flex items-center justify-center gap-1"
                      >
                        {joiningWaitlist ? (
                          <Icon name="progress_activity" size={12} className="animate-spin" />
                        ) : (
                          <Icon name="notifications" size={12} />
                        )}
                        Join waitlist
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={slot.startTime}
                  onClick={() => !isDisabled && setSelectedTime(slot.startTime)}
                  disabled={isDisabled}
                  title={!hasEnoughSpots && remainingSpots > 0 ? `Not enough slots for your group of ${totalPeople}. Only ${remainingSpots} available.` : ''}
                  className={`py-2.5 px-3 rounded-full text-sm font-medium transition-all duration-200 relative ${
                    isSelected
                      ? 'bg-[#CE1126] text-white shadow-card'
                      : isDisabled
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                      : 'bg-white border border-gray-200 hover:border-[#CE1126] text-gray-700'
                  }`}
                >
                  {formatTime(slot.startTime)}
                  {/* Capacity Badge */}
                  {remainingSpots <= 3 && remainingSpots > 0 && !isSelected && (
                    <span
                      className={`ml-1 text-[10px] font-medium ${remainingSpots === 1 ? 'text-red-500' : 'text-amber-600'}`}
                    >
                      ({remainingSpots})
                    </span>
                  )}
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
  ];

  // Step 4: Confirm & Book
  const renderConfirmStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Confirm Your Booking</h2>
        <p className="text-gray-600 mt-1">Review your appointment details</p>
      </div>

      {/* Salon Info */}
      <div className="card-v2 shadow-elevated p-4">
        <div className="flex items-center gap-4">
          <img
            src={salon.logo || getDefaultSalonImage(salon.type)}
            alt={salon.businessName}
            className="w-14 h-14 rounded-xl object-cover"
          />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{salon.businessName}</h3>
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <Icon name="location_on" size={14} />
              <span className="truncate">{salon.address}</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Icon name="star" size={14} filled className="text-ghana-gold" />
              <span className="text-sm font-medium">{salon.rating?.toFixed(1) || '0.0'}</span>
              <span className="text-sm text-gray-500">({salon.reviewCount || 0})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Summary */}
      <div className="card-v2 shadow-elevated p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Booking Summary</h3>
          {isGroupBooking && (
            <span className="px-2.5 py-1 bg-[#CE1126]/10 text-[#CE1126] text-xs font-semibold rounded-full">
              Group Booking
            </span>
          )}
        </div>

        <div className="space-y-3">
          {/* Primary Service */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#CE1126]/10 flex items-center justify-center flex-shrink-0">
              <Icon name="content_cut" size={16} className="text-[#CE1126]" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{selectedService?.name}</p>
              <p className="text-sm text-gray-500">
                {isGroupBooking ? 'You (Primary)' : formatDuration(selectedService?.duration || 0)}
              </p>
            </div>
            <p className="font-bold text-[#CE1126]">
              {formatPrice(selectedService?.price || 0)}
            </p>
          </div>

          {/* Guest Services */}
          {isGroupBooking && guests.length > 0 && (
            <div className="space-y-2 pl-11 border-l-2 border-gray-100">
              {guests.map((guest, index) => {
                const guestService = services.find(s => s.id === guest.serviceId);
                return (
                  <div key={index} className="flex items-start gap-3">
                    <Icon name="person" size={14} className="text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{guestService?.name || 'Service not selected'}</p>
                      <p className="text-xs text-gray-500">{guest.guestName || `Guest ${index + 1}`}</p>
                    </div>
                    <p className="font-semibold text-[#CE1126] text-sm">
                      {formatPrice(guestService?.price || 0)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#CE1126]/10 flex items-center justify-center flex-shrink-0">
              <Icon name="person" size={16} className="text-[#CE1126]" />
            </div>
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
            <div className="w-8 h-8 rounded-lg bg-[#CE1126]/10 flex items-center justify-center flex-shrink-0">
              <Icon name="calendar_today" size={16} className="text-[#CE1126]" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {formatDate(selectedDate.toISOString())}
              </p>
              <p className="text-sm text-gray-500">{formatTime(selectedTime || '')}</p>
            </div>
          </div>

          {isGroupBooking && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#CE1126]/10 flex items-center justify-center flex-shrink-0">
                <Icon name="group" size={16} className="text-[#CE1126]" />
              </div>
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
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div>
              <span className="text-gray-900 font-semibold">Total Amount</span>
              {isGroupBooking && (
                <p className="text-xs text-gray-500">Combined billing for all services</p>
              )}
            </div>
            <span className="text-2xl font-bold text-[#CE1126]">{formatPrice(totalPrice * (1 + platformFeePercentage / 100))}</span>
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
              className={`card-v2 flex items-center gap-3 p-4 border-2 transition-all duration-200 text-left ${
                selectedPaymentMethod === method.id
                  ? `border-[#CE1126] ring-1 ring-[#CE1126]/20`
                  : 'border-transparent hover:border-gray-200'
              }`}
            >
              {method.icon}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{method.name}</p>
                <p className="text-xs text-gray-500">{method.description}</p>
              </div>
              {selectedPaymentMethod === method.id && (
                <div className="w-5 h-5 rounded-full bg-[#CE1126] flex items-center justify-center flex-shrink-0">
                  <Icon name="check" size={12} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Phone Number Input for Mobile Money */}
      {(
        <div className="card-v2 p-4">
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
              className="w-full pl-14 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#CE1126] focus:border-transparent"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Enter your mobile money number. You'll receive a prompt on your phone to authorize the payment.
          </p>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="flex items-center gap-2 font-medium text-gray-900 mb-2">
          <Icon name="description" size={20} className="text-[#006B3F]" />
          Additional Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any special requests or notes for the salon..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#CE1126] focus:border-transparent resize-none"
        />
      </div>
    </div>
  );

  // Step 6: Success
  const renderSuccessStep = () => (
    <div className="text-center py-8 animate-fade-in-up">
      {/* Confetti-like decorative dots */}
      <div className="relative inline-block">
        <div className="absolute -top-4 -left-6 w-3 h-3 rounded-full bg-[#CE1126]/30 animate-scale-in" style={{animationDelay: '0.1s'}} />
        <div className="absolute -top-2 -right-8 w-2 h-2 rounded-full bg-ghana-gold/40 animate-scale-in" style={{animationDelay: '0.2s'}} />
        <div className="absolute top-4 -left-10 w-2 h-2 rounded-full bg-ghana-green/30 animate-scale-in" style={{animationDelay: '0.3s'}} />
        <div className="absolute -top-6 right-2 w-3 h-3 rounded-full bg-ghana-gold/30 animate-scale-in" style={{animationDelay: '0.4s'}} />
        <div className="absolute top-8 -right-6 w-2 h-2 rounded-full bg-[#CE1126]/20 animate-scale-in" style={{animationDelay: '0.5s'}} />

        {/* Large checkmark */}
        <div className="w-24 h-24 bg-[#CE1126]/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-scale-in">
          <Icon name="check_circle" size={56} filled className="text-[#CE1126]" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {isGroupBooking ? 'Group Booking Confirmed!' : 'Booking Confirmed!'}
      </h2>
      <p className="text-gray-600 mb-2">
        Your appointment has been successfully booked. We've sent a confirmation to your phone.
      </p>
      {isGroupBooking && (
        <p className="text-[#CE1126] font-semibold mb-6">
          {totalPeople} people booked
        </p>
      )}

      <div className="card-v2 shadow-elevated p-6 mb-8 mx-auto max-w-sm">
        <p className="text-sm text-gray-600 mb-1">
          {isGroupBooking ? 'Group Reference' : 'Booking Reference'}
        </p>
        <p className="text-3xl font-bold text-[#CE1126] tracking-wider">
          {createdBooking?.reference}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => navigate('/bookings')}
          className="px-6 py-3 bg-[#CE1126] text-white font-medium rounded-xl hover:bg-[#CE1126]/90 transition-colors flex items-center justify-center gap-2 shadow-card"
        >
          <Icon name="calendar_today" size={20} />
          View My Bookings
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-3 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <Icon name="refresh" size={20} />
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
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Icon name="arrow_back" size={20} />
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
        <div className="card-v2 p-6">
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
              className="flex items-center gap-2 px-6 py-3 border-2 border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 font-medium rounded-xl transition-colors"
            >
              <Icon name="chevron_left" size={20} />
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={
                (currentStep === 'service' && !selectedService) ||
                (currentStep === 'datetime' && !selectedTime) ||
                (currentStep === 'confirm' && phoneNumber.length < 9) ||
                creatingBooking ||
                initializingPayment
              }
              className="flex items-center gap-2 px-8 py-3 bg-[#CE1126] text-white font-medium rounded-xl hover:bg-[#CE1126]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-card"
            >
              {creatingBooking || initializingPayment ? (
                <>
                  <Icon name="progress_activity" size={20} className="animate-spin" />
                  {initializingPayment ? 'Processing Payment...' : 'Booking...'}
                </>
              ) : currentStep === 'confirm' ? (
                <>
                  Confirm & Pay
                  <Icon name="check" size={20} />
                </>
              ) : (
                <>
                  Continue
                  <Icon name="chevron_right" size={20} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

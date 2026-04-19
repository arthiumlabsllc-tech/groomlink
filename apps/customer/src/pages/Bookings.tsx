import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import RateBookingModal from '../components/RateBookingModal'
import toast from 'react-hot-toast'
import { bookingApi, Booking, RefundPreview, QueuePositionResponse } from '../lib/api'

// Constants
const PENDING_BOOKING_TIMEOUT_MINUTES = 30

/**
 * Countdown timer component for pending bookings
 * Shows time remaining before auto-cancellation
 */
function PendingBookingCountdown({ createdAt }: { createdAt: string }) {
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [isExpired, setIsExpired] = useState(false)
  const [minutesLeft, setMinutesLeft] = useState(30)

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const created = new Date(createdAt).getTime()
      const expiryTime = created + PENDING_BOOKING_TIMEOUT_MINUTES * 60 * 1000
      const now = Date.now()
      const diff = expiryTime - now

      if (diff <= 0) {
        setIsExpired(true)
        setTimeRemaining('Expiring...')
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setMinutesLeft(minutes)
      setTimeRemaining(`${minutes}m ${seconds.toString().padStart(2, '0')}s`)
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [createdAt])

  const isUrgent = minutesLeft < 5 && !isExpired

  if (isExpired) {
    return (
      <div className="flex items-center gap-2 mt-3">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-red-100 text-red-700 rounded-full">
          <Icon name="timer" size={16} />
          Expiring soon...
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-3">
      <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-semibold ${
        isUrgent 
          ? 'bg-red-100 text-red-700 animate-pulse' 
          : 'bg-amber-100 text-amber-700'
      }`}>
        <Icon name="timer" size={isUrgent ? 20 : 18} className={isUrgent ? 'animate-pulse' : ''} />
        <span className="text-sm">
          Complete payment in: <span className={`${isUrgent ? 'text-lg font-bold' : 'font-medium'}`}>{timeRemaining}</span>
        </span>
      </span>
    </div>
  )
}

const GEOFENCE_RADIUS_METERS = 100
const CHECKIN_PROMPTED_KEY = 'groomlink_auto_checkin_prompted'

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Check if a booking is for today
 */
function isBookingToday(booking: Booking): boolean {
  const bookingDate = new Date(booking.date)
  const today = new Date()
  return (
    bookingDate.getFullYear() === today.getFullYear() &&
    bookingDate.getMonth() === today.getMonth() &&
    bookingDate.getDate() === today.getDate()
  )
}

/**
 * Get prompted bookings from localStorage
 */
function getPromptedBookings(): Set<string> {
  try {
    const data = localStorage.getItem(CHECKIN_PROMPTED_KEY)
    if (data) {
      return new Set(JSON.parse(data))
    }
  } catch {
    // Ignore errors
  }
  return new Set()
}

/**
 * Mark a booking as prompted
 */
function markBookingAsPrompted(bookingId: string): void {
  try {
    const prompted = getPromptedBookings()
    prompted.add(bookingId)
    const entries = Array.from(prompted).slice(-50)
    localStorage.setItem(CHECKIN_PROMPTED_KEY, JSON.stringify(entries))
  } catch {
    // Ignore errors
  }
}

type Tab = 'upcoming' | 'past' | 'cancelled'

// Status mapping for API queries
const statusMap: Record<Tab, string> = {
  upcoming: 'CONFIRMED',
  past: 'COMPLETED',
  cancelled: 'CANCELLED'
}

// Status badge colors - Ghana flag inspired
const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-orange-100 text-orange-800'
}

// Status display labels
const statusLabels: Record<string, string> = {
  PENDING: 'Awaiting Payment',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show'
}

export default function Bookings() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('upcoming')
  const [bookings, setBookings] = useState<Record<Tab, Booking[]>>({
    upcoming: [],
    past: [],
    cancelled: []
  })
  const [counts, setCounts] = useState<Record<Tab, number>>({
    upcoming: 0,
    past: 0,
    cancelled: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [cancelling, setCancelling] = useState(false)
  
  // Cancellation modal states
  const [showCancellationModal, setShowCancellationModal] = useState(false)
  const [refundPreview, setRefundPreview] = useState<RefundPreview | null>(null)
  const [loadingRefundPreview, setLoadingRefundPreview] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  
  // Reschedule modal states
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduling, setRescheduling] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // QR code modal states
  const [showQRCodeModal, setShowQRCodeModal] = useState(false)
  const [qrCodeData, setQRCodeData] = useState<string | null>(null)
  const [loadingQRCode, setLoadingQRCode] = useState(false)

  // Queue position data for bookings
  const [queuePositionData, setQueuePositionData] = useState<Record<string, QueuePositionResponse>>({})
  const [_loadingQueuePositions, setLoadingQueuePositions] = useState(false)

  // Service completion modal states
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [confirmingCompletion, setConfirmingCompletion] = useState(false)

  // Dispute modal states
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [submittingDispute, setSubmittingDispute] = useState(false)

  // Auto check-in states
  const [autoCheckinBooking, setAutoCheckinBooking] = useState<Booking | null>(null)
  const [autoCheckinLoading, setAutoCheckinLoading] = useState(false)
  const [showAutoCheckinBanner, setShowAutoCheckinBanner] = useState(false)
  const [autoCheckinDistance, setAutoCheckinDistance] = useState(0)

  // Rate booking states
  const [showRateModal, setShowRateModal] = useState(false)
  const [rateBooking, setRateBooking] = useState<Booking | null>(null)

  // Auto check-in: Check proximity when bookings are loaded
  useEffect(() => {
    if (loading || bookings.upcoming.length === 0) return

    const checkProximity = async () => {
      // Filter for today's confirmed bookings not yet checked in
      const eligibleBookings = bookings.upcoming.filter(
        (b) => b.status === 'CONFIRMED' && !b.checkedIn && isBookingToday(b)
      )

      if (eligibleBookings.length === 0) return

      // Get already prompted bookings
      const promptedBookings = getPromptedBookings()

      // Check if geolocation is available
      if (!navigator.geolocation) return

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords

          // Find nearby bookings
          for (const booking of eligibleBookings) {
            // Skip if salon has no coordinates
            if (!booking.salon?.latitude || !booking.salon?.longitude) continue

            // Skip if already prompted
            if (promptedBookings.has(booking.id)) continue

            const distance = getDistanceInMeters(
              latitude,
              longitude,
              booking.salon.latitude,
              booking.salon.longitude
            )

            if (distance <= GEOFENCE_RADIUS_METERS) {
              // Found a nearby booking - show banner
              setAutoCheckinBooking(booking)
              setAutoCheckinDistance(Math.round(distance))
              setShowAutoCheckinBanner(true)
              markBookingAsPrompted(booking.id)
              break // Only prompt for one booking at a time
            }
          }
        },
        (error) => {
          // Silently handle geolocation errors - user may have denied permission
          console.log('Geolocation error:', error.message)
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000, // Cache location for 1 minute
        }
      )
    }

    // Delay to allow UI to settle
    const timeout = setTimeout(checkProximity, 1500)
    return () => clearTimeout(timeout)
  }, [loading, bookings.upcoming])

  // Handle auto check-in
  const handleAutoCheckIn = async () => {
    if (!autoCheckinBooking) return

    setAutoCheckinLoading(true)
    try {
      // Get current position
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords

          try {
            const result = await bookingApi.autoCheckIn(
              autoCheckinBooking.id,
              latitude,
              longitude
            )

            toast.success(result.message)

            // Refresh bookings
            fetchBookings()
            fetchCounts()

            // Hide banner
            setShowAutoCheckinBanner(false)
            setAutoCheckinBooking(null)
          } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to check in. Please try again.')
          } finally {
            setAutoCheckinLoading(false)
          }
        },
        (_error) => {
          toast.error('Unable to get your location. Please enable location permissions.')
          setAutoCheckinLoading(false)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } catch (error) {
      setAutoCheckinLoading(false)
    }
  }

  // Fetch all booking counts on mount
  const fetchCounts = useCallback(async () => {
    try {
      const [pending, confirmed, completed, cancelled] = await Promise.all([
        bookingApi.getMyBookings('PENDING'),
        bookingApi.getMyBookings('CONFIRMED'),
        bookingApi.getMyBookings('COMPLETED'),
        bookingApi.getMyBookings('CANCELLED')
      ])
      
      setCounts({
        upcoming: pending.length + confirmed.length,
        past: completed.length,
        cancelled: cancelled.length
      })
    } catch (err) {
      console.error('Failed to fetch booking counts:', err)
    }
  }, [])

  // Fetch bookings for active tab
  const fetchBookings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // For upcoming tab, fetch both PENDING and CONFIRMED bookings
      if (activeTab === 'upcoming') {
        const [pendingBookings, confirmedBookings] = await Promise.all([
          bookingApi.getMyBookings('PENDING'),
          bookingApi.getMyBookings('CONFIRMED')
        ])
        // Combine and sort by creation date (newest first)
        const combined = [...pendingBookings, ...confirmedBookings].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setBookings(prev => ({ ...prev, [activeTab]: combined }))
      } else {
        const status = statusMap[activeTab]
        const data = await bookingApi.getMyBookings(status)
        setBookings(prev => ({ ...prev, [activeTab]: data }))
      }
    } catch (err: any) {
      console.error('Failed to fetch bookings:', err)
      setError(err.response?.data?.message || 'Failed to load bookings. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchBookings()
    fetchCounts()
  }, [activeTab, fetchBookings, fetchCounts])

  // Fetch queue positions for confirmed bookings in upcoming tab
  useEffect(() => {
    if (activeTab === 'upcoming' && bookings.upcoming.length > 0) {
      const confirmedBookings = bookings.upcoming.filter(b => b.status === 'CONFIRMED')
      if (confirmedBookings.length > 0) {
        fetchQueuePositions(confirmedBookings.map(b => b.id))
      }
    }
  }, [activeTab, bookings.upcoming])

  // Fetch queue positions for confirmed bookings
  const fetchQueuePositions = async (bookingIds: string[]) => {
    setLoadingQueuePositions(true)
    try {
      const results = await Promise.all(
        bookingIds.map(async (id) => {
          try {
            const data = await bookingApi.getQueuePosition(id)
            return { id, data }
          } catch {
            return { id, data: null }
          }
        })
      )
      const newData: Record<string, QueuePositionResponse> = {}
      results.forEach(({ id, data }) => {
        if (data) {
          newData[id] = data
        }
      })
      setQueuePositionData(newData)
    } catch (err) {
      console.error('Failed to fetch queue positions:', err)
    } finally {
      setLoadingQueuePositions(false)
    }
  }

  // Handle cancel booking with refund preview
  const openCancellationModal = async () => {
    if (!selectedBooking) return
    
    setShowCancellationModal(true)
    setLoadingRefundPreview(true)
    try {
      const preview = await bookingApi.getRefundPreview(selectedBooking.id)
      setRefundPreview(preview)
    } catch (err: any) {
      toast.error('Failed to load refund information')
      console.error('Failed to fetch refund preview:', err)
    } finally {
      setLoadingRefundPreview(false)
    }
  }

  const handleCancelBooking = async () => {
    if (!selectedBooking) return
    
    setCancelling(true)
    try {
      await bookingApi.cancelBooking(selectedBooking.id, cancellationReason || 'Cancelled by customer')
      toast.success('Booking cancelled successfully')
      
      // Update local state
      setBookings(prev => ({
        ...prev,
        upcoming: prev.upcoming.filter(b => b.id !== selectedBooking.id),
        cancelled: [...prev.cancelled, { ...selectedBooking, status: 'CANCELLED' }]
      }))
      
      // Update counts
      setCounts(prev => ({
        upcoming: Math.max(0, prev.upcoming - 1),
        past: prev.past,
        cancelled: prev.cancelled + 1
      }))
      
      closeCancellationModal()
      setSelectedBooking(null)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking')
    } finally {
      setCancelling(false)
    }
  }

  const closeCancellationModal = () => {
    setShowCancellationModal(false)
    setRefundPreview(null)
    setCancellationReason('')
  }

  // Handle reschedule
  const openRescheduleModal = () => {
    if (!selectedBooking) return
    setShowRescheduleModal(true)
    setRescheduleDate(selectedBooking.date.split('T')[0])
    setRescheduleTime('')
    fetchAvailableSlots(selectedBooking.date.split('T')[0])
  }

  const fetchAvailableSlots = async (date: string) => {
    if (!selectedBooking) return
    setLoadingSlots(true)
    try {
      const slots = await bookingApi.getAvailableSlots(
        selectedBooking.salon.id,
        date,
        selectedBooking.worker?.id || undefined,
        selectedBooking.service?.duration || 30
      )
      setAvailableSlots(slots.filter(s => s.available).map(s => s.startTime))
    } catch (err) {
      toast.error('Failed to load available slots')
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleReschedule = async () => {
    if (!selectedBooking || !rescheduleDate || !rescheduleTime) return
    
    setRescheduling(true)
    try {
      await bookingApi.rescheduleBooking(
        selectedBooking.id,
        rescheduleDate,
        rescheduleTime,
        selectedBooking.worker?.id || undefined
      )
      toast.success('Booking rescheduled successfully')
      
      // Refresh bookings
      await fetchBookings()
      
      closeRescheduleModal()
      setSelectedBooking(null)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reschedule booking')
    } finally {
      setRescheduling(false)
    }
  }

  const closeRescheduleModal = () => {
    setShowRescheduleModal(false)
    setRescheduleDate('')
    setRescheduleTime('')
    setAvailableSlots([])
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-GH', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    } catch {
      return 'N/A'
    }
  }

  // Format time for display (24h to 12h)
  const formatTime = (timeStr: string | undefined | null) => {
    if (!timeStr) return 'N/A'
    try {
      const [hours, minutes] = timeStr.split(':').map(Number)
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours % 12 || 12
      return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
    } catch {
      return 'N/A'
    }
  }

  // Format price in Ghana Cedis
  const formatPrice = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A'
    return `GH₵ ${Number(amount).toFixed(2)}`
  }

  // Get salon image with fallback
  const getSalonImage = (booking: Booking) => {
    return booking.salon?.logo || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.salon?.businessName || 'Salon')}&background=006B3F&color=fff&size=100`
  }

  // Check if appointment time has passed
  const hasAppointmentTimePassed = (booking: Booking): boolean => {
    const appointmentDateTime = new Date(`${booking.date.split('T')[0]}T${booking.startTime}`)
    return new Date() > appointmentDateTime
  }

  // Get completion method display text
  const getCompletionMethodText = (method: string | undefined): string => {
    switch (method) {
      case 'MANUAL': return 'Manual Check-in'
      case 'QR_CODE': return 'QR Code Check-in'
      case 'AUTO': return 'Auto-Completed'
      case 'CUSTOMER_CONFIRMED': return 'Customer Confirmed'
      default: return 'Completed'
    }
  }

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Code copied to clipboard')
  }

  // Handle QR code display
  const handleShowQRCode = async () => {
    if (!selectedBooking) return
    setLoadingQRCode(true)
    try {
      const data = await bookingApi.getQRCode(selectedBooking.id)
      setQRCodeData(data.qrCodeDataUrl)
      // If checkinCode is not already on the booking object, use the one from QR response
      if (data.checkinCode && !selectedBooking.checkinCode) {
        setSelectedBooking({ ...selectedBooking, checkinCode: data.checkinCode })
      }
      setShowQRCodeModal(true)
    } catch (err: any) {
      toast.error('Failed to load QR code')
      console.error('Failed to fetch QR code:', err)
    } finally {
      setLoadingQRCode(false)
    }
  }

  // Handle service completion confirmation
  const handleConfirmCompletion = async () => {
    if (!selectedBooking) return
    setConfirmingCompletion(true)
    try {
      await bookingApi.confirmCompletion(selectedBooking.id)
      toast.success('Service confirmed! Thank you.')

      // Close the completion modal first
      setShowCompletionModal(false)

      // Update local state - move booking from upcoming to past
      setBookings(prev => ({
        ...prev,
        upcoming: prev.upcoming.filter(b => b.id !== selectedBooking.id),
        past: [{ ...selectedBooking, serviceCompleted: true, customerConfirmed: true, completionMethod: 'CUSTOMER_CONFIRMED' as const }, ...prev.past]
      }))

      // Update counts
      setCounts(prev => ({
        upcoming: Math.max(0, prev.upcoming - 1),
        past: prev.past + 1,
        cancelled: prev.cancelled
      }))

      // Close the booking detail modal to return to the bookings list
      setSelectedBooking(null)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to confirm completion')
    } finally {
      setConfirmingCompletion(false)
    }
  }

  // Handle dispute submission
  const handleRaiseDispute = async () => {
    if (!selectedBooking || !disputeReason.trim()) {
      toast.error('Please provide a reason for the dispute')
      return
    }
    setSubmittingDispute(true)
    try {
      await bookingApi.raiseDispute(selectedBooking.id, disputeReason.trim())
      toast.success('Dispute raised successfully. Our support team will contact you within 24 hours.')
      
      // Update local state
      setBookings(prev => ({
        ...prev,
        upcoming: prev.upcoming.map(b => 
          b.id === selectedBooking.id 
            ? { ...b, disputeRaised: true, disputeReason: disputeReason.trim() }
            : b
        )
      }))
      
      setShowDisputeModal(false)
      setDisputeReason('')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to raise dispute')
    } finally {
      setSubmittingDispute(false)
    }
  }

  const tabs = [
    { key: 'upcoming' as Tab, label: 'Upcoming', count: counts.upcoming },
    { key: 'past' as Tab, label: 'Past', count: counts.past },
    { key: 'cancelled' as Tab, label: 'Cancelled', count: counts.cancelled },
  ]

  const currentBookings = bookings[activeTab]

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Auto Check-in Banner */}
      {showAutoCheckinBanner && autoCheckinBooking && (
        <div className="bg-green-600 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <Icon name="near_me" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">You've Arrived!</h3>
                <p className="text-white/90 text-sm mt-1">
                  You're {autoCheckinDistance}m from {autoCheckinBooking.salon?.businessName}. 
                  Check in now to join the queue?
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowAutoCheckinBanner(false)
                setAutoCheckinBooking(null)
              }}
              className="text-white/80 hover:text-white"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
          <div className="flex gap-3 mt-3">
            <button
              onClick={handleAutoCheckIn}
              disabled={autoCheckinLoading}
              className="flex-1 bg-white text-green-700 font-semibold py-2 px-4 rounded-lg hover:bg-green-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {autoCheckinLoading ? (
                <>
                  <Icon name="progress_activity" size={16} className="animate-spin" />
                  Checking in...
                </>
              ) : (
                <>
                  <Icon name="check_circle" size={16} />
                  Check In Now
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowAutoCheckinBanner(false)
                setAutoCheckinBooking(null)
              }}
              className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your appointments</p>
        </div>
        <button 
          onClick={() => navigate('/explore')}
          className="btn-primary flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-sm w-full sm:w-auto justify-center"
        >
          <Icon name="add" size={16} />
          <span className="sm:inline">Book a Salon</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide scroll-smooth-x">
        {tabs.map((tab) => (
          <button 
            key={tab.key} 
            onClick={() => setActiveTab(tab.key)}
            className={`tab-pill flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.key ? 'tab-pill-active' : 'tab-pill-inactive'
            }`}
          >
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4 animate-fade-in">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card-v2 p-4">
              <div className="flex items-start gap-4">
                <div className="skeleton-shimmer w-16 h-16 rounded-xl flex-shrink-0"></div>
                <div className="flex-1 space-y-3">
                  <div className="skeleton-shimmer w-1/2 h-5"></div>
                  <div className="skeleton-shimmer w-1/3 h-4"></div>
                  <div className="flex gap-2">
                    <div className="skeleton-shimmer w-20 h-4"></div>
                    <div className="skeleton-shimmer w-20 h-4"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <Icon name="error" size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-700 font-medium">{error}</p>
          <button 
            onClick={fetchBookings}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Bookings List */}
      {!loading && !error && (
        <div className="space-y-4">
          {currentBookings.length === 0 ? (
            <div className="text-center py-16 animate-fade-in-up">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon name={activeTab === 'upcoming' ? 'calendar_today' : activeTab === 'past' ? 'history' : 'cancel'} size={48} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {activeTab === 'upcoming' 
                  ? "No upcoming bookings" 
                  : activeTab === 'past' 
                    ? "No past bookings yet"
                    : "No cancelled bookings"}
              </h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                {activeTab === 'upcoming' 
                  ? "Time to treat yourself! Discover amazing salons and book your next appointment." 
                  : activeTab === 'past' 
                    ? "Your completed appointments will appear here. Book your first salon visit!"
                    : "You haven't cancelled any bookings. That's great!"}
              </p>
              {activeTab === 'upcoming' && (
                <button 
                  onClick={() => navigate('/explore')}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium shadow-card hover:shadow-card-hover"
                >
                  Explore Salons
                </button>
              )}
              {activeTab === 'past' && (
                <button 
                  onClick={() => navigate('/explore')}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium shadow-card hover:shadow-card-hover"
                >
                  Book Now
                </button>
              )}
            </div>
          ) : (
            currentBookings.map((booking) => (
              <div 
                key={booking.id} 
                className={`card-v2 p-4 cursor-pointer ${
                  booking.status === 'CONFIRMED' ? 'border-l-4 border-l-green-500' :
                  booking.status === 'PENDING' ? 'border-l-4 border-l-amber-400' :
                  booking.status === 'COMPLETED' ? 'border-l-4 border-l-gray-400' :
                  booking.status === 'CANCELLED' ? 'border-l-4 border-l-red-500' :
                  'border-l-4 border-l-gray-300'
                }`}
                onClick={() => setSelectedBooking(booking)}
              >
                <div className="flex items-start gap-4">
                  <img 
                    src={getSalonImage(booking)} 
                    alt={booking.salon?.businessName || 'Salon'} 
                    className="w-16 h-16 rounded-xl object-cover bg-gray-100"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {booking.salon?.businessName || 'Unknown Salon'}
                          </h3>
                          {booking.isGroupBooking && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                              <Icon name="group" size={12} />
                              Group · {booking.totalPeople || 1} people
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {booking.service?.name || 'Unknown Service'}
                        </p>
                      </div>
                      <span className={'px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ' +
                        (statusColors[booking.status] || 'bg-gray-100 text-gray-600')}>
                        {statusLabels[booking.status] || booking.status}
                      </span>
                    </div>
                    {/* Countdown timer for PENDING bookings */}
                    {booking.status === 'PENDING' && (
                      <PendingBookingCountdown createdAt={booking.createdAt} />
                    )}

                    {/* Queue position and check-in status for CONFIRMED bookings */}
                    {booking.status === 'CONFIRMED' && queuePositionData[booking.id] && (() => {
                      const queueInfo = queuePositionData[booking.id];
                      if (!queueInfo) return null;
                      return (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {queueInfo.queuePosition !== null && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                              <Icon name="group" size={12} />
                              Queue #{queueInfo.queuePosition}
                            </span>
                          )}
                          {queueInfo.checkedIn ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full">
                              <Icon name="check_circle" size={12} />
                              Checked In
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                              Not Checked In
                            </span>
                          )}
                          {queueInfo.checkedIn && queueInfo.estimatedWaitMinutes && (
                            <span className="text-xs text-gray-500">
                              Est. wait: ~{queueInfo.estimatedWaitMinutes} min
                            </span>
                          )}
                          {queueInfo.peopleAhead !== undefined && queueInfo.peopleAhead > 0 && !queueInfo.checkedIn && (
                            <span className="text-xs text-gray-500">
                              {queueInfo.peopleAhead} ahead
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Icon name="calendar_today" size={16} />
                        <span>{formatDate(booking.date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icon name="schedule" size={16} />
                        <span>{formatTime(booking.startTime)}</span>
                      </div>
                    </div>
                    {/* Rating status for COMPLETED bookings */}
                    {booking.status === 'COMPLETED' && (
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-semibold text-gray-900">
                          {formatPrice(booking.finalAmount || booking.totalAmount)}
                        </span>
                        {booking.review ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[#FCD116]/10 text-amber-700 rounded-full">
                            <Icon name="star" size={14} filled className="text-[#FCD116]" />
                            Reviewed {booking.review.rating}/5
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setRateBooking(booking)
                              setShowRateModal(true)
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#006B3F] text-white rounded-full hover:bg-[#006B3F]/90 transition-colors"
                          >
                            <Icon name="star" size={14} />
                            Leave Review
                          </button>
                        )}
                      </div>
                    )}
                    {booking.status !== 'COMPLETED' && (
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-semibold text-gray-900">
                          {formatPrice(booking.finalAmount || booking.totalAmount)}
                        </span>
                        <Icon name="chevron_right" size={20} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-elevated animate-slide-up">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Booking Details</h2>
                <button 
                  onClick={() => {
                    setSelectedBooking(null)
                    closeCancellationModal()
                    closeRescheduleModal()
                  }} 
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <Icon name="close" size={20} className="text-gray-500" />
                </button>
              </div>
              
              <img 
                src={getSalonImage(selectedBooking)} 
                alt={selectedBooking.salon?.businessName || 'Salon'} 
                className="w-full h-40 object-cover rounded-lg mb-4 bg-gray-100"
              />
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedBooking.salon?.businessName || 'Unknown Salon'}
                  </h3>
                  <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                    <Icon name="location_on" size={16} />
                    <span>{selectedBooking.salon?.address || 'Address not available'}</span>
                  </div>
                  {selectedBooking.salon?.phoneNumber && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                      <Icon name="call" size={16} />
                      <span>{selectedBooking.salon.phoneNumber}</span>
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Booking Reference</span>
                    <span className="font-medium font-mono">{selectedBooking.reference || selectedBooking.id.slice(0, 8)}</span>
                  </div>
                  {selectedBooking.isGroupBooking && selectedBooking.groupBookingRef && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Group Reference</span>
                      <span className="font-medium font-mono text-purple-600">{selectedBooking.groupBookingRef}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service</span>
                    <span className="font-medium">{selectedBooking.service?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stylist</span>
                    <span className="font-medium">{selectedBooking.worker?.fullName || 'Any available'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date</span>
                    <span className="font-medium">{formatDate(selectedBooking.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time</span>
                    <span className="font-medium">
                      {formatTime(selectedBooking.startTime)}
                      {selectedBooking.endTime ? ` - ${formatTime(selectedBooking.endTime)}` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration</span>
                    <span className="font-medium">{selectedBooking.service?.duration || 0} mins</span>
                  </div>
                  {selectedBooking.cancellationDeadline && (
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-gray-600">Cancel by</span>
                      <span className="font-medium text-amber-600">
                        {formatDate(selectedBooking.cancellationDeadline)}
                      </span>
                    </div>
                  )}
                  {selectedBooking.customerNotes && (
                    <div className="pt-2 border-t border-gray-200">
                      <span className="text-gray-600 text-sm">Notes:</span>
                      <p className="text-sm text-gray-800 mt-1">{selectedBooking.customerNotes}</p>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="text-gray-600">Total</span>
                    <span className="font-bold text-lg text-green-700">
                      {formatPrice(selectedBooking.finalAmount || selectedBooking.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Group Members Section */}
                {selectedBooking.isGroupBooking && selectedBooking.guests && selectedBooking.guests.length > 0 && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon name="group" size={20} className="text-purple-600" />
                      <h4 className="font-semibold text-gray-900">Group Members ({selectedBooking.totalPeople || selectedBooking.guests.length})</h4>
                    </div>
                    <div className="space-y-3">
                      {selectedBooking.guests.map((guest, index) => (
                        <div key={guest.id || index} className="bg-white rounded-lg p-3 border border-purple-100">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{guest.guestName}</p>
                              {guest.isChild && (
                                <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                  Child
                                </span>
                              )}
                            </div>
                            {guest.checkedIn && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                                <Icon name="check_circle" size={12} />
                                Checked in
                              </span>
                            )}
                          </div>
                          <div className="mt-2 text-sm text-gray-600 space-y-1">
                            <p><span className="text-gray-500">Service:</span> {guest.service?.name || 'N/A'}</p>
                            {guest.staff && (
                              <p><span className="text-gray-500">Staff:</span> {guest.staff.fullName}</p>
                            )}
                            {guest.specialInstructions && (
                              <p className="text-amber-700"><span className="text-amber-600">Note:</span> {guest.specialInstructions}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedBooking.billingType && (
                      <p className="mt-3 text-sm text-gray-600">
                        <span className="font-medium">Billing:</span> {selectedBooking.billingType === 'combined' ? 'Combined payment' : 'Separate payments'}
                      </p>
                    )}
                  </div>
                )}

                {/* Escrow Status Section */}
                {selectedBooking.escrow && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon name="verified_user" size={20} className="text-blue-600" />
                      <h4 className="font-semibold text-gray-900">Payment Status</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                          selectedBooking.escrow.status === 'HELD' ? 'bg-amber-100 text-amber-700' :
                          selectedBooking.escrow.status === 'RELEASED' ? 'bg-green-100 text-green-700' :
                          selectedBooking.escrow.status === 'REFUNDED' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {selectedBooking.escrow.status === 'HELD' && <Icon name="verified_user" size={12} />}
                          {selectedBooking.escrow.status === 'RELEASED' && <Icon name="check_circle" size={12} />}
                          {selectedBooking.escrow.status === 'REFUNDED' && <Icon name="block" size={12} />}
                          {selectedBooking.escrow.status === 'HELD' ? 'Held in Escrow' :
                           selectedBooking.escrow.status === 'RELEASED' ? 'Released to Provider' :
                           selectedBooking.escrow.status === 'REFUNDED' ? 'Refunded' :
                           selectedBooking.escrow.status}
                        </span>
                      </div>
                      {selectedBooking.escrow.status === 'HELD' && (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Amount Held</span>
                            <span className="font-medium text-gray-900">
                              GH₵ {Number(selectedBooking.escrow.amountHeld).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Payment is securely held until your appointment is completed.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* No-Show Warning */}
                {selectedBooking.noShowFlag && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
                    <Icon name="error" size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">No-Show Flagged</p>
                      <p className="text-xs text-orange-600 mt-1">This booking was marked as a no-show.</p>
                    </div>
                  </div>
                )}

                {/* Provider Cancelled Notice */}
                {selectedBooking.providerCancelled && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <Icon name="close" size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Cancelled by Provider</p>
                      <p className="text-xs text-red-600 mt-1">The salon cancelled this booking. You may be eligible for a full refund.</p>
                    </div>
                  </div>
                )}

                {/* Service Completion Prompt - For bookings where appointment time has passed */}
                {activeTab === 'upcoming' && selectedBooking.status === 'CONFIRMED' && hasAppointmentTimePassed(selectedBooking) && !selectedBooking.serviceCompleted && !selectedBooking.disputeRaised && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon name="warning" size={20} className="text-amber-600" />
                      <h4 className="font-semibold text-gray-900">Was your service completed?</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Your appointment time has passed. Please confirm if the service was completed.
                    </p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setShowCompletionModal(true)}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Yes, Service Complete
                      </button>
                      <button 
                        onClick={() => setShowDisputeModal(true)}
                        className="flex-1 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        Issue with Service
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Confirming releases payment to the salon
                    </p>
                  </div>
                )}

                {/* Dispute Status */}
                {selectedBooking.disputeRaised && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name="warning" size={20} className="text-red-600" />
                      <h4 className="font-semibold text-red-800">Dispute Raised</h4>
                    </div>
                    {selectedBooking.disputeReason && (
                      <p className="text-sm text-red-700 mb-2">
                        <span className="font-medium">Reason:</span> {selectedBooking.disputeReason}
                      </p>
                    )}
                    <p className="text-xs text-red-600">
                      Payment is held in escrow until the dispute is resolved. Our support team will contact you within 24 hours.
                    </p>
                  </div>
                )}

                {/* Service Completed Status */}
                {selectedBooking.serviceCompleted && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name="check_circle" size={20} className="text-green-600" />
                      <h4 className="font-semibold text-green-800">Service Completed</h4>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <span className="px-2 py-0.5 bg-green-100 rounded-full text-xs font-medium">
                        {getCompletionMethodText(selectedBooking.completionMethod)}
                      </span>
                      {selectedBooking.serviceCompletedAt && (
                        <span className="text-xs">
                          {formatDate(selectedBooking.serviceCompletedAt)} at {formatTime(selectedBooking.serviceCompletedAt.split('T')[1]?.slice(0, 5) || '')}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Check-in Code Display - Show for CONFIRMED and PENDING bookings */}
                {activeTab === 'upcoming' && (selectedBooking.status === 'CONFIRMED' || selectedBooking.status === 'PENDING') && selectedBooking.checkinCode && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800 mb-1">Your Check-in Code</p>
                        <p className="text-xs text-green-600">Show this code to the salon if QR scanner is unavailable</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold font-mono text-green-700 bg-white px-4 py-2 rounded-lg border border-green-200">
                          {selectedBooking.checkinCode}
                        </span>
                        <button 
                          onClick={() => copyToClipboard(selectedBooking.checkinCode || '')}
                          className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                          title="Copy code"
                        >
                          <Icon name="content_copy" size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {activeTab === 'upcoming' && selectedBooking.status === 'CONFIRMED' && !hasAppointmentTimePassed(selectedBooking) && !selectedBooking.disputeRaised && (
                  <div className="space-y-3">
                    {/* QR Code Button */}
                    <button 
                      onClick={handleShowQRCode}
                      disabled={loadingQRCode}
                      className="w-full btn-secondary flex items-center justify-center gap-2 border-2 border-green-600 text-green-700 hover:bg-green-50"
                    >
                      {loadingQRCode ? (
                        <>
                          <Icon name="progress_activity" size={16} className="animate-spin" />
                          Loading QR Code...
                        </>
                      ) : (
                        <>
                          <Icon name="qr_code" size={16} />
                          Show QR Code
                        </>
                      )}
                    </button>
                    
                    {/* Reschedule and Cancel Buttons */}
                    <div className="flex gap-3">
                      <button 
                        className="flex-1 btn-secondary flex items-center justify-center gap-2"
                        onClick={openRescheduleModal}
                      >
                        <Icon name="refresh" size={16} />
                        Reschedule
                      </button>
                      <button 
                        onClick={openCancellationModal}
                        className="flex-1 btn-primary bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2"
                      >
                        <Icon name="close" size={16} />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Action buttons for PENDING bookings */}
                {activeTab === 'upcoming' && selectedBooking.status === 'PENDING' && (
                  <div className="flex gap-3">
                    <button 
                      className="flex-1 btn-secondary flex items-center justify-center gap-2"
                      onClick={openRescheduleModal}
                    >
                      <Icon name="refresh" size={16} />
                      Reschedule
                    </button>
                    <button 
                      onClick={openCancellationModal}
                      className="flex-1 btn-primary bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2"
                    >
                      <Icon name="close" size={16} />
                      Cancel
                    </button>
                  </div>
                )}

                {/* Rate button for COMPLETED bookings */}
                {selectedBooking.status === 'COMPLETED' && (
                  <div>
                    {selectedBooking.review ? (
                      <div className="bg-[#FCD116]/10 border border-[#FCD116]/20 rounded-lg p-4 flex items-center gap-3">
                        <Icon name="star" size={24} filled className="text-[#FCD116]" />
                        <div>
                          <p className="font-medium text-gray-900">You rated this booking</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Icon
                                key={s}
                                name="star"
                                size={16}
                                filled={s <= (selectedBooking.review?.rating || 0)}
                                className={s <= (selectedBooking.review?.rating || 0) ? 'text-[#FCD116]' : 'text-gray-300'}
                              />
                            ))}
                            <span className="text-sm font-medium text-gray-700 ml-1">{selectedBooking.review.rating}/5</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setRateBooking(selectedBooking)
                          setShowRateModal(true)
                        }}
                        className="w-full py-3 bg-[#006B3F] text-white font-medium rounded-xl hover:bg-[#006B3F]/90 transition-colors flex items-center justify-center gap-2"
                      >
                        <Icon name="star" size={20} />
                        Leave a Review
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancellationModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-elevated animate-slide-up">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Cancel Booking</h2>
                <button 
                  onClick={closeCancellationModal}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <Icon name="close" size={20} className="text-gray-500" />
                </button>
              </div>

              {loadingRefundPreview ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Icon name="progress_activity" size={32} className="text-green-600 animate-spin" />
                  <p className="mt-4 text-gray-500">Calculating refund...</p>
                </div>
              ) : refundPreview ? (
                <div className="space-y-4">
                  {/* Refund Breakdown */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon name="info" size={20} className="text-blue-500" />
                      <h3 className="font-semibold text-gray-900">Refund Information</h3>
                    </div>
                    
                    {/* Tier badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Cancellation Tier</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        refundPreview.tier === 'FREE' ? 'bg-green-100 text-green-700' :
                        refundPreview.tier === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {refundPreview.tier.replace('_', ' ')}
                      </span>
                    </div>
                    
                    {/* Hours until booking */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Time until appointment</span>
                      <span className="text-sm font-medium text-gray-900">
                        {Math.round(refundPreview.hoursUntilBooking)} hours
                      </span>
                    </div>
                    
                    {/* Refund percentage */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Refund percentage</span>
                      <span className="text-sm font-medium text-gray-900">
                        {refundPreview.refundPercentage}%
                      </span>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Your refund</span>
                        <span className="text-lg font-bold text-green-600">
                          GH₵ {refundPreview.refundAmount.toFixed(2)}
                        </span>
                      </div>
                      
                      {refundPreview.providerAmount > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Provider keeps</span>
                          <span className="text-gray-700">
                            GH₵ {refundPreview.providerAmount.toFixed(2)}
                          </span>
                        </div>
                      )}
                      
                      {refundPreview.platformFee > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Platform fee</span>
                          <span className="text-gray-700">
                            GH₵ {refundPreview.platformFee.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Warning for no refund */}
                  {refundPreview.refundPercentage === 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <Icon name="gpp_maybe" size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">
                        You will not receive a refund for this cancellation as it's less than 12 hours before your appointment.
                      </p>
                    </div>
                  )}

                  {/* Reason textarea */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for cancellation <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="Please let us know why you're cancelling..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={closeCancellationModal}
                      disabled={cancelling}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Keep Booking
                    </button>
                    <button 
                      onClick={handleCancelBooking}
                      disabled={cancelling}
                      className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {cancelling ? (
                        <>
                          <Icon name="progress_activity" size={16} className="animate-spin" />
                          Cancelling...
                        </>
                      ) : refundPreview.refundPercentage > 0 ? (
                        `Cancel & Get GH₵${refundPreview.refundAmount.toFixed(2)} Refund`
                      ) : (
                        'Cancel (No Refund)'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Icon name="error" size={48} className="text-red-400 mx-auto mb-3" />
                  <p className="text-gray-600">Failed to load refund information</p>
                  <button 
                    onClick={openCancellationModal}
                    className="mt-4 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-elevated animate-slide-up">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Reschedule Booking</h2>
                <button 
                  onClick={closeRescheduleModal}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <Icon name="close" size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Current booking info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Current appointment</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(selectedBooking.date)} at {formatTime(selectedBooking.startTime)}
                  </p>
                </div>

                {/* Date selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select New Date
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setRescheduleDate(e.target.value)
                      setRescheduleTime('')
                      fetchAvailableSlots(e.target.value)
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Time slot selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select New Time
                  </label>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-8">
                      <Icon name="progress_activity" size={24} className="text-green-600 animate-spin" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <Icon name="schedule" size={32} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No available slots for this date</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {availableSlots.map((time) => {
                        const [hours, minutes] = time.split(':').map(Number)
                        const period = hours >= 12 ? 'PM' : 'AM'
                        const displayHours = hours % 12 || 12
                        const displayTime = `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
                        
                        return (
                          <button
                            key={time}
                            onClick={() => setRescheduleTime(time)}
                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                              rescheduleTime === time
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {displayTime}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={closeRescheduleModal}
                    disabled={rescheduling}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleReschedule}
                    disabled={rescheduling || !rescheduleDate || !rescheduleTime}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {rescheduling ? (
                      <>
                        <Icon name="progress_activity" size={16} className="animate-spin" />
                        Rescheduling...
                      </>
                    ) : (
                      <>
                        <Icon name="refresh" size={16} />
                        Confirm Reschedule
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRCodeModal && selectedBooking && qrCodeData && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-sm w-full shadow-elevated animate-slide-up">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Check-in QR Code</h2>
                <button 
                  onClick={() => {
                    setShowQRCodeModal(false)
                    setQRCodeData(null)
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <Icon name="close" size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="text-center">
                <div className="bg-white p-4 rounded-xl border border-gray-200 inline-block mb-4">
                  <img 
                    src={qrCodeData} 
                    alt="QR Code for check-in" 
                    className="w-40 h-40 sm:w-48 sm:h-48 mx-auto"
                  />
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Show this code to your barber/stylist at the salon
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Booking Reference
                </p>
                <p className="text-lg font-bold text-green-700 font-mono mb-4">
                  {selectedBooking.reference || selectedBooking.id.slice(0, 8)}
                </p>

                {/* Manual Check-in Code */}
                {selectedBooking.checkinCode && (
                  <div className="border-t border-gray-200 pt-4 mt-2">
                    <p className="text-sm text-gray-500 mb-2">
                      Can't scan? Use code:
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xl font-bold font-mono bg-gray-100 px-4 py-2 rounded-lg text-green-700">
                        {selectedBooking.checkinCode}
                      </span>
                      <button 
                        onClick={() => copyToClipboard(selectedBooking.checkinCode || '')}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Copy code"
                      >
                        <Icon name="content_copy" size={20} className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => {
                  setShowQRCodeModal(false)
                  setQRCodeData(null)
                }}
                className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Completion Confirmation Modal */}
      {showCompletionModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-elevated animate-scale-in">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Confirm Service Completion</h2>
                <button 
                  onClick={() => setShowCompletionModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <Icon name="close" size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    This will release payment of <span className="font-bold">GH₵ {(selectedBooking.finalAmount || selectedBooking.totalAmount).toFixed(2)}</span> to the salon. 
                    Only confirm if the service was completed to your satisfaction.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Service:</span> {selectedBooking.service?.name}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Salon:</span> {selectedBooking.salon?.businessName}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Date:</span> {formatDate(selectedBooking.date)} at {formatTime(selectedBooking.startTime)}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowCompletionModal(false)}
                    disabled={confirmingCompletion}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmCompletion}
                    disabled={confirmingCompletion}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {confirmingCompletion ? (
                      <>
                        <Icon name="progress_activity" size={16} className="animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        <Icon name="check_circle" size={16} />
                        Yes, Release Payment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rate Booking Modal */}
      <RateBookingModal
        isOpen={showRateModal}
        onClose={() => {
          setShowRateModal(false)
          setRateBooking(null)
        }}
        bookingId={rateBooking?.id || ''}
        salonName={rateBooking?.salon?.businessName || 'Salon'}
        serviceName={rateBooking?.service?.name || 'Service'}
        onReviewSubmitted={(rating) => {
          // Update the booking in local state with the review
          if (rateBooking) {
            const updateBooking = (b: Booking) =>
              b.id === rateBooking.id ? { ...b, review: { id: 'new', rating } } : b
            setBookings(prev => ({
              upcoming: prev.upcoming.map(updateBooking),
              past: prev.past.map(updateBooking),
              cancelled: prev.cancelled.map(updateBooking),
            }))
            // Also update selectedBooking if it's the same
            if (selectedBooking?.id === rateBooking.id) {
              setSelectedBooking({ ...selectedBooking, review: { id: 'new', rating } })
            }
          }
        }}
      />
      {/* Dispute Modal */}
      {showDisputeModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-elevated animate-scale-in">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Report an Issue</h2>
                <button 
                  onClick={() => {
                    setShowDisputeModal(false)
                    setDisputeReason('')
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <Icon name="close" size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What went wrong?
                  </label>
                  <textarea
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="Please describe the issue you experienced..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Icon name="info" size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-800 font-medium">Payment Protected</p>
                      <p className="text-xs text-blue-600 mt-1">
                        Payment will remain held in escrow until the dispute is resolved. 
                        Support will contact you within 24 hours.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => {
                      setShowDisputeModal(false)
                      setDisputeReason('')
                    }}
                    disabled={submittingDispute}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleRaiseDispute}
                    disabled={submittingDispute || !disputeReason.trim()}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingDispute ? (
                      <>
                        <Icon name="progress_activity" size={16} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Icon name="chat" size={16} />
                        Submit Dispute
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

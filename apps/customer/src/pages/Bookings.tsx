import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, MapPin, ChevronRight, X, AlertCircle, Plus, Loader2, Phone, RefreshCw, ShieldAlert, Info, Users, Shield, CheckCircle, Ban } from 'lucide-react'
import toast from 'react-hot-toast'
import { bookingApi, Booking, RefundPreview } from '../lib/api'

type Tab = 'upcoming' | 'past' | 'cancelled'

// Status mapping for API queries
const statusMap: Record<Tab, string> = {
  upcoming: 'CONFIRMED',
  past: 'COMPLETED',
  cancelled: 'CANCELLED'
}

// Status badge colors - Ghana flag inspired
const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-orange-100 text-orange-800'
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

  const tabs = [
    { key: 'upcoming' as Tab, label: 'Upcoming', count: counts.upcoming },
    { key: 'past' as Tab, label: 'Past', count: counts.past },
    { key: 'cancelled' as Tab, label: 'Cancelled', count: counts.cancelled },
  ]

  const currentBookings = bookings[activeTab]

  return (
    <div className="space-y-4 md:space-y-6">
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
          <Plus className="w-4 h-4" />
          <span className="sm:inline">Book a Salon</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 sm:gap-4 border-b border-gray-200 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button 
            key={tab.key} 
            onClick={() => setActiveTab(tab.key)}
            className={'pb-3 px-1 border-b-2 font-medium text-sm transition-colors ' + 
              (activeTab === tab.key 
                ? 'border-green-600 text-green-700' 
                : 'border-transparent text-gray-500 hover:text-gray-700')}
          >
            {tab.label}
            <span className={'ml-2 px-2 py-0.5 rounded-full text-xs ' + 
              (activeTab === tab.key ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
          <p className="mt-4 text-gray-500">Loading your bookings...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
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
            <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No {activeTab} bookings</h3>
              <p className="text-gray-500 mb-6">
                {activeTab === 'upcoming' 
                  ? "You don't have any upcoming appointments." 
                  : activeTab === 'past' 
                    ? "You haven't completed any bookings yet."
                    : "You haven't cancelled any bookings."}
              </p>
              {activeTab === 'upcoming' && (
                <button 
                  onClick={() => navigate('/explore')}
                  className="btn-primary bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                >
                  Find a Salon
                </button>
              )}
            </div>
          ) : (
            currentBookings.map((booking) => (
              <div 
                key={booking.id} 
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer" 
                onClick={() => setSelectedBooking(booking)}
              >
                <div className="flex items-start gap-4">
                  <img 
                    src={getSalonImage(booking)} 
                    alt={booking.salon?.businessName || 'Salon'} 
                    className="w-16 h-16 rounded-lg object-cover bg-gray-100"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">
                            {booking.salon?.businessName || 'Unknown Salon'}
                          </h3>
                          {booking.isGroupBooking && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                              <Users className="w-3 h-3" />
                              Group · {booking.totalPeople || 1} people
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {booking.service?.name || 'Unknown Service'}
                        </p>
                      </div>
                      <span className={'px-2 py-1 text-xs font-medium rounded capitalize ' + 
                        (statusColors[booking.status] || 'bg-gray-100 text-gray-600')}>
                        {(booking.status || 'unknown').toLowerCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(booking.date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(booking.startTime)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="font-semibold text-gray-900">
                        {formatPrice(booking.finalAmount || booking.totalAmount)}
                      </span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
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
                  <X className="w-5 h-5 text-gray-500" />
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
                    <MapPin className="w-4 h-4" />
                    <span>{selectedBooking.salon?.address || 'Address not available'}</span>
                  </div>
                  {selectedBooking.salon?.phoneNumber && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                      <Phone className="w-4 h-4" />
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
                      <Users className="w-5 h-5 text-purple-600" />
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
                                <CheckCircle className="w-3 h-3" />
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
                      <Shield className="w-5 h-5 text-blue-600" />
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
                          {selectedBooking.escrow.status === 'HELD' && <Shield className="w-3 h-3" />}
                          {selectedBooking.escrow.status === 'RELEASED' && <CheckCircle className="w-3 h-3" />}
                          {selectedBooking.escrow.status === 'REFUNDED' && <Ban className="w-3 h-3" />}
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
                    <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">No-Show Flagged</p>
                      <p className="text-xs text-orange-600 mt-1">This booking was marked as a no-show.</p>
                    </div>
                  </div>
                )}

                {/* Provider Cancelled Notice */}
                {selectedBooking.providerCancelled && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Cancelled by Provider</p>
                      <p className="text-xs text-red-600 mt-1">The salon cancelled this booking. You may be eligible for a full refund.</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {activeTab === 'upcoming' && (
                  <div className="flex gap-3">
                    <button 
                      className="flex-1 btn-secondary flex items-center justify-center gap-2"
                      onClick={openRescheduleModal}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reschedule
                    </button>
                    <button 
                      onClick={openCancellationModal}
                      className="flex-1 btn-primary bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancellationModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Cancel Booking</h2>
                <button 
                  onClick={closeCancellationModal}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {loadingRefundPreview ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                  <p className="mt-4 text-gray-500">Calculating refund...</p>
                </div>
              ) : refundPreview ? (
                <div className="space-y-4">
                  {/* Refund Breakdown */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="w-5 h-5 text-blue-500" />
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
                      <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
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
                          <Loader2 className="w-4 h-4 animate-spin" />
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
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Reschedule Booking</h2>
                <button 
                  onClick={closeRescheduleModal}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
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
                      <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
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
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Rescheduling...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
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
    </div>
  )
}

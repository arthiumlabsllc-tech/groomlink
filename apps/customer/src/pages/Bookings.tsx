import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, MapPin, ChevronRight, X, AlertCircle, Plus, Loader2, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { bookingApi, Booking } from '../lib/api'

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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // Fetch all booking counts on mount
  const fetchCounts = useCallback(async () => {
    try {
      const [confirmed, completed, cancelled] = await Promise.all([
        bookingApi.getMyBookings('CONFIRMED'),
        bookingApi.getMyBookings('COMPLETED'),
        bookingApi.getMyBookings('CANCELLED')
      ])
      
      setCounts({
        upcoming: confirmed.length,
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
      const status = statusMap[activeTab]
      const data = await bookingApi.getMyBookings(status)
      setBookings(prev => ({ ...prev, [activeTab]: data }))
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

  // Handle cancel booking
  const handleCancelBooking = async () => {
    if (!selectedBooking) return
    
    setCancelling(true)
    try {
      await bookingApi.cancelBooking(selectedBooking.id, 'Cancelled by customer')
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
        cancelled: prev.cancelled + 1
      }))
      
      setShowCancelConfirm(false)
      setSelectedBooking(null)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking')
    } finally {
      setCancelling(false)
    }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-1">Manage your appointments</p>
        </div>
        <button 
          onClick={() => navigate('/explore')}
          className="btn-primary flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
        >
          <Plus className="w-4 h-4" />
          Book a Salon
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
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
                        <h3 className="font-semibold text-gray-900">
                          {booking.salon?.businessName || 'Unknown Salon'}
                        </h3>
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
                    setShowCancelConfirm(false)
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

                {/* Cancel Confirmation */}
                {showCancelConfirm ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700 mb-4">
                      Are you sure you want to cancel this booking? This action cannot be undone.
                      Bookings must be cancelled at least 3 hours before the appointment time.
                    </p>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setShowCancelConfirm(false)}
                        disabled={cancelling}
                        className="flex-1 btn-secondary"
                      >
                        Keep Booking
                      </button>
                      <button 
                        onClick={handleCancelBooking}
                        disabled={cancelling}
                        className="flex-1 btn-primary bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2"
                      >
                        {cancelling ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          'Yes, Cancel'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  activeTab === 'upcoming' && (
                    <div className="flex gap-3">
                      <button 
                        className="flex-1 btn-secondary"
                        onClick={() => toast.error('Reschedule feature coming soon!')}
                      >
                        Reschedule
                      </button>
                      <button 
                        onClick={() => setShowCancelConfirm(true)}
                        className="flex-1 btn-primary bg-red-500 hover:bg-red-600"
                      >
                        Cancel
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

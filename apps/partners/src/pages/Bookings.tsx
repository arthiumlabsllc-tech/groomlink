import { useState, useEffect } from 'react'
import { Search, Calendar, Clock, User, Users, Filter, Store, ArrowRightCircle, X, Check, Phone, Mail, FileText, Scissors, Loader2, AlertTriangle, CheckCircle, Ban, Wallet, AlertCircle, QrCode } from 'lucide-react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { api, Booking } from '../lib/api'
import { useSalon } from '../store/SalonContext'

type TabFilter = 'all' | 'upcoming' | 'completed' | 'cancelled'

const getStatusStyles = (status: string) => {
  const styles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    CONFIRMED: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
    IN_PROGRESS: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
    COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' },
    CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
    NO_SHOW: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  }
  return styles[status] || styles.PENDING
}

const getPaymentStatusStyles = (paymentStatus?: string, cancelledBy?: string) => {
  if (!paymentStatus) return null
  
  // For cancelled bookings by provider, show penalty badge
  if (paymentStatus === 'REFUNDED' && cancelledBy === 'PROVIDER') {
    return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: AlertTriangle, label: 'Cancelled - Penalty Applied' }
  }
  
  const styles: Record<string, { bg: string; text: string; border: string; icon: typeof Wallet; label: string }> = {
    HELD_IN_ESCROW: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: Wallet, label: 'Payment Held in Escrow' },
    RELEASED: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle, label: 'Payment Released' },
    REFUNDED: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', icon: Ban, label: 'Refunded' },
    PENALTY_APPLIED: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: AlertTriangle, label: 'Penalty Applied' },
  }
  return styles[paymentStatus] || null
}

// Helper to check if service time has passed
const hasServiceTimePassed = (date: string, endTime: string): boolean => {
  const bookingEnd = new Date(`${date}T${endTime}`)
  return new Date() > bookingEnd
}

// Helper to get completion method label and styles
const getCompletionMethodInfo = (method?: string) => {
  const methods: Record<string, { label: string; icon: typeof CheckCircle; color: string; bg: string }> = {
    MANUAL: { label: 'Completed (Manual)', icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-100' },
    QR: { label: 'Completed (QR)', icon: QrCode, color: 'text-blue-700', bg: 'bg-blue-100' },
    AUTO: { label: 'Completed (Auto)', icon: Clock, color: 'text-amber-700', bg: 'bg-amber-100' },
    CUSTOMER: { label: 'Completed (Customer)', icon: User, color: 'text-purple-700', bg: 'bg-purple-100' },
  }
  return method ? methods[method] : null
}

export default function Bookings() {
  const { salonId, loading: salonLoading, hasSalon } = useSalon()
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [updating, setUpdating] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null) // 'complete' | 'noshow' | 'cancel'

  const fetchBookings = async () => {
    if (!salonId) return
    try {
      const response = await api.getBookings(salonId)
      if (response.success && response.data) {
        setBookings(Array.isArray(response.data) ? response.data : [])
      } else {
        setBookings([])
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [salonId])

  const handleUpdateStatus = async (status: 'CONFIRMED' | 'CANCELLED') => {
    if (!salonId || !selectedBooking) return
    
    setUpdating(true)
    try {
      await api.updateBookingStatus(salonId, selectedBooking.id, status)
      // Refresh bookings list
      await fetchBookings()
      // Update selected booking with new status
      setSelectedBooking(prev => prev ? { ...prev, status } : null)
    } catch (error) {
      console.error('Failed to update booking status:', error)
      alert('Failed to update booking status. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const handleCompleteBooking = async () => {
    if (!selectedBooking) return
    
    const confirmed = window.confirm(
      `Complete this service and release payment of GH₵ ${selectedBooking.totalAmount}?\n\nPayment of GH₵ ${selectedBooking.totalAmount} will be released to your account.`
    )
    if (!confirmed) return

    setActionLoading('complete')
    try {
      await api.completeBooking(selectedBooking.id)
      await fetchBookings()
      setSelectedBooking(prev => prev ? { ...prev, status: 'COMPLETED', paymentStatus: 'RELEASED' } : null)
    } catch (error) {
      console.error('Failed to complete booking:', error)
      alert('Failed to complete booking. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkNoShow = async () => {
    if (!selectedBooking) return
    
    const confirmed = window.confirm(
      `Mark this customer as a no-show?\n\nThis affects their account standing.`
    )
    if (!confirmed) return

    setActionLoading('noshow')
    try {
      await api.markNoShow(selectedBooking.id)
      await fetchBookings()
      setSelectedBooking(prev => prev ? { ...prev, status: 'NO_SHOW' } : null)
    } catch (error) {
      console.error('Failed to mark no-show:', error)
      alert('Failed to mark as no-show. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelAsProvider = async () => {
    if (!selectedBooking || !cancelReason.trim()) {
      alert('Please provide a reason for cancellation.')
      return
    }

    setActionLoading('cancel')
    try {
      await api.cancelBookingAsProvider(selectedBooking.id, cancelReason.trim())
      await fetchBookings()
      setSelectedBooking(prev => prev ? { ...prev, status: 'CANCELLED', cancelledBy: 'PROVIDER', cancellationReason: cancelReason.trim() } : null)
      setShowCancelModal(false)
      setCancelReason('')
    } catch (error) {
      console.error('Failed to cancel booking:', error)
      alert('Failed to cancel booking. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredBookings = (bookings || []).filter(booking => {
    const matchesTab = activeTab === 'all' || booking.status === activeTab
    const customerName = `${booking.customer?.firstName || ''} ${booking.customer?.lastName || ''}`.toLowerCase()
    const matchesSearch = customerName.includes(searchQuery.toLowerCase()) || 
                          booking.service?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatTime = (time: string) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  return (
    <Layout activeTab="bookings">
      {/* No Salon Setup Warning */}
      {hasSalon === false && !loading && (
        <div className="card text-center py-12 mb-6">
          <div className="w-20 h-20 bg-ghana-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-10 h-10 text-ghana-gold" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Set up your salon first</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            You need to create your salon profile before you can manage bookings.
          </p>
          <Link 
            to="/settings" 
            className="btn-primary inline-flex items-center gap-2"
          >
            Create Salon Profile
            <ArrowRightCircle className="w-5 h-5" />
          </Link>
        </div>
      )}

      {/* Normal Bookings UI - only show if hasSalon is true */}
      {(hasSalon === true || hasSalon === null) && (
        <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-500">Manage your salon appointments</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer or service..."
            className="input-field pl-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === tab.key
                ? 'bg-ghana-green text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-ghana-green border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading bookings...</p>
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBookings.map((booking) => {
            const statusStyles = getStatusStyles(booking.status)
            return (
              <div 
                key={booking.id} 
                className="card hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedBooking(booking)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-ghana-green/10 rounded-full flex items-center justify-center">
                      <span className="text-ghana-green font-semibold">
                        {booking.customer?.firstName?.[0]}{booking.customer?.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {booking.customer?.firstName} {booking.customer?.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">{booking.customer?.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles.bg} ${statusStyles.text} ${statusStyles.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyles.dot}`}></span>
                      {booking.status}
                    </span>
                    {booking.isGroupBooking && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                        <Users className="w-3 h-3" />
                        Group · {booking.totalPeople || booking.guests?.length || 0} guests
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{formatDate(booking.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{booking.worker?.fullName || 'Any staff'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="font-medium text-gray-900">{booking.service?.name}</span>
                  <span className="font-bold text-ghana-green">GH₵ {booking.totalAmount}</span>
                </div>
                
                {/* Payment Status Badge */}
                {(() => {
                  const paymentStyles = getPaymentStatusStyles(booking.paymentStatus, booking.cancelledBy)
                  if (!paymentStyles) return null
                  const PaymentIcon = paymentStyles.icon
                  return (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${paymentStyles.bg} ${paymentStyles.text} ${paymentStyles.border}`}>
                        <PaymentIcon className="w-3 h-3" />
                        {paymentStyles.label}
                      </span>
                    </div>
                  )
                })()}

                {/* Completion Status Badge */}
                {booking.serviceCompleted && booking.completionMethod && (
                  <div className="mt-2">
                    {(() => {
                      const completionInfo = getCompletionMethodInfo(booking.completionMethod)
                      if (!completionInfo) return null
                      const CompletionIcon = completionInfo.icon
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${completionInfo.bg} ${completionInfo.color}`}>
                          <CompletionIcon className="w-3 h-3" />
                          {completionInfo.label}
                          {booking.serviceCompletedAt && (
                            <span className="opacity-75">
                              · {new Date(booking.serviceCompletedAt).toLocaleDateString()}
                            </span>
                          )}
                        </span>
                      )
                    })()}
                  </div>
                )}

                {/* Dispute Badge */}
                {booking.disputeRaised && (
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      <AlertTriangle className="w-3 h-3" />
                      Dispute Raised
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {searchQuery 
              ? 'No bookings match your search criteria. Try adjusting your filters.' 
              : 'You don\'t have any bookings yet. Bookings will appear here when customers make appointments.'}
          </p>
        </div>
      )}
        </>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedBooking(null)}>
          <div 
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Booking Details</h2>
              <button 
                onClick={() => setSelectedBooking(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-center">
                {(() => {
                  const statusStyles = getStatusStyles(selectedBooking.status)
                  return (
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${statusStyles.bg} ${statusStyles.text} ${statusStyles.border}`}>
                      <span className={`w-2 h-2 rounded-full ${statusStyles.dot}`}></span>
                      {selectedBooking.status}
                    </span>
                  )
                })()}
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Customer</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-ghana-green/10 rounded-full flex items-center justify-center">
                    <span className="text-ghana-green font-semibold text-lg">
                      {selectedBooking.customer?.firstName?.[0]}{selectedBooking.customer?.lastName?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedBooking.customer?.firstName} {selectedBooking.customer?.lastName}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedBooking.customer?.phoneNumber && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <a href={`tel:${selectedBooking.customer.phoneNumber}`} className="hover:text-ghana-green">
                        {selectedBooking.customer.phoneNumber}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Service</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-ghana-green/10 rounded-lg flex items-center justify-center">
                    <Scissors className="w-5 h-5 text-ghana-green" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{selectedBooking.service?.name}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {selectedBooking.service?.duration || '-'} min
                      </span>
                    </div>
                  </div>
                  <p className="font-bold text-ghana-green text-lg">GH₵ {selectedBooking.totalAmount}</p>
                </div>
              </div>

              {/* Date & Time */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Date & Time</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-ghana-green/10 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-ghana-green" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{formatDate(selectedBooking.date)}</p>
                    <p className="text-sm text-gray-500">{formatTime(selectedBooking.startTime)} - {formatTime(selectedBooking.endTime)}</p>
                  </div>
                </div>
              </div>

              {/* Staff */}
              {selectedBooking.worker && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Staff Member</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-ghana-green/10 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-ghana-green" />
                    </div>
                    <p className="font-semibold text-gray-900">{selectedBooking.worker.fullName}</p>
                  </div>
                </div>
              )}

              {/* Group Members */}
              {selectedBooking.isGroupBooking && selectedBooking.guests && selectedBooking.guests.length > 0 && (
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-purple-600" />
                    <h3 className="text-sm font-medium text-purple-700">Group Members ({selectedBooking.guests.length})</h3>
                  </div>
                  <div className="space-y-3">
                    {selectedBooking.guests.map((guest, index) => (
                      <div key={guest.id} className="bg-white rounded-lg p-3 border border-purple-100">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-xs font-semibold text-purple-700">
                              {index + 1}
                            </span>
                            <span className="font-medium text-gray-900">{guest.guestName}</span>
                            {guest.isChild && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">Child</span>
                            )}
                          </div>
                          {guest.checkedIn ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                              <Check className="w-3 h-3" />
                              Checked In
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Scissors className="w-3.5 h-3.5 text-gray-400" />
                            <span className="truncate">{guest.service?.name}</span>
                          </div>
                          {guest.staff && (
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              <span className="truncate">{guest.staff.fullName}</span>
                            </div>
                          )}
                          {guest.guestPhone && (
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <span>{guest.guestPhone}</span>
                            </div>
                          )}
                          {guest.guestAgeGroup && (
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <span className="text-xs text-gray-400">Age:</span>
                              <span>{guest.guestAgeGroup}</span>
                            </div>
                          )}
                        </div>
                        {guest.specialInstructions && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500">
                              <span className="font-medium">Note:</span> {guest.specialInstructions}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {selectedBooking.groupBookingRef && (
                    <p className="mt-3 text-xs text-purple-600">
                      Group Ref: {selectedBooking.groupBookingRef}
                    </p>
                  )}
                </div>
              )}

              {/* Escrow Details */}
              {selectedBooking.escrow && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-medium text-blue-700">Escrow Details</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Status</span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        selectedBooking.escrow.status === 'HELD' ? 'bg-blue-100 text-blue-700' :
                        selectedBooking.escrow.status === 'RELEASED' ? 'bg-green-100 text-green-700' :
                        selectedBooking.escrow.status === 'REFUNDED' ? 'bg-gray-100 text-gray-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {selectedBooking.escrow.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Amount Held</span>
                      <span className="font-semibold text-gray-900">GH₵ {selectedBooking.escrow.amountHeld}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Platform Fee</span>
                      <span className="text-sm text-gray-700">- GH₵ {selectedBooking.escrow.platformFee}</span>
                    </div>
                    <div className="pt-2 border-t border-blue-200 flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-700">Your Share</span>
                      <span className="font-bold text-blue-700">GH₵ {selectedBooking.escrow.providerAmount}</span>
                    </div>
                  </div>
                  {selectedBooking.refundEligible !== undefined && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="flex items-center gap-2">
                        {selectedBooking.refundEligible ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-green-700">Eligible for refund</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            <span className="text-xs text-amber-700">Refund window has passed</span>
                          </>
                        )}
                      </div>
                      {selectedBooking.cancellationDeadline && (
                        <p className="text-xs text-gray-500 mt-1">
                          Deadline: {new Date(selectedBooking.cancellationDeadline).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Service Completion Details */}
              {selectedBooking.serviceCompleted && (
                <div className={`rounded-xl p-4 border ${selectedBooking.disputeRaised ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    {selectedBooking.disputeRaised ? (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    <h3 className={`text-sm font-medium ${selectedBooking.disputeRaised ? 'text-red-700' : 'text-green-700'}`}>
                      {selectedBooking.disputeRaised ? 'Service Completion - Dispute Raised' : 'Service Completion'}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {selectedBooking.completionMethod && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Completion Method</span>
                        {(() => {
                          const completionInfo = getCompletionMethodInfo(selectedBooking.completionMethod)
                          if (!completionInfo) return <span className="text-sm text-gray-900">{selectedBooking.completionMethod}</span>
                          const CompletionIcon = completionInfo.icon
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${completionInfo.bg} ${completionInfo.color}`}>
                              <CompletionIcon className="w-3 h-3" />
                              {completionInfo.label}
                            </span>
                          )
                        })()}
                      </div>
                    )}
                    {selectedBooking.serviceCompletedAt && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Completed At</span>
                        <span className="text-sm text-gray-900">
                          {new Date(selectedBooking.serviceCompletedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedBooking.customerConfirmed !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Customer Confirmed</span>
                        <span className={`text-sm font-medium ${selectedBooking.customerConfirmed ? 'text-green-600' : 'text-amber-600'}`}>
                          {selectedBooking.customerConfirmed ? 'Yes' : 'Pending'}
                        </span>
                      </div>
                    )}
                    {selectedBooking.disputeRaised && (
                      <div className="mt-2 p-3 bg-red-100 rounded-lg">
                        <p className="text-sm text-red-700">
                          <span className="font-medium">Dispute Status:</span> A dispute has been raised for this booking. Please contact support for assistance.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedBooking.notes && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Notes</h3>
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <p className="text-gray-700">{selectedBooking.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {selectedBooking.status === 'PENDING' && (
              <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                <div className="flex gap-3">
                  <button
                    onClick={() => handleUpdateStatus('CANCELLED')}
                    disabled={updating}
                    className="flex-1 px-4 py-3 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {updating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <X className="w-5 h-5" />
                        Reject
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('CONFIRMED')}
                    disabled={updating}
                    className="flex-1 px-4 py-3 bg-ghana-green text-white rounded-xl font-medium hover:bg-ghana-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {updating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Accept
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons for CONFIRMED bookings */}
            {selectedBooking.status === 'CONFIRMED' && (
              <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                {/* Payment Status Info */}
                {selectedBooking.paymentStatus === 'HELD_IN_ESCROW' && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-blue-700">
                      Payment of GH₵ {selectedBooking.totalAmount} is held in escrow
                    </span>
                  </div>
                )}
                
                <div className="space-y-3">
                  {/* Mark Complete - Only show if service time has passed */}
                  {hasServiceTimePassed(selectedBooking.date, selectedBooking.endTime) && (
                    <button
                      onClick={handleCompleteBooking}
                      disabled={actionLoading === 'complete'}
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {actionLoading === 'complete' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Mark Complete
                        </>
                      )}
                    </button>
                  )}
                  
                  <div className="flex gap-3">
                    {/* Mark No-Show */}
                    <button
                      onClick={handleMarkNoShow}
                      disabled={actionLoading === 'noshow'}
                      className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {actionLoading === 'noshow' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5" />
                          No-Show
                        </>
                      )}
                    </button>
                    
                    {/* Cancel Booking */}
                    <button
                      onClick={() => setShowCancelModal(true)}
                      disabled={actionLoading === 'cancel'}
                      className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {actionLoading === 'cancel' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <X className="w-5 h-5" />
                          Cancel
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancel Booking Modal */}
      {showCancelModal && selectedBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowCancelModal(false)}>
          <div 
            className="bg-white rounded-2xl shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Cancel Booking</h2>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Penalty Warning */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-red-800">Warning: Penalty Applied</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Cancelling will incur a penalty affecting your visibility and search ranking. 
                      This is to protect customers from last-minute cancellations.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Reason Textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Cancellation <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a reason for cancelling this booking..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ghana-green focus:border-transparent resize-none"
                  rows={4}
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false)
                    setCancelReason('')
                  }}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleCancelAsProvider}
                  disabled={actionLoading === 'cancel' || !cancelReason.trim()}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading === 'cancel' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <X className="w-5 h-5" />
                      Confirm Cancellation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

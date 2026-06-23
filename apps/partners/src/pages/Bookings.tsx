import { useState, useEffect, useRef, useCallback } from 'react'
import Icon from '../components/Icon'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { api, Booking } from '../lib/api'
import { useSalon } from '../store/SalonContext'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'

type TabFilter = 'all' | 'upcoming' | 'completed' | 'cancelled' | 'queue'

interface QueueStats {
  totalQueued: number;
  checkedInCount: number;
  notCheckedInCount: number;
  rescheduledCount: number;
}

const getStatusStyles = (status: string) => {
  const styles: Record<string, { bg: string; text: string; border: string; dot: string; leftBorder: string }> = {
    PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', leftBorder: 'border-l-[#FCD116]' },
    CONFIRMED: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500', leftBorder: 'border-l-[#006B3F]' },
    IN_PROGRESS: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', leftBorder: 'border-l-blue-500' },
    COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500', leftBorder: 'border-l-blue-600' },
    CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', leftBorder: 'border-l-[#CE1126]' },
    NO_SHOW: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500', leftBorder: 'border-l-gray-400' },
  }
  return styles[status] || styles.PENDING
}

const getPaymentStatusStyles = (paymentStatus?: string, cancelledBy?: string) => {
  if (!paymentStatus) return null
  
  // For cancelled bookings by provider, show penalty badge
  if (paymentStatus === 'REFUNDED' && cancelledBy === 'PROVIDER') {
    return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: 'warning', label: 'Cancelled - Penalty Applied' }
  }
  
  const styles: Record<string, { bg: string; text: string; border: string; icon: string; label: string }> = {
    HELD_IN_ESCROW: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: 'account_balance_wallet', label: 'Payment Held in Escrow' },
    RELEASED: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: 'check_circle', label: 'Payment Released' },
    REFUNDED: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', icon: 'block', label: 'Refunded' },
    PENALTY_APPLIED: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: 'warning', label: 'Penalty Applied' },
  }
  return styles[paymentStatus] || null
}

// Active statuses that get a pulsing dot
const ACTIVE_STATUSES = new Set(['CONFIRMED', 'IN_PROGRESS'])

// Helper to check if service time has passed
const hasServiceTimePassed = (date: string, endTime: string): boolean => {
  const bookingEnd = new Date(`${date}T${endTime}`)
  return new Date() > bookingEnd
}

// Helper to get completion method label and styles
const getCompletionMethodInfo = (method?: string) => {
  const methods: Record<string, { label: string; icon: string; color: string; bg: string }> = {
    MANUAL: { label: 'Completed (Manual)', icon: 'check_circle', color: 'text-green-700', bg: 'bg-green-100' },
    QR: { label: 'Completed (QR)', icon: 'qr_code', color: 'text-blue-700', bg: 'bg-blue-100' },
    AUTO: { label: 'Completed (Auto)', icon: 'schedule', color: 'text-amber-700', bg: 'bg-amber-100' },
    CUSTOMER: { label: 'Completed (Customer)', icon: 'person', color: 'text-purple-700', bg: 'bg-purple-100' },
  }
  return method ? methods[method] : null
}

export default function Bookings() {
  const { salonId, loading: salonLoading, hasSalon } = useSalon()
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [queueData, setQueueData] = useState<Booking[]>([])
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [queueLoading, setQueueLoading] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [updating, setUpdating] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null) // 'complete' | 'noshow' | 'cancel'
  
  // Check-in modal states
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [checkinCode, setCheckinCode] = useState('')
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [checkinSuccess, setCheckinSuccess] = useState<{ customerName: string; queuePosition?: number } | null>(null)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const qrScannerRef = useRef<Html5QrcodeScanner | null>(null)

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

  const fetchQueue = async () => {
    if (!salonId) return
    setQueueLoading(true)
    try {
      const response = await api.getSalonQueue(salonId)
      if (response.success && response.data) {
        setQueueData(response.data.queue || [])
        setQueueStats(response.data.stats || null)
      } else {
        setQueueData([])
        setQueueStats(null)
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error)
      setQueueData([])
      setQueueStats(null)
    } finally {
      setQueueLoading(false)
    }
  }

  // QR Scanner effect
  useEffect(() => {
    if (showQrScanner && !qrScannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        },
        false
      )
      
      scanner.render(
        (decodedText) => {
          // On success
          handleQrScanSuccess(decodedText)
        },
        (error) => {
          // Ignore frequent scan errors (no QR found)
        }
      )
      qrScannerRef.current = scanner
    }
    
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.clear().catch(console.error)
        qrScannerRef.current = null
      }
    }
  }, [showQrScanner])

  const handleQrScanSuccess = async (decodedText: string) => {
    setCheckinLoading(true)
    setScannerError(null)
    try {
      const response = await api.checkinByQr({ qrData: decodedText })
      if (response.success && response.data) {
        const booking = response.data.booking
        setCheckinSuccess({
          customerName: `${booking.customer?.firstName || ''} ${booking.customer?.lastName || ''}`.trim() || 'Customer',
          queuePosition: booking.queuePosition
        })
        // Refresh queue data
        fetchQueue()
        fetchBookings()
        // Close scanner after success
        setTimeout(() => {
          setShowQrScanner(false)
          if (qrScannerRef.current) {
            qrScannerRef.current.clear().catch(console.error)
            qrScannerRef.current = null
          }
        }, 2000)
      }
    } catch (error) {
      console.error('QR check-in failed:', error)
      setScannerError(error instanceof Error ? error.message : 'Check-in failed. Please try again.')
    } finally {
      setCheckinLoading(false)
    }
  }

  const handleCodeCheckin = async () => {
    if (!checkinCode.trim()) return
    
    setCheckinLoading(true)
    setScannerError(null)
    try {
      const response = await api.checkinByQr({ checkinCode: checkinCode.trim().toUpperCase() })
      if (response.success && response.data) {
        const booking = response.data.booking
        setCheckinSuccess({
          customerName: `${booking.customer?.firstName || ''} ${booking.customer?.lastName || ''}`.trim() || 'Customer',
          queuePosition: booking.queuePosition
        })
        // Refresh queue data
        fetchQueue()
        fetchBookings()
        // Reset and close after success
        setTimeout(() => {
          setShowCodeInput(false)
          setCheckinCode('')
        }, 2000)
      }
    } catch (error) {
      console.error('Code check-in failed:', error)
      setScannerError(error instanceof Error ? error.message : 'Check-in failed. Please try again.')
    } finally {
      setCheckinLoading(false)
    }
  }

  const closeCheckinModal = () => {
    setShowQrScanner(false)
    setShowCodeInput(false)
    setCheckinCode('')
    setCheckinSuccess(null)
    setScannerError(null)
    if (qrScannerRef.current) {
      qrScannerRef.current.clear().catch(console.error)
      qrScannerRef.current = null
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [salonId])

  useEffect(() => {
    if (activeTab === 'queue' && salonId) {
      fetchQueue()
    }
  }, [activeTab, salonId])

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
      alert('Booking has been cancelled. A full refund will be issued to the customer within 3-5 business days.')
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
    { key: 'queue', label: 'Queue' },
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
      <div className="page-enter">
      {/* No Salon Setup Warning */}
      {hasSalon === false && !loading && (
        <div className="card-v2 text-center py-12 mb-6 border-l-4 border-l-ghana-gold">
          <div className="w-24 h-24 bg-ghana-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="store" size={48} className="text-ghana-gold" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Set up your salon first</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            You need to create your salon profile before you can manage bookings.
          </p>
          <Link
            to="/settings"
            className="btn-primary btn-ripple inline-flex items-center gap-2"
          >
            Create Salon Profile
            <Icon name="arrow_forward" size={20} />
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

      {/* Check-in Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <button
          onClick={() => setShowQrScanner(true)}
          className="btn-ripple inline-flex items-center justify-center gap-2 px-4 py-3 bg-ghana-green text-white rounded-xl font-medium hover:bg-ghana-green/90 transition-colors shadow-sm min-h-[44px]"
        >
          <Icon name="qr_code_scanner" size={20} />
          Scan QR
        </button>
        <button
          onClick={() => setShowCodeInput(true)}
          className="btn-ripple inline-flex items-center justify-center gap-2 px-4 py-3 bg-white text-ghana-green border-2 border-ghana-green rounded-xl font-medium hover:bg-ghana-green/5 transition-colors min-h-[44px]"
        >
          <Icon name="keyboard" size={20} />
          Enter Code
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Icon name="search" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer or service..."
            className="input-field pl-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs - Pill-style, scrollable on mobile */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`tab-pill ${activeTab === tab.key ? 'tab-pill-active' : 'tab-pill-inactive'} whitespace-nowrap flex-shrink-0 min-h-[44px]`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Queue Tab Content */}
      {activeTab === 'queue' && (
        <>
          {/* Queue Stats Bar */}
          {queueStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="card-v2 bg-ghana-green/5 border-l-4 border-l-ghana-green">
                <div className="text-center">
                  <p className="text-2xl font-bold text-ghana-green">{queueStats.totalQueued}</p>
                  <p className="text-sm text-gray-600">Total Queued</p>
                </div>
              </div>
              <div className="card-v2 bg-green-50 border-l-4 border-l-green-500">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-700">{queueStats.checkedInCount}</p>
                  <p className="text-sm text-gray-600">Checked In</p>
                </div>
              </div>
              <div className="card-v2 bg-amber-50 border-l-4 border-l-amber-500">
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-700">{queueStats.notCheckedInCount}</p>
                  <p className="text-sm text-gray-600">Not Yet</p>
                </div>
              </div>
              <div className="card-v2 bg-purple-50 border-l-4 border-l-purple-500">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-700">{queueStats.rescheduledCount}</p>
                  <p className="text-sm text-gray-600">Rescheduled</p>
                </div>
              </div>
            </div>
          )}

          {/* Queue List */}
          {queueLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-v2 flex items-center gap-4 p-6">
                  <div className="skeleton-shimmer w-12 h-12 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton-shimmer h-4 w-1/3" />
                    <div className="skeleton-shimmer h-3 w-1/4" />
                    <div className="flex gap-4 mt-1">
                      <div className="skeleton-shimmer h-3 w-16" />
                      <div className="skeleton-shimmer h-3 w-12" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : queueData.length > 0 ? (
            <div className="space-y-3">
              {queueData
                .sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0))
                .map((booking, index) => (
                  <div
                    key={booking.id}
                    className="card-v2 cursor-pointer flex items-center gap-4 animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => setSelectedBooking(booking)}
                  >
                    {/* Position Number */}
                    <div className="flex-shrink-0 w-12 h-12 bg-ghana-green rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {booking.queuePosition || index + 1}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {booking.customer?.firstName} {booking.customer?.lastName}
                        </h3>
                        {booking.checkedIn ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Checked In
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                            <Icon name="schedule" size={12} />
                            Waiting
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{booking.customer?.phoneNumber}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Icon name="content_cut" size={14} />
                          {booking.service?.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="schedule" size={14} />
                          {booking.service?.duration || '-'} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="calendar_today" size={14} />
                          {formatTime(booking.startTime)}
                        </span>
                      </div>
                    </div>

                    {/* Chevron */}
                    <Icon name="chevron_right" size={20} className="text-gray-400 flex-shrink-0" />
                  </div>
                ))}
            </div>
          ) : (
            <div className="card-v2 text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="group" size={48} className="text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No customers in queue</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                There are no confirmed bookings for today. Customers will appear here when they book appointments.
              </p>
            </div>
          )}
        </>
      )}

      {/* Bookings Grid - Show for non-queue tabs */}
      {activeTab !== 'queue' && (
        loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card-v2 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="skeleton-shimmer w-12 h-12 rounded-full" />
                    <div className="space-y-2">
                      <div className="skeleton-shimmer h-4 w-24" />
                      <div className="skeleton-shimmer h-3 w-20" />
                    </div>
                  </div>
                  <div className="skeleton-shimmer h-6 w-20 rounded-full" />
                </div>
                <div className="space-y-2 mb-4">
                  <div className="skeleton-shimmer h-3 w-3/4" />
                  <div className="skeleton-shimmer h-3 w-1/2" />
                  <div className="skeleton-shimmer h-3 w-2/3" />
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="skeleton-shimmer h-4 w-24" />
                  <div className="skeleton-shimmer h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredBookings.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBookings.map((booking) => {
            const statusStyles = getStatusStyles(booking.status)
            return (
              <div
                key={booking.id}
                className={`card-v2 cursor-pointer border-l-4 ${statusStyles.leftBorder}`}
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
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyles.dot} ${ACTIVE_STATUSES.has(booking.status) ? 'animate-pulse' : ''}`}></span>
                      {booking.status}
                    </span>
                    {booking.isGroupBooking && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                        <Icon name="group" size={12} />
                        Group · {booking.totalPeople || booking.guests?.length || 0} guests
                      </span>
                    )}
                    {/* Check-in Status Badge */}
                    {booking.checkedIn && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                        <Icon name="check" size={12} />
                        Checked In
                      </span>
                    )}
                    {/* Queue Position Badge */}
                    {booking.queuePosition && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-ghana-green/10 text-ghana-green border border-ghana-green/20">
                        <Icon name="tag" size={12} />
                        #{booking.queuePosition}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Icon name="calendar_today" size={16} className="text-gray-400" />
                    <span className="text-gray-600">{formatDate(booking.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Icon name="schedule" size={16} className="text-gray-400" />
                    <span className="text-gray-600">{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Icon name="person" size={16} className="text-gray-400" />
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
                  return (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${paymentStyles.bg} ${paymentStyles.text} ${paymentStyles.border}`}>
                        <Icon name={paymentStyles.icon} size={12} />
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
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${completionInfo.bg} ${completionInfo.color}`}>
                          <Icon name={completionInfo.icon} size={12} />
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
                      <Icon name="warning" size={12} />
                      Dispute Raised
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card-v2 text-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="calendar_today" size={48} className="text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No bookings found</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {searchQuery
              ? 'No bookings match your search criteria. Try adjusting your filters.'
              : 'You don\'t have any bookings yet. Bookings will appear here when customers make appointments.'}
          </p>
        </div>
      )
      )}
        </>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 glass-dark" onClick={() => setSelectedBooking(null)}>
          <div
            className="bg-white rounded-none sm:rounded-2xl shadow-elevated w-full max-w-lg h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Booking Details</h2>
              <button 
                onClick={() => setSelectedBooking(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon name="close" size={20} className="text-gray-500" />
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
                      <span className={`w-2 h-2 rounded-full ${statusStyles.dot} ${ACTIVE_STATUSES.has(selectedBooking.status) ? 'animate-pulse' : ''}`}></span>
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
                      <Icon name="call" size={16} className="text-gray-400" />
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
                    <Icon name="content_cut" size={20} className="text-ghana-green" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{selectedBooking.service?.name}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Icon name="schedule" size={14} />
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
                    <Icon name="calendar_today" size={20} className="text-ghana-green" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{formatDate(selectedBooking.date)}</p>
                    <p className="text-sm text-gray-500">{formatTime(selectedBooking.startTime)} - {formatTime(selectedBooking.endTime)}</p>
                  </div>
                </div>
              </div>

              {/* Check-in Status */}
              {(selectedBooking.checkedIn || selectedBooking.queuePosition) && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <h3 className="text-sm font-medium text-green-700 mb-3">Check-in Status</h3>
                  <div className="space-y-2">
                    {selectedBooking.checkedIn && (
                      <div className="flex items-center gap-2">
                        <Icon name="check_circle" size={20} className="text-green-600" />
                        <span className="text-sm text-green-700">
                          Checked in{selectedBooking.checkedInAt && ` at ${new Date(selectedBooking.checkedInAt).toLocaleTimeString()}`}
                        </span>
                      </div>
                    )}
                    {selectedBooking.queuePosition && (
                      <div className="flex items-center gap-2">
                        <Icon name="tag" size={20} className="text-ghana-green" />
                        <span className="text-sm text-gray-700">
                          Queue Position: <span className="font-semibold text-ghana-green">#{selectedBooking.queuePosition}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Staff */}
              {selectedBooking.worker && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Staff Member</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-ghana-green/10 rounded-lg flex items-center justify-center">
                      <Icon name="person" size={20} className="text-ghana-green" />
                    </div>
                    <p className="font-semibold text-gray-900">{selectedBooking.worker.fullName}</p>
                  </div>
                </div>
              )}

              {/* Group Members */}
              {selectedBooking.isGroupBooking && selectedBooking.guests && selectedBooking.guests.length > 0 && (
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon name="group" size={20} className="text-purple-600" />
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
                              <Icon name="check" size={12} />
                              Checked In
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              <Icon name="schedule" size={12} />
                              Pending
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Icon name="content_cut" size={14} className="text-gray-400" />
                            <span className="truncate">{guest.service?.name}</span>
                          </div>
                          {guest.staff && (
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Icon name="person" size={14} className="text-gray-400" />
                              <span className="truncate">{guest.staff.fullName}</span>
                            </div>
                          )}
                          {guest.guestPhone && (
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Icon name="call" size={14} className="text-gray-400" />
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
                    <Icon name="account_balance_wallet" size={20} className="text-blue-600" />
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
                            <Icon name="check_circle" size={16} className="text-green-600" />
                            <span className="text-xs text-green-700">Eligible for refund</span>
                          </>
                        ) : (
                          <>
                            <Icon name="error" size={16} className="text-amber-600" />
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
                      <Icon name="warning" size={20} className="text-red-600" />
                    ) : (
                      <Icon name="check_circle" size={20} className="text-green-600" />
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
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${completionInfo.bg} ${completionInfo.color}`}>
                              <Icon name={completionInfo.icon} size={12} />
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
                    <Icon name="description" size={20} className="text-gray-400 mt-0.5" />
                    <p className="text-gray-700">{selectedBooking.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {selectedBooking.status === 'PENDING' && (
              <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleUpdateStatus('CANCELLED')}
                    disabled={updating}
                    className="btn-ripple flex-1 px-4 py-3 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    {updating ? (
                      <Icon name="progress_activity" size={20} className="animate-spin" />
                    ) : (
                      <>
                        <Icon name="close" size={20} />
                        Reject
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('CONFIRMED')}
                    disabled={updating}
                    className="btn-ripple flex-1 px-4 py-3 bg-ghana-green text-white rounded-xl font-medium hover:bg-ghana-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    {updating ? (
                      <Icon name="progress_activity" size={20} className="animate-spin" />
                    ) : (
                      <>
                        <Icon name="check" size={20} />
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
                    <Icon name="account_balance_wallet" size={20} className="text-blue-600" />
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
                      className="btn-ripple w-full px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
                    >
                      {actionLoading === 'complete' ? (
                        <Icon name="progress_activity" size={20} className="animate-spin" />
                      ) : (
                        <>
                          <Icon name="check_circle" size={20} />
                          Mark Complete
                        </>
                      )}
                    </button>
                  )}
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Mark No-Show */}
                    <button
                      onClick={handleMarkNoShow}
                      disabled={actionLoading === 'noshow'}
                      className="btn-ripple flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
                    >
                      {actionLoading === 'noshow' ? (
                        <Icon name="progress_activity" size={20} className="animate-spin" />
                      ) : (
                        <>
                          <Icon name="error" size={20} />
                          No-Show
                        </>
                      )}
                    </button>
                    
                    {/* Cancel Booking */}
                    <button
                      onClick={() => setShowCancelModal(true)}
                      disabled={actionLoading === 'cancel'}
                      className="btn-ripple flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
                    >
                      {actionLoading === 'cancel' ? (
                        <Icon name="progress_activity" size={20} className="animate-spin" />
                      ) : (
                        <>
                          <Icon name="close" size={20} />
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
        <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-0 sm:p-4 glass-dark" onClick={() => setShowCancelModal(false)}>
          <div
            className="bg-white rounded-none sm:rounded-2xl shadow-elevated w-full max-w-md h-[100dvh] sm:h-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">Cancel Booking</h2>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Penalty Warning */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Icon name="warning" size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
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
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false)
                    setCancelReason('')
                  }}
                  className="btn-ripple flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors min-h-[44px]"
                >
                  Go Back
                </button>
                <button
                  onClick={handleCancelAsProvider}
                  disabled={actionLoading === 'cancel' || !cancelReason.trim()}
                  className="btn-ripple flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
                >
                  {actionLoading === 'cancel' ? (
                    <Icon name="progress_activity" size={20} className="animate-spin" />
                  ) : (
                    <>
                      <Icon name="close" size={20} />
                      Confirm Cancellation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showQrScanner && (
        <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-0 sm:p-4 glass-dark" onClick={closeCheckinModal}>
          <div
            className="bg-white rounded-none sm:rounded-2xl shadow-elevated w-full max-w-md h-[100dvh] sm:h-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">Scan QR Code</h2>
              <button 
                onClick={closeCheckinModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Icon name="close" size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-4 pb-8 sm:pb-4">
              {checkinSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="check_circle" size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Check-in Successful!</h3>
                  <p className="text-gray-600">
                    <span className="font-medium">{checkinSuccess.customerName}</span> has been checked in
                  </p>
                  {checkinSuccess.queuePosition && (
                    <p className="text-sm text-gray-500 mt-1">
                      Queue Position: <span className="font-semibold text-ghana-green">#{checkinSuccess.queuePosition}</span>
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div id="qr-reader" className="w-full overflow-hidden rounded-lg"></div>
                  
                  {checkinLoading && (
                    <div className="flex items-center justify-center gap-2 mt-4 text-ghana-green">
                      <Icon name="progress_activity" size={20} className="animate-spin" />
                      <span>Processing check-in...</span>
                    </div>
                  )}
                  
                  {scannerError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <Icon name="error" size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-red-700">{scannerError}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enter Code Modal */}
      {showCodeInput && (
        <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-0 sm:p-4 glass-dark" onClick={closeCheckinModal}>
          <div
            className="bg-white rounded-none sm:rounded-2xl shadow-elevated w-full max-w-md h-[100dvh] sm:h-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">Enter Check-in Code</h2>
              <button 
                onClick={closeCheckinModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Icon name="close" size={20} className="text-gray-500" />
              </button>
            </div>
      
            <div className="p-4 pb-8 sm:pb-4">
              {checkinSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="check_circle" size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Check-in Successful!</h3>
                  <p className="text-gray-600">
                    <span className="font-medium">{checkinSuccess.customerName}</span> has been checked in
                  </p>
                  {checkinSuccess.queuePosition && (
                    <p className="text-sm text-gray-500 mt-1">
                      Queue Position: <span className="font-semibold text-ghana-green">#{checkinSuccess.queuePosition}</span>
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter the customer's check-in code (format: GL-XXXX)
                  </p>
                  
                  <div className="relative">
                    <Icon name="tag" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="GL-1234"
                      value={checkinCode}
                      onChange={(e) => setCheckinCode(e.target.value.toUpperCase())}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-ghana-green focus:border-transparent"
                      maxLength={7}
                    />
                  </div>
                  
                  {scannerError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <Icon name="error" size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-red-700">{scannerError}</p>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={handleCodeCheckin}
                    disabled={checkinLoading || !checkinCode.trim()}
                    className="btn-ripple w-full mt-4 px-4 py-3 bg-ghana-green text-white rounded-xl font-medium hover:bg-ghana-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {checkinLoading ? (
                      <>
                        <Icon name="progress_activity" size={20} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Icon name="check" size={20} />
                        Check In Customer
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  )
}
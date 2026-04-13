import { useState, useEffect } from 'react'
import { Search, Calendar, Clock, User, Filter, Store, ArrowRightCircle, X, Check, Phone, Mail, FileText, Scissors, Loader2 } from 'lucide-react'
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

export default function Bookings() {
  const { salonId, loading: salonLoading, hasSalon } = useSalon()
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [updating, setUpdating] = useState(false)

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
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles.bg} ${statusStyles.text} ${statusStyles.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyles.dot}`}></span>
                    {booking.status}
                  </span>
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
          </div>
        </div>
      )}
    </Layout>
  )
}

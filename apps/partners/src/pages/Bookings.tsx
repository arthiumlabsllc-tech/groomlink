import { useState, useEffect } from 'react'
import { Search, Calendar, Clock, User, Filter, Store, ArrowRightCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { api, Booking } from '../lib/api'
import { useSalon } from '../store/SalonContext'

type TabFilter = 'all' | 'upcoming' | 'completed' | 'cancelled'

export default function Bookings() {
  const { salonId, loading: salonLoading, hasSalon } = useSalon()
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
    fetchBookings()
  }, [salonId])

  const getStatusBadge = (status: string) => {
    const styles = {
      confirmed: 'bg-ghana-green/10 text-ghana-green border-ghana-green/20',
      pending: 'bg-ghana-gold/10 text-amber-700 border-ghana-gold/20',
      cancelled: 'bg-ghana-red/10 text-ghana-red border-ghana-red/20',
      completed: 'bg-gray-100 text-gray-600 border-gray-200',
    }
    return styles[status as keyof typeof styles] || styles.pending
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
          {filteredBookings.map((booking) => (
            <div key={booking.id} className="card hover:shadow-md transition-shadow">
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
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(booking.status)}`}>
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
                  <span className="text-gray-600">{booking.startTime} - {booking.endTime}</span>
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
          ))}
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
    </Layout>
  )
}

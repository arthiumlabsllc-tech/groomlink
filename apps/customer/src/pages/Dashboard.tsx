import { useEffect, useState } from 'react'
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Star,
  ChevronRight,
  MapPin,
  Loader2,
  AlertCircle,
  Scissors
} from 'lucide-react'
import apiClient from '../lib/api'
import { useAuthStore } from '../store/auth'

// Types
interface Booking {
  id: string
  status: string
  date: string
  startTime: string
  discountAmount: number | null
  service: {
    name: string
  }
  salon: {
    businessName: string
    logo: string | null
  }
}

interface Salon {
  id: string
  businessName: string
  type: string
  rating: number
  reviewCount: number
  city: string
  logo: string | null
  images: string[]
}

interface BookingsResponse {
  data: Booking[]
  meta?: {
    total: number
  }
}

interface SalonsResponse {
  data: Salon[]
}

// Loading Skeleton Component
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-6 w-12 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function BookingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="card flex items-center gap-4 animate-pulse">
          <div className="w-16 h-16 bg-gray-200 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function SalonSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card animate-pulse">
          <div className="w-full h-32 bg-gray-200 rounded-lg mb-4" />
          <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-16 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  )
}

// Empty State Component
function EmptyState({ message, icon: Icon }: { message: string; icon: React.ElementType }) {
  return (
    <div className="card py-12 text-center">
      <Icon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">{message}</p>
    </div>
  )
}

// Error State Component
function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card py-8 text-center border-red-200 bg-red-50">
      <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
      <p className="text-red-600 text-sm mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-red-600 underline hover:text-red-700"
        >
          Try again
        </button>
      )}
    </div>
  )
}

// Helper function to format date
function formatDate(dateStr: string, startTime: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const isToday = date.toDateString() === today.toDateString()
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  const timeStr = startTime || ''

  if (isToday) return `Today, ${timeStr}`
  if (isTomorrow) return `Tomorrow, ${timeStr}`

  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  }) + `, ${timeStr}`
}

export default function Dashboard() {
  const { user } = useAuthStore()

  // Stats state
  const [upcomingCount, setUpcomingCount] = useState<number>(0)
  const [completedCount, setCompletedCount] = useState<number>(0)
  const [totalSavings, setTotalSavings] = useState<number>(0)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [bookingsError, setBookingsError] = useState<string | null>(null)

  // Salons state
  const [salons, setSalons] = useState<Salon[]>([])
  const [salonsLoading, setSalonsLoading] = useState(true)
  const [salonsError, setSalonsError] = useState<string | null>(null)

  // Fetch stats
  const fetchStats = async () => {
    setStatsLoading(true)
    setStatsError(null)
    try {
      const [upcomingRes, completedRes] = await Promise.all([
        apiClient.get<BookingsResponse>('/bookings/my?status=CONFIRMED'),
        apiClient.get<BookingsResponse>('/bookings/my?status=COMPLETED')
      ])
      setUpcomingCount(upcomingRes.data.meta?.total || upcomingRes.data.data?.length || 0)
      setCompletedCount(completedRes.data.meta?.total || completedRes.data.data?.length || 0)
      
      // Calculate total savings from discountAmount
      const completedBookings = completedRes.data.data || []
      const savings = completedBookings.reduce((total, booking) => {
        return total + (booking.discountAmount || 0)
      }, 0)
      setTotalSavings(savings)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      setStatsError('Failed to load statistics')
    } finally {
      setStatsLoading(false)
    }
  }

  // Fetch upcoming bookings
  const fetchBookings = async () => {
    setBookingsLoading(true)
    setBookingsError(null)
    try {
      const response = await apiClient.get<BookingsResponse>('/bookings/my?status=CONFIRMED&limit=3')
      setBookings(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
      setBookingsError('Failed to load upcoming appointments')
    } finally {
      setBookingsLoading(false)
    }
  }

  // Fetch nearby salons
  const fetchSalons = async () => {
    setSalonsLoading(true)
    setSalonsError(null)
    try {
      const response = await apiClient.get<SalonsResponse>('/salons?limit=4&status=APPROVED')
      setSalons(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch salons:', error)
      setSalonsError('Failed to load nearby salons')
    } finally {
      setSalonsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchBookings()
    fetchSalons()
  }, [])

  // Get user's first name with null guard
  const firstName = user?.firstName
  const welcomeMessage = firstName ? `Welcome back, ${firstName}! 👋` : 'Welcome back! 👋'

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{welcomeMessage}</h1>
        <p className="text-gray-600 mt-1">Ready to book your next appointment?</p>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <StatsSkeleton />
      ) : statsError ? (
        <ErrorState message={statsError} onRetry={fetchStats} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Upcoming Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{upcomingCount}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Visits</p>
                <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Money Saved</p>
                <p className="text-2xl font-bold text-gray-900">GH₵ {totalSavings.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
          <a href="/bookings" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View all
          </a>
        </div>
        {bookingsLoading ? (
          <BookingSkeleton />
        ) : bookingsError ? (
          <ErrorState message={bookingsError} onRetry={fetchBookings} />
        ) : bookings.length === 0 ? (
          <EmptyState message="No upcoming bookings" icon={Calendar} />
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="card flex items-center gap-4">
                <img
                  src={booking.salon?.logo || 'https://images.unsplash.com/photo-1585747860715-2d3b4c7e3a23?w=100&h=100&fit=crop'}
                  alt={booking.salon?.businessName || 'Salon'}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {booking.salon?.businessName || 'Unknown Salon'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {booking.service?.name || 'Unknown Service'}
                  </p>
                  <p className="text-sm text-primary-600 font-medium">
                    {formatDate(booking.date, booking.startTime)}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nearby Salons */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Nearby Salons</h2>
          <a href="/explore" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            Explore all
          </a>
        </div>
        {salonsLoading ? (
          <SalonSkeleton />
        ) : salonsError ? (
          <ErrorState message={salonsError} onRetry={fetchSalons} />
        ) : salons.length === 0 ? (
          <EmptyState message="No nearby salons found" icon={Scissors} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {salons.map((salon) => (
              <div key={salon.id} className="card hover:shadow-md transition-shadow cursor-pointer">
                <img
                  src={salon.logo || salon.images?.[0] || 'https://images.unsplash.com/photo-1585747860715-2d3b4c7e3a23?w=300&h=200&fit=crop'}
                  alt={salon.businessName || 'Salon'}
                  className="w-full h-32 object-cover rounded-lg mb-4"
                />
                <h3 className="font-semibold text-gray-900">
                  {salon.businessName || 'Unnamed Salon'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium">
                    {salon.rating?.toFixed(1) || '0.0'}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({salon.reviewCount || 0} reviews)
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" />
                  <span>{salon.city || 'Unknown location'}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {salon.type || 'Salon'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

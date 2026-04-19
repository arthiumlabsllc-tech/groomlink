import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import Layout from '../components/Layout'
import { api, DashboardStats, Booking, Service, Worker, KycSubmission, EarningsSummary } from '../lib/api'
import { useSalon } from '../store/SalonContext'

// Time-of-day greeting helper
function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'Good morning', emoji: '☀️' }
  if (hour < 17) return { text: 'Good afternoon', emoji: '👋' }
  return { text: 'Good evening', emoji: '🌙' }
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function getMotivationalMessage(): string {
  const messages = [
    "Let's make today productive!",
    "Ready to serve your customers?",
    "Great things are coming your way!",
    "Time to shine! ✨",
    "Make every booking count!",
  ]
  return messages[Math.floor(Math.random() * messages.length)]
}

// Skeleton Components
function StatCardSkeleton() {
  return (
    <div className="card-v2 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 skeleton-shimmer rounded-lg" />
        <div className="h-4 w-16 skeleton-shimmer rounded" />
      </div>
      <div className="h-8 w-20 skeleton-shimmer rounded mb-2" />
      <div className="h-4 w-24 skeleton-shimmer rounded" />
    </div>
  )
}

function BookingItemSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 skeleton-shimmer rounded-full" />
        <div>
          <div className="h-4 w-24 skeleton-shimmer rounded mb-1" />
          <div className="h-3 w-16 skeleton-shimmer rounded" />
        </div>
      </div>
      <div className="text-right">
        <div className="h-4 w-12 skeleton-shimmer rounded mb-1" />
        <div className="h-3 w-14 skeleton-shimmer rounded" />
      </div>
    </div>
  )
}

function WeeklyOverviewSkeleton() {
  return (
    <div className="card-v2 p-5">
      <div className="h-5 w-32 skeleton-shimmer rounded mb-4" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-4 w-24 skeleton-shimmer rounded" />
            <div className="h-4 w-12 skeleton-shimmer rounded" />
          </div>
        ))}
      </div>
      <div className="mt-6 h-14 skeleton-shimmer rounded-lg" />
    </div>
  )
}

function EarningsSkeleton() {
  return (
    <div className="card-v2 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 skeleton-shimmer rounded" />
        <div className="h-5 w-32 skeleton-shimmer rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 skeleton-shimmer rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { salonId, loading: salonLoading, salon, hasSalon, error: salonError } = useSalon()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [kycData, setKycData] = useState<KycSubmission | null>(null)
  const [dismissedApproved, setDismissedApproved] = useState(false)
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null)

  const { text: greetingText, emoji: greetingEmoji } = getGreeting()
  const motivationalMessage = getMotivationalMessage()

  // Check if user is authenticated
  useEffect(() => {
    if (!api.isAuthenticated() && !salonLoading) {
      navigate('/login')
    }
  }, [salonLoading, navigate])

  // Fetch KYC status
  useEffect(() => {
    const fetchKycStatus = async () => {
      try {
        const response = await api.getKycStatus()
        if (response.success && response.data) {
          setKycData(response.data)
        }
      } catch (err) {
        console.error('Failed to fetch KYC status:', err)
      }
    }
    fetchKycStatus()
  }, [])

  // IntersectionObserver for fade-in animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('visible')
      }),
      { threshold: 0.1 }
    )
    document.querySelectorAll('.fade-section').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [loading, salonLoading])

  useEffect(() => {
    const fetchData = async () => {
      if (!salonId) return
      try {
        const [statsRes, bookingsRes, servicesRes, workersRes, earningsRes] = await Promise.all([
          api.getDashboardStats(salonId),
          api.getBookings(salonId),
          api.getServices(salonId),
          api.getWorkers(salonId),
          api.getEarningsSummary(salonId).catch(() => ({ success: false, data: null }))
        ])
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data)
        }
        if (bookingsRes.success && bookingsRes.data) {
          setBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data : [])
        }
        if (servicesRes.success && servicesRes.data) {
          setServices(Array.isArray(servicesRes.data) ? servicesRes.data : [])
        }
        if (workersRes.success && workersRes.data) {
          setWorkers(Array.isArray(workersRes.data) ? workersRes.data : [])
        }
        if (earningsRes.success && earningsRes.data) {
          setEarnings(earningsRes.data)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [salonId])

  const activeServicesCount = (services || []).filter(s => s.isActive).length
  const activeWorkersCount = (workers || []).filter(w => w.isActive).length

  const statCards = [
    { 
      label: "Today's Bookings", 
      value: stats?.todayBookings?.toString() || '0', 
      icon: 'calendar_today', 
      trend: stats?.todayBookings ? `+${stats.todayBookings}` : '0', 
      trendUp: true,
      gradient: 'from-green-500/20 to-emerald-500/10',
      borderColor: 'border-t-green-500',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600',
      watermark: 'calendar_month'
    },
    { 
      label: 'Total Revenue', 
      value: stats?.todayRevenue ? `GH₵ ${stats.todayRevenue}` : 'GH₵ 0', 
      icon: 'payments', 
      trend: stats?.todayRevenue ? `+GH₵ ${stats.todayRevenue}` : 'GH₵ 0',
      trendUp: true,
      gradient: 'from-amber-500/20 to-yellow-500/10',
      borderColor: 'border-t-amber-500',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600',
      watermark: 'account_balance_wallet'
    },
    { 
      label: 'Active Services', 
      value: activeServicesCount.toString(), 
      icon: 'content_cut', 
      trend: `${services.length} total`, 
      trendUp: null,
      gradient: 'from-red-500/20 to-rose-500/10',
      borderColor: 'border-t-red-500',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-600',
      watermark: 'cut'
    },
    { 
      label: 'Staff Members', 
      value: activeWorkersCount.toString(), 
      icon: 'group', 
      trend: `${workers.length} total`,
      trendUp: null,
      gradient: 'from-blue-500/20 to-indigo-500/10',
      borderColor: 'border-t-blue-500',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600',
      watermark: 'groups'
    },
  ]

  const todayBookings = (bookings || []).slice(0, 5).map((booking, index) => ({
    id: booking.id || index,
    customer: `${booking.customer?.firstName || ''} ${booking.customer?.lastName || ''}`.trim() || 'Customer',
    service: booking.service?.name || 'Service',
    time: booking.startTime || '10:00 AM',
    status: booking.status || 'upcoming'
  }))

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'text-green-600 bg-green-50 border-l-green-500'
      case 'in-progress': return 'text-blue-600 bg-blue-50 border-l-blue-500'
      case 'cancelled': return 'text-red-600 bg-red-50 border-l-red-500'
      default: return 'text-gray-600 bg-gray-100 border-l-gray-400'
    }
  }

  const getStatusBorderColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'border-l-green-500'
      case 'in-progress': return 'border-l-blue-500'
      case 'cancelled': return 'border-l-red-500'
      default: return 'border-l-amber-500'
    }
  }

  // KYC Banner component
  const renderKycBanner = () => {
    // No KYC submitted - show warning
    if (!kycData) {
      return (
        <div className="fade-section card-v2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 mb-6 overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse-subtle">
                <Icon name="warning" size={24} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800">Complete Your Verification</h3>
                <p className="text-sm text-amber-700">Complete your verification to start receiving bookings from customers.</p>
              </div>
            </div>
            <Link 
              to="/kyc" 
              className="bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-amber-700 transition-all hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px]"
            >
              Start Verification
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
        </div>
      )
    }

    // KYC pending - show info
    if (kycData.status === 'PENDING') {
      return (
        <div className="fade-section card-v2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 mb-6 overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse-subtle">
              <Icon name="schedule" size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-800">Verification Under Review</h3>
              <p className="text-sm text-blue-700">Your verification is being reviewed. We'll notify you once it's approved.</p>
            </div>
          </div>
        </div>
      )
    }

    // KYC rejected - show error
    if (kycData.status === 'REJECTED') {
      return (
        <div className="fade-section card-v2 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-4 mb-6 overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-red-500/10 rounded-full blur-2xl" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon name="warning" size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-800">Verification Rejected</h3>
                <p className="text-sm text-red-700">Reason: {kycData.rejectionReason || 'Your submission did not meet our requirements.'}</p>
              </div>
            </div>
            <Link 
              to="/kyc" 
              className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 transition-all hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px]"
            >
              Re-submit
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
        </div>
      )
    }

    // KYC approved - show success (dismissible)
    if (kycData.status === 'APPROVED' && !dismissedApproved) {
      return (
        <div className="fade-section card-v2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 mb-6 overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-green-500/10 rounded-full blur-2xl" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon name="verified_user" size={24} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-800">Your Salon is Verified!</h3>
                <p className="text-sm text-green-700">You can now receive bookings from customers.</p>
              </div>
            </div>
            <button 
              onClick={() => setDismissedApproved(true)}
              className="text-green-600 hover:text-green-700 hover:bg-green-100 p-2 rounded-xl transition-colors self-end sm:self-center min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>
      )
    }

    return null
  }

  const isLoading = salonLoading || loading

  return (
    <Layout activeTab="dashboard">
      {isLoading ? (
        <div className="page-enter space-y-6">
          {/* Header Skeleton */}
          <div className="mb-6">
            <div className="h-8 w-48 skeleton-shimmer rounded mb-2" />
            <div className="h-4 w-64 skeleton-shimmer rounded" />
          </div>

          {/* KYC Banner Skeleton */}
          <div className="h-20 skeleton-shimmer rounded-2xl" />

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>

          {/* Main Content Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 card-v2 p-5">
              <div className="h-5 w-40 skeleton-shimmer rounded mb-2" />
              <div className="h-4 w-32 skeleton-shimmer rounded mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <BookingItemSkeleton key={i} />
                ))}
              </div>
            </div>
            <WeeklyOverviewSkeleton />
          </div>

          {/* Earnings Skeleton */}
          <EarningsSkeleton />
        </div>
      ) : hasSalon === false ? (
        // New partner without a salon - show setup prompt
        <div className="max-w-2xl mx-auto page-enter">
          <div className="card-v2 text-center py-12">
            <div className="w-20 h-20 bg-ghana-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="store" size={40} className="text-ghana-green" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Welcome to GroomLink Partners!</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Your account is set up and ready. Now let's create your salon profile to start managing your business.
            </p>
            <Link 
              to="/settings" 
              className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base"
            >
              Create Your Salon Profile
              <Icon name="arrow_forward" size={20} />
            </Link>
            <p className="text-sm text-gray-500 mt-6">
              You'll need to add your salon details, services, and staff to start accepting bookings.
            </p>
          </div>

          {/* Quick Tips */}
          <div className="mt-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card-v2 p-4">
              <div className="w-10 h-10 bg-ghana-gold/10 rounded-lg flex items-center justify-center mb-3">
                <Icon name="store" size={20} className="text-ghana-gold" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Set Up Salon</h3>
              <p className="text-sm text-gray-600">Add your business name, location, and operating hours.</p>
            </div>
            <div className="card-v2 p-4">
              <div className="w-10 h-10 bg-ghana-green/10 rounded-lg flex items-center justify-center mb-3">
                <Icon name="content_cut" size={20} className="text-ghana-green" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Add Services</h3>
              <p className="text-sm text-gray-600">Define your services, prices, and how long each takes.</p>
            </div>
            <div className="card-v2 p-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <Icon name="group" size={20} className="text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Add Staff</h3>
              <p className="text-sm text-gray-600">Add your team members and their specialties.</p>
            </div>
          </div>
        </div>
      ) : salonError ? (
        // Error state (wrong role, auth error, etc.)
        <div className="text-center py-12 page-enter">
          <div className="w-20 h-20 bg-ghana-red/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="calendar_today" size={40} className="text-ghana-red" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            {salonError}
          </p>
          <button 
            onClick={() => navigate('/login')} 
            className="btn-primary"
          >
            Sign In Again
          </button>
        </div>
      ) : salonId ? (
      <div className="page-enter space-y-6">
        {/* Header with Time-of-Day Greeting */}
        <div className="fade-section mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {greetingText}, {salon?.businessName || 'Partner'} {greetingEmoji}
          </h1>
          <p className="text-gray-500">{formatDate()} · {motivationalMessage}</p>
        </div>

        {/* KYC Status Banner */}
        {renderKycBanner()}

        {/* Stats Grid */}
        <div className="fade-section grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {statCards.map((stat) => (
            <div 
              key={stat.label} 
              className={`card-v2 p-5 border-t-4 ${stat.borderColor} relative overflow-hidden group`}
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              
              {/* Watermark Icon */}
              <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
                <Icon name={stat.watermark} size={80} />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.iconBg}`}>
                    <Icon name={stat.icon} size={20} className={stat.iconColor} />
                  </div>
                  <span className={`text-sm font-medium ${
                    stat.trendUp === true ? 'text-green-600' : 
                    stat.trendUp === false ? 'text-red-600' : 
                    'text-gray-500'
                  }`}>
                    {stat.trend}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="fade-section grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Today's Bookings */}
          <div className="lg:col-span-2 card-v2 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <div>
                <h3 className="font-semibold text-gray-900">Today's Upcoming Bookings</h3>
                <p className="text-sm text-gray-500">You have {todayBookings.length} appointments today</p>
              </div>
              <Link to="/bookings" className="text-ghana-green text-sm font-medium hover:underline flex items-center gap-1 min-h-[44px]">
                View All <Icon name="arrow_forward" size={16} />
              </Link>
            </div>
            
            {todayBookings.length > 0 ? (
              <div className="space-y-3">
                {todayBookings.map((booking) => (
                  <div 
                    key={booking.id} 
                    className={`card-v2 p-3 flex items-center justify-between border-l-4 ${getStatusBorderColor(booking.status)} hover:bg-gray-50/50 transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-ghana-green/10 rounded-full flex items-center justify-center text-sm font-medium text-ghana-green">
                        {booking.customer.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{booking.customer}</div>
                        <div className="text-sm text-gray-500">{booking.service}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{booking.time}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(booking.status)}`}>
                        {booking.status.replace('-', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Icon name="calendar_today" size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No bookings for today</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/services" className="btn-primary flex items-center justify-center gap-2 text-sm py-3 px-4 min-h-[44px] w-full sm:w-auto">
                <Icon name="add" size={16} />
                Add Service
              </Link>
              <Link to="/bookings" className="btn-secondary flex items-center justify-center gap-2 text-sm py-3 px-4 min-h-[44px] w-full sm:w-auto">
                View Bookings
              </Link>
            </div>
          </div>

          {/* Weekly Overview */}
          <div className="card-v2 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Weekly Overview</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600 text-sm">Total Bookings</span>
                  <span className="font-semibold text-gray-900">{stats?.weeklyBookings || 0}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-ghana-green rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((stats?.weeklyBookings || 0) * 5, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600 text-sm">Total Revenue</span>
                  <span className="font-semibold text-gray-900">GH₵ {stats?.weeklyRevenue || 0}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-ghana-gold rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((stats?.weeklyRevenue || 0) / 10, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600 text-sm">New Customers</span>
                  <span className="font-semibold text-gray-900">{stats?.newCustomers || 0}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((stats?.newCustomers || 0) * 10, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600 text-sm">Average Rating</span>
                  <span className="font-semibold text-gray-900 flex items-center gap-1">
                    {stats?.averageRating ? stats.averageRating.toFixed(1) : '0.0'} 
                    <span className="text-ghana-gold">★</span>
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${((stats?.averageRating || 0) / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {stats && (
              <div className="mt-6 p-4 bg-ghana-green/5 rounded-xl border border-ghana-green/10">
                <div className="flex items-center gap-2 text-ghana-green">
                  <Icon name="trending_up" size={20} />
                  <span className="font-medium text-sm">
                    {stats.weeklyBookings > 0 ? `${stats.weeklyBookings} bookings this week` : 'No bookings this week'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Earnings Summary Section */}
        {earnings && (earnings.escrowHeld > 0 || earnings.releasedThisMonth > 0 || earnings.pendingPenalties > 0) && (
          <div className="fade-section card-v2 p-5 border-t-4 border-t-ghana-green">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="account_balance_wallet" size={20} className="text-ghana-green" />
              <h3 className="font-semibold text-gray-900">Earnings Overview</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Escrow Held */}
              {earnings.escrowHeld > 0 && (
                <div className="card-v2 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="schedule" size={16} className="text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Held in Escrow</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-800">GH₵ {earnings.escrowHeld.toFixed(2)}</p>
                  <div className="mt-2 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '60%' }} />
                  </div>
                  <p className="text-xs text-blue-600 mt-1">Pending release</p>
                </div>
              )}
              
              {/* Released This Month */}
              {earnings.releasedThisMonth > 0 && (
                <div className="card-v2 p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="check_circle" size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-green-700">Released This Month</span>
                  </div>
                  <p className="text-2xl font-bold text-green-800">GH₵ {earnings.releasedThisMonth.toFixed(2)}</p>
                  <div className="mt-2 h-1.5 bg-green-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '80%' }} />
                  </div>
                  <p className="text-xs text-green-600 mt-1">Available in your account</p>
                </div>
              )}
              
              {/* Pending Penalties */}
              {earnings.pendingPenalties > 0 && (
                <div className="card-v2 p-4 bg-gradient-to-br from-red-50 to-rose-50 border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="error" size={16} className="text-red-600" />
                    <span className="text-sm font-medium text-red-700">Pending Penalties</span>
                  </div>
                  <p className="text-2xl font-bold text-red-800">GH₵ {earnings.pendingPenalties.toFixed(2)}</p>
                  <div className="mt-2 h-1.5 bg-red-200 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: '30%' }} />
                  </div>
                  <p className="text-xs text-red-600 mt-1">From cancelled bookings</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      ) : (
        <div className="text-center py-12 page-enter">
          <div className="w-20 h-20 bg-ghana-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="calendar_today" size={40} className="text-ghana-gold" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Salon Found</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            You don't have a salon registered yet. Please contact support to get started.
          </p>
        </div>
      )}
    </Layout>
  )
}

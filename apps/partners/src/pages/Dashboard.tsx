import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Calendar, DollarSign, Clock, CheckCircle, TrendingUp,
  Plus, ArrowRight, Scissors, Users, Store, ArrowRightCircle, AlertTriangle, Shield, X, Wallet, AlertCircle
} from 'lucide-react'
import Layout from '../components/Layout'
import { api, DashboardStats, Booking, Service, Worker, KycSubmission, EarningsSummary } from '../lib/api'
import { useSalon } from '../store/SalonContext'

export default function Dashboard() {
  const navigate = useNavigate()
  const { salonId, loading: salonLoading, hasSalon, error: salonError } = useSalon()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [kycData, setKycData] = useState<KycSubmission | null>(null)
  const [dismissedApproved, setDismissedApproved] = useState(false)
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null)

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
      icon: Calendar, 
      trend: stats?.todayBookings ? `+${stats.todayBookings}` : '0', 
      borderColor: 'border-l-ghana-green',
      iconBg: 'bg-ghana-green/10',
      iconColor: 'text-ghana-green'
    },
    { 
      label: 'Total Revenue', 
      value: stats?.todayRevenue ? `GH₵ ${stats.todayRevenue}` : 'GH₵ 0', 
      icon: DollarSign, 
      trend: stats?.todayRevenue ? `+GH₵ ${stats.todayRevenue}` : 'GH₵ 0',
      borderColor: 'border-l-ghana-gold',
      iconBg: 'bg-ghana-gold/10',
      iconColor: 'text-amber-600'
    },
    { 
      label: 'Active Services', 
      value: activeServicesCount.toString(), 
      icon: Scissors, 
      trend: `${services.length} total`, 
      borderColor: 'border-l-ghana-red',
      iconBg: 'bg-ghana-red/10',
      iconColor: 'text-ghana-red'
    },
    { 
      label: 'Staff Members', 
      value: activeWorkersCount.toString(), 
      icon: Users, 
      trend: `${workers.length} total`,
      borderColor: 'border-l-blue-500',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600'
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
      case 'completed': return 'text-green-600 bg-green-50'
      case 'in-progress': return 'text-blue-600 bg-blue-50'
      case 'cancelled': return 'text-ghana-red bg-red-50'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // KYC Banner component
  const renderKycBanner = () => {
    // No KYC submitted - show warning
    if (!kycData) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800">Complete Your Verification</h3>
                <p className="text-sm text-amber-700">Complete your verification to start receiving bookings from customers.</p>
              </div>
            </div>
            <Link 
              to="/kyc" 
              className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors flex items-center gap-2"
            >
              Start Verification
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )
    }

    // KYC pending - show info
    if (kycData.status === 'PENDING') {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-800">Verification Rejected</h3>
                <p className="text-sm text-red-700">Reason: {kycData.rejectionReason || 'Your submission did not meet our requirements.'}</p>
              </div>
            </div>
            <Link 
              to="/kyc" 
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              Re-submit
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )
    }

    // KYC approved - show success (dismissible)
    if (kycData.status === 'APPROVED' && !dismissedApproved) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-800">Your Salon is Verified!</h3>
                <p className="text-sm text-green-700">You can now receive bookings from customers.</p>
              </div>
            </div>
            <button 
              onClick={() => setDismissedApproved(true)}
              className="text-green-600 hover:text-green-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <Layout activeTab="dashboard">
      {(salonLoading || loading) ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-ghana-green border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading...</p>
        </div>
      ) : hasSalon === false ? (
        // New partner without a salon - show setup prompt
        <div className="max-w-2xl mx-auto">
          <div className="card text-center py-12">
            <div className="w-20 h-20 bg-ghana-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Store className="w-10 h-10 text-ghana-green" />
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
              <ArrowRightCircle className="w-5 h-5" />
            </Link>
            <p className="text-sm text-gray-500 mt-6">
              You'll need to add your salon details, services, and staff to start accepting bookings.
            </p>
          </div>

          {/* Quick Tips */}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="card p-4">
              <div className="w-10 h-10 bg-ghana-gold/10 rounded-lg flex items-center justify-center mb-3">
                <Store className="w-5 h-5 text-ghana-gold" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Set Up Salon</h3>
              <p className="text-sm text-gray-600">Add your business name, location, and operating hours.</p>
            </div>
            <div className="card p-4">
              <div className="w-10 h-10 bg-ghana-green/10 rounded-lg flex items-center justify-center mb-3">
                <Scissors className="w-5 h-5 text-ghana-green" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Add Services</h3>
              <p className="text-sm text-gray-600">Define your services, prices, and how long each takes.</p>
            </div>
            <div className="card p-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Add Staff</h3>
              <p className="text-sm text-gray-600">Add your team members and their specialties.</p>
            </div>
          </div>
        </div>
      ) : salonError ? (
        // Error state (wrong role, auth error, etc.)
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-ghana-red/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-10 h-10 text-ghana-red" />
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
      <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome back! Here's what's happening today.</p>
      </div>

      {/* KYC Status Banner */}
      {renderKycBanner()}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat) => (
          <div key={stat.label} className={`stat-card border-l-4 ${stat.borderColor}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.iconBg}`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              <span className={`text-sm font-medium ${stat.trend.startsWith('+') ? 'text-green-600' : stat.trend === '0' ? 'text-gray-500' : 'text-red-600'}`}>
                {stat.trend}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Bookings */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Today's Upcoming Bookings</h3>
              <p className="text-sm text-gray-500">You have {todayBookings.length} appointments today</p>
            </div>
            <Link to="/bookings" className="text-ghana-green text-sm font-medium hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading bookings...</div>
          ) : todayBookings.length > 0 ? (
            <div className="space-y-3">
              {todayBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
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
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No bookings for today</p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/services" className="btn-primary flex items-center gap-2 text-sm py-2 px-4">
              <Plus className="w-4 h-4" />
              Add Service
            </Link>
            <Link to="/bookings" className="btn-secondary flex items-center gap-2 text-sm py-2 px-4">
              View Bookings
            </Link>
          </div>
        </div>

        {/* Weekly Overview */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Weekly Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Bookings</span>
              <span className="font-semibold text-gray-900">{stats?.weeklyBookings || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Revenue</span>
              <span className="font-semibold text-gray-900">GH₵ {stats?.weeklyRevenue || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">New Customers</span>
              <span className="font-semibold text-gray-900">{stats?.newCustomers || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Average Rating</span>
              <span className="font-semibold text-gray-900 flex items-center gap-1">
                {stats?.averageRating ? stats.averageRating.toFixed(1) : '0.0'} 
                <span className="text-ghana-gold">★</span>
              </span>
            </div>
          </div>

          {stats && (
            <div className="mt-6 p-4 bg-ghana-green/5 rounded-lg border border-ghana-green/10">
              <div className="flex items-center gap-2 text-ghana-green">
                <TrendingUp className="w-5 h-5" />
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
        <div className="mt-6 card">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-ghana-green" />
            <h3 className="font-semibold text-gray-900">Earnings Overview</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Escrow Held */}
            {earnings.escrowHeld > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Held in Escrow</span>
                </div>
                <p className="text-2xl font-bold text-blue-800">GH₵ {earnings.escrowHeld.toFixed(2)}</p>
                <p className="text-xs text-blue-600 mt-1">Pending release</p>
              </div>
            )}
            
            {/* Released This Month */}
            {earnings.releasedThisMonth > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Released This Month</span>
                </div>
                <p className="text-2xl font-bold text-green-800">GH₵ {earnings.releasedThisMonth.toFixed(2)}</p>
                <p className="text-xs text-green-600 mt-1">Available in your account</p>
              </div>
            )}
            
            {/* Pending Penalties */}
            {earnings.pendingPenalties > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">Pending Penalties</span>
                </div>
                <p className="text-2xl font-bold text-red-800">GH₵ {earnings.pendingPenalties.toFixed(2)}</p>
                <p className="text-xs text-red-600 mt-1">From cancelled bookings</p>
              </div>
            )}
          </div>
        </div>
      )}
      </>
      ) : (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-ghana-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-10 h-10 text-ghana-gold" />
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

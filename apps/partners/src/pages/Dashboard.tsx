import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  LayoutDashboard, Calendar, Users, Scissors, Star, Settings, 
  Menu, X, Bell, LogOut, TrendingUp, DollarSign, Clock, CheckCircle
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  activeTab: string
}

export default function Layout({ children, activeTab }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Bookings', icon: Calendar, path: '/bookings' },
    { name: 'Staff', icon: Users, path: '/staff' },
    { name: 'Services', icon: Scissors, path: '/services' },
    { name: 'Reviews', icon: Star, path: '/reviews' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-partner-500 rounded-lg flex items-center justify-center">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Partners</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                activeTab === item.name.toLowerCase()
                  ? 'bg-partner-50 text-partner-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-partner-100 rounded-full flex items-center justify-center">
              <span className="text-partner-600 font-semibold">K</span>
            </div>
            <div>
              <div className="font-medium text-gray-900">Kofi's Barbershop</div>
              <div className="text-sm text-gray-500">Pro Plan</div>
            </div>
          </div>
          <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 w-full px-3 py-2 rounded-lg hover:bg-gray-50">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu className="w-6 h-6 text-gray-500" />
          </button>
          <div className="flex-1" />
          <button className="relative p-2 text-gray-500 hover:text-gray-700">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

function Dashboard() {
  const stats = [
    { label: "Today's Bookings", value: '12', icon: Calendar, trend: '+3', color: 'text-blue-600 bg-blue-50' },
    { label: 'Revenue Today', value: 'GH₵ 450', icon: DollarSign, trend: '+15%', color: 'text-green-600 bg-green-50' },
    { label: 'Pending', value: '5', icon: Clock, trend: '-2', color: 'text-orange-600 bg-orange-50' },
    { label: 'Completed', value: '28', icon: CheckCircle, trend: '+8', color: 'text-purple-600 bg-purple-50' },
  ]

  const recentBookings = [
    { id: 1, customer: 'Kwame Asante', service: 'Haircut', time: '10:00 AM', status: 'completed' },
    { id: 2, customer: 'Ama Mensah', service: 'Hair + Beard', time: '10:30 AM', status: 'in-progress' },
    { id: 3, customer: 'Yaw Boateng', service: 'Kids Cut', time: '11:00 AM', status: 'upcoming' },
    { id: 4, customer: 'Akua Darko', service: 'Hair Coloring', time: '11:30 AM', status: 'upcoming' },
    { id: 5, customer: 'Kofi Adjei', service: 'Beard Trim', time: '12:00 PM', status: 'upcoming' },
  ]

  return (
    <Layout activeTab="dashboard">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className={`text-sm font-medium ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {stat.trend}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts and Bookings */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Today's Bookings</h3>
            <Link to="/bookings" className="text-partner-600 text-sm hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                    {booking.customer.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{booking.customer}</div>
                    <div className="text-sm text-gray-500">{booking.service}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{booking.time}</div>
                  <div className={`text-xs ${
                    booking.status === 'completed' ? 'text-green-600' :
                    booking.status === 'in-progress' ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {booking.status.replace('-', ' ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">This Week</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Bookings</span>
              <span className="font-semibold text-gray-900">68</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Revenue</span>
              <span className="font-semibold text-gray-900">GH₵ 3,240</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">New Customers</span>
              <span className="font-semibold text-gray-900">12</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Average Rating</span>
              <span className="font-semibold text-gray-900 flex items-center gap-1">
                4.8 <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              </span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-partner-50 rounded-lg">
            <div className="flex items-center gap-2 text-partner-600">
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">+23% from last week</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export { Layout, Dashboard as DashboardContent }

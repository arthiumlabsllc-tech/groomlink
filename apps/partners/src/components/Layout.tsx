import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, Calendar, Users, Scissors, Star, Settings, 
  Menu, X, Bell, LogOut, ListOrdered
} from 'lucide-react'
import { useSalon } from '../store/SalonContext';

interface LayoutProps {
  children: React.ReactNode
  activeTab: string
}

export default function Layout({ children, activeTab }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const { salon } = useSalon();

  const salonName = salon?.businessName || 'My Salon';
  const initials = salonName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Queue', icon: ListOrdered, path: '/queue' },
    { name: 'Bookings', icon: Calendar, path: '/bookings' },
    { name: 'Staff', icon: Users, path: '/staff' },
    { name: 'Services', icon: Scissors, path: '/services' },
    { name: 'Reviews', icon: Star, path: '/reviews' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ]

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1a1a2e] transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo Section */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ghana-green rounded-lg flex items-center justify-center shadow-lg">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm leading-tight">GroomLink</span>
              <span className="text-ghana-gold text-xs">Partners</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                activeTab === item.name.toLowerCase()
                  ? 'bg-ghana-green text-white shadow-md'
                  : 'text-gray-400 hover:text-ghana-gold hover:bg-white/5'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.name.toLowerCase() ? 'text-white' : ''}`} />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Salon Info & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-[#151525]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-ghana-gold/20 rounded-full flex items-center justify-center border border-ghana-gold/30">
              <span className="text-ghana-gold font-semibold text-sm">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-white text-sm truncate">{salonName}</div>
              <div className="text-xs text-gray-400">Salon Partner</div>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-400 hover:text-ghana-gold w-full px-3 py-2 rounded-lg hover:bg-white/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100">
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-ghana-red rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

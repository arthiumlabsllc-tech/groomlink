import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, Calendar, Users, Scissors, Star, Settings, 
  Menu, X, Bell, LogOut, ListOrdered, Check, BellOff, AlertCircle, Shield
} from 'lucide-react'
import { useSalon } from '../store/SalonContext';
import { useNotificationStore, Notification } from '../store/notifications';

// Helper function to format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Notification item component
function NotificationItem({ 
  notification, 
  onMarkRead 
}: { 
  notification: Notification; 
  onMarkRead: (id: string) => void;
}) {
  return (
    <div 
      className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 ${
        !notification.isRead ? 'bg-ghana-green/5' : ''
      }`}
      onClick={() => !notification.isRead && onMarkRead(notification.id)}
    >
      <div className="flex items-start gap-3">
        {!notification.isRead && (
          <div className="w-2 h-2 mt-2 bg-ghana-green rounded-full flex-shrink-0" />
        )}
        <div className={`flex-1 ${notification.isRead ? 'ml-5' : ''}`}>
          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
          <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
          <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(notification.createdAt)}</p>
        </div>
        {!notification.isRead && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            className="p-1 text-gray-400 hover:text-ghana-green transition-colors"
            title="Mark as read"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

interface LayoutProps {
  children: React.ReactNode
  activeTab: string
}

export default function Layout({ children, activeTab }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const { salon, hasSalon } = useSalon();
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    isDropdownOpen,
    markAsRead, 
    toggleDropdown, 
    closeDropdown,
    startPolling 
  } = useNotificationStore();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Fetch notifications on mount and start polling
  // Also listen for auth:login event to restart polling after login
  useEffect(() => {
    const cleanup = startPolling();

    const handleAuthLogin = () => {
      console.log('Layout: auth:login event received - starting notification polling')
      cleanup() // Stop any existing polling
      startPolling() // Start fresh polling
    }
    window.addEventListener('auth:login', handleAuthLogin)

    return () => {
      cleanup()
      window.removeEventListener('auth:login', handleAuthLogin)
    }
  }, [startPolling]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        bellRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !bellRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, closeDropdown]);

  const salonName = salon?.businessName || (hasSalon === false ? 'Setup Required' : 'My Salon');
  const initials = salon?.businessName 
    ? salon.businessName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';
  const needsSetup = hasSalon === false;

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Queue', icon: ListOrdered, path: '/queue' },
    { name: 'Bookings', icon: Calendar, path: '/bookings' },
    { name: 'Staff', icon: Users, path: '/staff' },
    { name: 'Services', icon: Scissors, path: '/services' },
    { name: 'Reviews', icon: Star, path: '/reviews' },
    { name: 'Verification', icon: Shield, path: '/kyc' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ]

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1a1a2e] transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
          {needsSetup && (
            <Link
              to="/settings"
              className="flex items-center gap-2 px-3 py-2 mb-3 bg-ghana-gold/20 rounded-lg border border-ghana-gold/30 text-ghana-gold text-sm hover:bg-ghana-gold/30 transition-colors"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Complete salon setup</span>
            </Link>
          )}
          <div className="flex items-center gap-3 mb-4">
            {/* Salon Logo / Initials */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border overflow-hidden ${needsSetup ? 'bg-ghana-gold/20 border-ghana-gold/30' : 'bg-ghana-gold/20 border-ghana-gold/30'}`}>
              {salon?.logo ? (
                <img 
                  src={salon.logo} 
                  alt={salon.businessName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span className={`font-semibold text-sm ${needsSetup ? 'text-ghana-gold' : 'text-ghana-gold'}`}>{initials}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-white text-sm truncate">{salonName}</div>
              <div className="text-xs text-gray-400">{needsSetup ? 'Setup in progress' : 'Salon Partner'}</div>
            </div>
            <div className={`w-2 h-2 rounded-full ${needsSetup ? 'bg-ghana-gold' : 'bg-green-500'}`}></div>
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
          <div className="flex items-center gap-3 relative">
            {/* Notification Bell */}
            <button 
              ref={bellRef}
              onClick={toggleDropdown}
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-ghana-red text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Salon Logo in Header */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
                {salon?.logo ? (
                  <img 
                    src={salon.logo} 
                    alt={salon.businessName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-xs font-medium text-gray-600">{initials.slice(0, 1)}</span>
                )}
              </div>
              <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
                {salonName}
              </span>
            </div>

            {/* Notification Dropdown */}
            {isDropdownOpen && (
              <div 
                ref={dropdownRef}
                className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs font-medium text-ghana-green bg-ghana-green/10 px-2 py-0.5 rounded-full">
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="max-h-[300px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-ghana-green border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                      <BellOff className="w-10 h-10 mb-2 text-gray-300" />
                      <p className="text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {notifications.map((notification) => (
                        <NotificationItem 
                          key={notification.id} 
                          notification={notification} 
                          onMarkRead={markAsRead}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
                  <Link
                    to="/notifications"
                    onClick={closeDropdown}
                    className="block text-center text-sm text-ghana-green hover:text-ghana-green/80 font-medium py-1"
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="p-3 sm:p-4 lg:p-6">
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

import { useEffect, useRef } from 'react';
import Icon from './Icon';
import { useNotificationStore, Notification, NotificationType } from '../store/notifications';
import { useAuthStore } from '../store/auth';
import { Link } from 'react-router-dom';
import { useDarkMode } from '../hooks/useDarkMode';

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
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Get icon for notification type
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'BOOKING_CONFIRMED':
    case 'BOOKING_REMINDER':
      return <Icon name="calendar_today" size={20} className="text-green-500" />;
    case 'BOOKING_CANCELLED':
      return <Icon name="close" size={20} className="text-red-500" />;
    case 'BOOKING_COMPLETED':
      return <Icon name="check" size={20} className="text-blue-500" />;
    case 'PAYMENT_RECEIVED':
      return <Icon name="credit_card" size={20} className="text-emerald-500" />;
    case 'REVIEW_REQUEST':
      return <Icon name="star" size={20} className="text-yellow-500" />;
    case 'PROMOTION':
      return <Icon name="label" size={20} className="text-purple-500" />;
    case 'SYSTEM':
    default:
      return <Icon name="error" size={20} className="text-gray-500" />;
  }
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
      className={`p-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
        !notification.isRead ? 'border-l-2 border-l-[#CE1126] bg-gray-50/30' : 'border-l-2 border-l-transparent'
      }`}
      onClick={() => !notification.isRead && onMarkRead(notification.id)}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
            {!notification.isRead && (
              <div className="w-2 h-2 mt-1.5 bg-[#CE1126] rounded-full flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
          <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(notification.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  const isDark = useDarkMode();
  const { isAuthenticated, user } = useAuthStore();
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    isDropdownOpen,
    markAsRead, 
    markAllAsRead,
    toggleDropdown, 
    closeDropdown, 
    startPolling 
  } = useNotificationStore();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Fetch notifications on mount and start polling
  useEffect(() => {
    if (isAuthenticated) {
      const cleanup = startPolling();
      return cleanup;
    }
  }, [isAuthenticated, startPolling]);

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

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-40 h-14">
      <div className="flex items-center justify-between h-full px-4 max-w-7xl mx-auto">
        {/* Logo */}
        <Link to={isAuthenticated ? "/dashboard" : "/explore"} className="flex items-center gap-2 transition-all duration-200 hover:opacity-80">
          <img 
            src={isDark ? "/logo-white.png" : "/logo-black.png"} 
            alt="GroomLink" 
            className="h-7 w-auto"
          />
        </Link>

        {/* Right Side */}
        <div className="flex items-center gap-2 relative">
          {isAuthenticated ? (
            <>
              {/* Notifications */}
              <button 
                ref={bellRef}
                onClick={toggleDropdown}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-full transition-all duration-200"
              >
                <Icon name="notifications" size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 bg-[#CE1126] text-white text-xs font-medium rounded-full flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isDropdownOpen && (
                <div 
                  ref={dropdownRef}
                  className="absolute right-0 top-full mt-2 w-80 sm:w-96 card-v2 shadow-elevated overflow-hidden z-50 animate-scale-in"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-gray-500 hover:text-[#CE1126] transition-all duration-200"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Content */}
                  <div className="max-h-[300px] overflow-y-auto">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-[#CE1126] border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                        <Icon name="notifications_off" size={40} className="mb-2 text-gray-300" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {notifications.slice(0, 5).map((notification) => (
                          <NotificationItem 
                            key={notification.id} 
                            notification={notification} 
                            onMarkRead={markAsRead}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer - View All Link */}
                  {notifications.length > 0 && (
                    <div className="border-t border-gray-100 bg-gray-50/50">
                      <Link
                        to="/notifications"
                        onClick={closeDropdown}
                        className="flex items-center justify-center gap-1 py-3 text-sm font-medium text-gray-600 hover:text-[#CE1126] hover:bg-gray-100 transition-all duration-200"
                      >
                        See all
                        <Icon name="arrow_forward" size={14} />
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* User Avatar */}
              <Link 
                to="/profile" 
                className="p-1 rounded-full transition-all duration-200 hover:ring-2 hover:ring-gray-200"
              >
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                  {user?.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icon name="person" size={16} className="text-gray-500" />
                  )}
                </div>
              </Link>
            </>
          ) : (
            /* Log In Button for guests */
            <Link 
              to="/login"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#CE1126] text-white text-sm font-medium rounded-full hover:bg-[#a80e1f] transition-all duration-200"
            >
              <Icon name="login" size={16} />
              <span>Log In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

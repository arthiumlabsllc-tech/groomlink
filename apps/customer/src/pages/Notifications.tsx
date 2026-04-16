import { useEffect, useState } from 'react';
import { Calendar, X, CreditCard, Star, Tag, AlertCircle, BellOff, Check, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotificationStore, Notification, NotificationType } from '../store/notifications';

type FilterType = 'all' | 'bookings' | 'payments' | 'alerts';

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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: diffDay >= 365 ? 'numeric' : undefined });
}

// Helper function to format full date
function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Get icon for notification type
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'BOOKING_CONFIRMED':
    case 'BOOKING_REMINDER':
      return <Calendar className="w-6 h-6 text-green-500" />;
    case 'BOOKING_CANCELLED':
      return <X className="w-6 h-6 text-red-500" />;
    case 'BOOKING_COMPLETED':
      return <Check className="w-6 h-6 text-blue-500" />;
    case 'PAYMENT_RECEIVED':
      return <CreditCard className="w-6 h-6 text-emerald-500" />;
    case 'REVIEW_REQUEST':
      return <Star className="w-6 h-6 text-yellow-500" />;
    case 'PROMOTION':
      return <Tag className="w-6 h-6 text-purple-500" />;
    case 'SYSTEM':
    default:
      return <AlertCircle className="w-6 h-6 text-gray-500" />;
  }
}

// Filter notifications by type
function filterNotifications(notifications: Notification[], filter: FilterType): Notification[] {
  if (filter === 'all') return notifications;
  
  if (filter === 'bookings') {
    return notifications.filter(n => 
      ['BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER', 'BOOKING_COMPLETED'].includes(n.type)
    );
  }
  
  if (filter === 'payments') {
    return notifications.filter(n => n.type === 'PAYMENT_RECEIVED');
  }
  
  if (filter === 'alerts') {
    return notifications.filter(n => 
      ['SYSTEM', 'PROMOTION', 'REVIEW_REQUEST'].includes(n.type)
    );
  }
  
  return notifications;
}

// Notification item component for full page
function NotificationListItem({ 
  notification, 
  onMarkRead 
}: { 
  notification: Notification; 
  onMarkRead: (id: string) => void;
}) {
  return (
    <div
      className={`p-4 transition-colors hover:bg-gray-50 ${
        !notification.isRead ? 'bg-blue-50/30' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Type icon */}
        <div className="flex-shrink-0 p-2 bg-gray-100 rounded-full">
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-900">{notification.title}</h3>
                {!notification.isRead && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                    New
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
              <p className="text-xs text-gray-400 mt-2" title={formatFullDate(notification.createdAt)}>
                {formatRelativeTime(notification.createdAt)}
              </p>
            </div>
            
            {!notification.isRead && (
              <button
                onClick={() => onMarkRead(notification.id)}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Mark as read"
              >
                <Check className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Notifications() {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    hasMore,
    fetchNotifications, 
    markAsRead, 
    markAllAsRead 
  } = useNotificationStore();
  
  const [filter, setFilter] = useState<FilterType>('all');
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  
  // Fetch all notifications on mount
  useEffect(() => {
    fetchNotifications(1, 20);
  }, [fetchNotifications]);
  
  const handleLoadMore = () => {
    const nextPage = Math.ceil(notifications.length / 20) + 1;
    fetchNotifications(nextPage, 20);
  };
  
  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    await markAllAsRead();
    setIsMarkingAll(false);
  };
  
  const filteredNotifications = filterNotifications(notifications, filter);
  
  const tabs: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'payments', label: 'Payments' },
    { key: 'alerts', label: 'Alerts' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link
              to="/dashboard"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-500">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
                className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {isMarkingAll ? 'Marking...' : 'Mark all as read'}
              </button>
            )}
          </div>
          
          {/* Filter Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  filter === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {isLoading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-sm text-gray-500">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <BellOff className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-900">No notifications</p>
            <p className="text-sm mt-1">
              {filter === 'all' 
                ? "You're all caught up!" 
                : `No ${filter} notifications yet`}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
              {filteredNotifications.map((notification) => (
                <NotificationListItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={markAsRead}
                />
              ))}
            </div>
            
            {/* Load More Button */}
            {filter === 'all' && hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

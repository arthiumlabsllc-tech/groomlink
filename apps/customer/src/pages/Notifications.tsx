import { useEffect, useState } from 'react';
import Icon from '../components/Icon';
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

// Get date group for notification
function getDateGroup(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateOnly.getTime() === today.getTime()) return 'Today';
  if (dateOnly.getTime() === yesterday.getTime()) return 'Yesterday';
  if (dateOnly.getTime() > weekAgo.getTime()) return 'This Week';
  return 'Earlier';
}

// Get icon for notification type
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'BOOKING_CONFIRMED':
    case 'BOOKING_REMINDER':
      return <Icon name="calendar_today" size={22} className="text-blue-500" />;
    case 'BOOKING_CANCELLED':
      return <Icon name="close" size={22} className="text-red-500" />;
    case 'BOOKING_COMPLETED':
      return <Icon name="check" size={22} className="text-green-500" />;
    case 'PAYMENT_RECEIVED':
      return <Icon name="credit_card" size={22} className="text-emerald-500" />;
    case 'REVIEW_REQUEST':
      return <Icon name="star" size={22} className="text-yellow-500" />;
    case 'PROMOTION':
      return <Icon name="label" size={22} className="text-purple-500" />;
    case 'SYSTEM':
    default:
      return <Icon name="notifications" size={22} className="text-gray-500" />;
  }
}

// Get left border color based on notification type
function getNotificationAccent(type: NotificationType): string {
  switch (type) {
    case 'BOOKING_CONFIRMED':
    case 'BOOKING_REMINDER':
    case 'BOOKING_CANCELLED':
    case 'BOOKING_COMPLETED':
      return 'border-l-blue-500';
    case 'PAYMENT_RECEIVED':
      return 'border-l-emerald-500';
    case 'REVIEW_REQUEST':
    case 'PROMOTION':
    case 'SYSTEM':
    default:
      return 'border-l-amber-500';
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

// Group notifications by date
function groupNotificationsByDate(notifications: Notification[]): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {};
  
  notifications.forEach(notification => {
    const group = getDateGroup(notification.createdAt);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(notification);
  });
  
  return groups;
}

// Notification item component for full page
function NotificationListItem({ 
  notification, 
  onMarkRead 
}: { 
  notification: Notification; 
  onMarkRead: (id: string) => void;
}) {
  const accentClass = getNotificationAccent(notification.type);
  
  return (
    <div
      className={`card-v2 p-4 border-l-4 ${accentClass} hover:shadow-card-hover transition-all duration-200 ${
        !notification.isRead ? 'bg-blue-50/20' : 'bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">{notification.title}</h3>
                {!notification.isRead && (
                  <span className="w-2 h-2 rounded-full bg-[#CE1126] flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{notification.message}</p>
              <p className="text-xs text-gray-400 mt-2" title={formatFullDate(notification.createdAt)}>
                {formatRelativeTime(notification.createdAt)}
              </p>
            </div>
            
            {!notification.isRead && (
              <button
                onClick={() => onMarkRead(notification.id)}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-[#CE1126] hover:bg-primary-50 rounded-lg transition-colors"
                title="Mark as read"
              >
                <Icon name="check_circle" size={20} />
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
  const groupedNotifications = groupNotificationsByDate(filteredNotifications);
  
  // Define group order
  const groupOrder = ['Today', 'Yesterday', 'This Week', 'Earlier'];
  const sortedGroups = groupOrder.filter(group => groupedNotifications[group]?.length > 0);
  
  const tabs: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'payments', label: 'Payments' },
    { key: 'alerts', label: 'Alerts' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link
              to="/dashboard"
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Icon name="chevron_left" size={20} className="text-gray-600" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-[#CE1126] text-white text-xs font-semibold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
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
                className="px-4 py-2 text-sm font-medium text-[#CE1126] hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {isMarkingAll ? 'Marking...' : 'Mark all read'}
              </button>
            )}
          </div>
          
          {/* Filter Tabs */}
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`tab-pill ${
                  filter === tab.key ? 'tab-pill-active' : 'tab-pill-inactive'
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
            <div className="w-10 h-10 border-3 border-[#CE1126] border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-sm text-gray-500">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 animate-fade-in-up">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
              <Icon name="check_circle" size={40} className="text-green-500" />
            </div>
            <p className="text-xl font-semibold text-gray-900">All caught up!</p>
            <p className="text-sm mt-2 text-gray-500">
              {filter === 'all' 
                ? "You have no new notifications" 
                : `No ${filter} notifications yet`}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedGroups.map((group) => (
              <div key={group} className="space-y-3 animate-fade-in-up">
                {/* Date Group Header */}
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                  {group}
                </h3>
                
                {/* Notifications in this group */}
                <div className="space-y-3">
                  {groupedNotifications[group].map((notification) => (
                    <NotificationListItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={markAsRead}
                    />
                  ))}
                </div>
              </div>
            ))}
            
            {/* Load More Button */}
            {filter === 'all' && hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-card transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

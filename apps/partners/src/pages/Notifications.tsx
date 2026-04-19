import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { api, Notification, NotificationType } from '../lib/api'
import Layout from '../components/Layout'

const notificationIcons: Record<NotificationType, string> = {
  BOOKING_CONFIRMED: 'calendar_today',
  BOOKING_CANCELLED: 'cancel',
  BOOKING_REMINDER: 'calendar_today',
  BOOKING_COMPLETED: 'check_circle',
  PAYMENT_RECEIVED: 'credit_card',
  PAYMENT_FAILED: 'cancel',
  CHECKIN: 'check_circle',
  REVIEW: 'chat_bubble',
  PROMOTION: 'notifications',
  SYSTEM: 'notifications',
}

const notificationColors: Record<NotificationType, string> = {
  BOOKING_CONFIRMED: 'bg-blue-100 text-blue-600',
  BOOKING_CANCELLED: 'bg-red-100 text-red-600',
  BOOKING_REMINDER: 'bg-yellow-100 text-yellow-600',
  BOOKING_COMPLETED: 'bg-green-100 text-green-600',
  PAYMENT_RECEIVED: 'bg-green-100 text-green-600',
  PAYMENT_FAILED: 'bg-red-100 text-red-600',
  CHECKIN: 'bg-purple-100 text-purple-600',
  REVIEW: 'bg-orange-100 text-orange-600',
  PROMOTION: 'bg-pink-100 text-pink-600',
  SYSTEM: 'bg-gray-100 text-gray-600',
}

// Left border colors by notification category
const getBorderColor = (type: NotificationType): string => {
  if (type.includes('BOOKING')) return 'border-l-4 border-l-green-500'
  if (type.includes('PAYMENT')) return 'border-l-4 border-l-amber-400'
  if (type.includes('SYSTEM') || type.includes('PROMOTION')) return 'border-l-4 border-l-blue-500'
  return 'border-l-4 border-l-red-500'
}

// Unread dot colors by notification category
const getUnreadDotColor = (type: NotificationType): string => {
  if (type.includes('BOOKING')) return 'bg-green-500'
  if (type.includes('PAYMENT')) return 'bg-amber-400'
  if (type.includes('SYSTEM') || type.includes('PROMOTION')) return 'bg-blue-500'
  return 'bg-red-500'
}

const filterTypes = [
  { value: 'ALL', label: 'All' },
  { value: 'BOOKING', label: 'Bookings' },
  { value: 'PAYMENT', label: 'Payments' },
  { value: 'CHECKIN', label: 'Check-ins' },
  { value: 'REVIEW', label: 'Reviews' },
]

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Group notifications by date
function getDateGroup(dateString: string): 'Today' | 'Yesterday' | 'Earlier' {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDay === 0) return 'Today'
  if (diffDay === 1) return 'Yesterday'
  return 'Earlier'
}

// Shimmer skeleton for notifications
function NotificationSkeleton() {
  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="skeleton-shimmer w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="skeleton-shimmer h-4 w-3/4 mb-2" />
          <div className="skeleton-shimmer h-3 w-full mb-2" />
          <div className="skeleton-shimmer h-3 w-20" />
        </div>
      </div>
    </div>
  )
}

export default function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchNotifications = async (pageNum: number = 1, append: boolean = false) => {
    try {
      setIsLoading(true)
      const response = await api.getNotifications()
      if (response.success && response.data) {
        const newNotifications = response.data.notifications || []
        setUnreadCount(response.data.unreadCount || 0)
        
        if (append) {
          setNotifications(prev => [...prev, ...newNotifications])
        } else {
          setNotifications(newNotifications)
        }
        
        setHasMore(newNotifications.length === 20)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  useEffect(() => {
    if (activeFilter === 'ALL') {
      setFilteredNotifications(notifications)
    } else {
      setFilteredNotifications(
        notifications.filter(n => n.type.includes(activeFilter))
      )
    }
  }, [notifications, activeFilter])

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id)
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      setIsMarkingAll(true)
      await api.markAllNotificationsAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    } finally {
      setIsMarkingAll(false)
    }
  }

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchNotifications(nextPage, true)
  }

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((acc, notification) => {
    const group = getDateGroup(notification.createdAt)
    if (!acc[group]) acc[group] = []
    acc[group].push(notification)
    return acc
  }, {} as Record<'Today' | 'Yesterday' | 'Earlier', Notification[]>)

  const dateGroupOrder: ('Today' | 'Yesterday' | 'Earlier')[] = ['Today', 'Yesterday', 'Earlier']

  return (
    <Layout activeTab="notifications">
      <div className="max-w-4xl mx-auto page-enter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Icon name="chevron_left" size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-500">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll || unreadCount === 0}
            className="btn-ripple flex items-center justify-center gap-2 px-4 py-2 bg-ghana-green text-white rounded-xl hover:bg-ghana-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isMarkingAll ? (
              <Icon name="progress_activity" size={16} className="animate-spin" />
            ) : (
              <Icon name="check" size={16} />
            )}
            <span>Mark all as read</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <Icon name="filter_list" size={16} className="text-gray-400 flex-shrink-0" />
          {filterTypes.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`tab-pill whitespace-nowrap ${
                activeFilter === filter.value ? 'tab-pill-active' : 'tab-pill-inactive'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="card-v2 overflow-hidden">
          {isLoading && notifications.length === 0 ? (
            <div className="divide-y divide-gray-100">
              {[1, 2, 3, 4, 5].map((i) => (
                <NotificationSkeleton key={i} />
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Icon name="notifications" size={64} className="mb-4 text-gray-300" />
              <p className="text-lg font-medium">No notifications</p>
              <p className="text-sm">
                {activeFilter === 'ALL' 
                  ? "You're all caught up!" 
                  : `No ${activeFilter.toLowerCase()} notifications found.`}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {dateGroupOrder.map((group) => {
                  const groupNotifications = groupedNotifications[group]
                  if (!groupNotifications || groupNotifications.length === 0) return null
                  
                  return (
                    <div key={group}>
                      {/* Date Group Header */}
                      <div className="px-4 sm:px-6 py-2 bg-gray-50/80 border-y border-gray-100">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {group}
                        </h3>
                      </div>
                      
                      {groupNotifications.map((notification) => {
                        const iconName = notificationIcons[notification.type] || 'notifications'
                        const colorClass = notificationColors[notification.type] || 'bg-gray-100 text-gray-600'
                        const borderClass = getBorderColor(notification.type)
                        const unreadDotColor = getUnreadDotColor(notification.type)
                        
                        return (
                          <div
                            key={notification.id}
                            onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                            className={`p-4 sm:p-6 cursor-pointer transition-all hover:bg-gray-50 ${
                              !notification.isRead ? `bg-ghana-green/5 ${borderClass}` : 'border-l-4 border-l-transparent'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              {/* Icon */}
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                <Icon name={iconName} size={20} />
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h3 className={`text-sm font-semibold ${
                                      !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                                    }`}>
                                      {notification.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {notification.message}
                                    </p>
                                  </div>
                                  
                                  {/* Unread indicator with colored dot */}
                                  {!notification.isRead && (
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className={`w-2.5 h-2.5 ${unreadDotColor} rounded-full animate-pulse`}></span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleMarkAsRead(notification.id)
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-ghana-green hover:bg-ghana-green/10 rounded-lg transition-colors"
                                        title="Mark as read"
                                      >
                                        <Icon name="check" size={16} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                
                                <p className="text-xs text-gray-400 mt-2">
                                  {formatRelativeTime(notification.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="p-4 border-t border-gray-100">
                  <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="btn-ripple w-full py-2 text-sm text-gray-600 hover:text-ghana-green font-medium transition-colors flex items-center justify-center gap-2 rounded-xl hover:bg-gray-50"
                  >
                    {isLoading ? (
                      <Icon name="progress_activity" size={16} className="animate-spin" />
                    ) : (
                      <Icon name="refresh" size={16} />
                    )}
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}

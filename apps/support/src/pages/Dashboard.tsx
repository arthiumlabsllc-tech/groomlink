import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { api } from '../api';

interface Stats {
  totalUsers: number;
  totalSalons: number;
  activeBookings: number;
  openTickets: number;
  todaySignups: number;
  pendingSalons: number;
}

/* Shimmer skeleton for loading state */
function StatSkeleton() {
  return (
    <div className="card-v2 p-5 border-l-4 border-l-gray-200">
      <div className="flex items-center gap-3">
        <div className="skeleton-shimmer w-10 h-10 rounded-lg" />
        <div className="flex-1">
          <div className="skeleton-shimmer h-7 w-16 mb-2" />
          <div className="skeleton-shimmer h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

function QuickStatSkeleton() {
  return (
    <div className="card-v2 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="skeleton-shimmer w-8 h-8 rounded-lg" />
          <div className="skeleton-shimmer h-4 w-24" />
        </div>
        <div className="skeleton-shimmer h-4 w-16" />
      </div>
      <div className="skeleton-shimmer h-9 w-12" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="card-v2 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="skeleton-shimmer h-5 w-28" />
          <div className="skeleton-shimmer h-4 w-16" />
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="skeleton-shimmer w-10 h-10 rounded-full" />
              <div>
                <div className="skeleton-shimmer h-4 w-28 mb-1.5" />
                <div className="skeleton-shimmer h-3 w-20" />
              </div>
            </div>
            <div className="skeleton-shimmer h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* Fade-in section with IntersectionObserver */
function FadeSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`fade-section ${className}`}>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, usersRes, ticketsRes] = await Promise.all([
          api.getStats(),
          api.getUsers(1, 5),
          api.getTickets(1, 5),
        ]);
        setStats(statsRes.data);
        setRecentUsers(usersRes.data || []);
        setRecentTickets(ticketsRes.data || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getTimeGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 page-enter">
        <div>
          <div className="skeleton-shimmer h-7 w-48 mb-2" />
          <div className="skeleton-shimmer h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <QuickStatSkeleton />
          <QuickStatSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TableSkeleton />
          <TableSkeleton />
        </div>
      </div>
    );
  }

  const statCards = [
    { name: 'Total Users', value: stats?.totalUsers || 0, icon: 'group', color: 'border-l-blue-500', iconBg: 'bg-blue-100 text-blue-600', href: '/users' },
    { name: 'Total Salons', value: stats?.totalSalons || 0, icon: 'store', color: 'border-l-purple-500', iconBg: 'bg-purple-100 text-purple-600', href: '/salons' },
    { name: 'Open Tickets', value: stats?.openTickets || 0, icon: 'confirmation_number', color: 'border-l-yellow-500', iconBg: 'bg-yellow-100 text-yellow-600', href: '/tickets' },
    { name: 'Active Bookings', value: stats?.activeBookings || 0, icon: 'schedule', color: 'border-l-green-500', iconBg: 'bg-green-100 text-green-600', href: '/tickets' },
  ];

  const quickStats = [
    { name: 'Today\'s Signups', value: stats?.todaySignups || 0, icon: 'trending_up', trend: stats?.todaySignups ? `${stats.todaySignups} today` : '0 today', trendColor: 'text-ghana-green' },
    { name: 'Pending Salons', value: stats?.pendingSalons || 0, icon: 'error', trend: 'Needs review', trendColor: 'text-ghana-yellow' },
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
      case 'URGENT':
        return 'bg-ghana-red/10 dark:bg-ghana-red/20 text-ghana-red dark:text-red-300 border border-ghana-red/20 dark:border-red-800';
      case 'MEDIUM':
        return 'bg-ghana-yellow/10 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-ghana-yellow/30 dark:border-yellow-800';
      case 'LOW':
        return 'bg-ghana-green/10 dark:bg-green-900/20 text-ghana-green dark:text-green-300 border border-ghana-green/20 dark:border-green-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'CUSTOMER':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      case 'SALON_OWNER':
        return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
      case 'SUPPORT':
        return 'bg-ghana-green/10 dark:bg-green-900/20 text-ghana-green dark:text-green-300 border border-ghana-green/20 dark:border-green-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white font-heading">
          {getTimeGreeting()} 👋
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Here's what's happening on the platform today.</p>
      </div>

      {/* Stat Cards */}
      <FadeSection className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href || '#'}
            className={`card-v2 p-3 sm:p-5 border-l-4 ${stat.color}`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-2 sm:p-2.5 rounded-lg ${stat.iconBg}`}>
                <Icon name={stat.icon} size={20} />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{stat.name}</p>
              </div>
            </div>
          </Link>
        ))}
      </FadeSection>

      {/* Quick Stats */}
      <FadeSection className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickStats.map((stat) => (
          <div
            key={stat.name}
            className="card-v2 p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Icon name={stat.icon} size={16} className="text-gray-600 dark:text-gray-400" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.name}</span>
              </div>
              <span className={`text-sm font-semibold ${stat.trendColor}`}>{stat.trend}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-3">{stat.value}</p>
          </div>
        ))}
      </FadeSection>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <FadeSection>
          <div className="card-v2 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white font-heading">Recent Users</h2>
                <Link to="/users" className="text-sm text-ghana-green hover:text-support-700 dark:hover:text-green-400 font-medium transition-colors">
                  View all
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentUsers.length > 0 ? (
                recentUsers.map((user: any) => (
                  <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 dark:text-gray-300 font-semibold text-sm">
                          {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.phoneNumber}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                      {user.role?.replace('_', ' ')}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">No recent users</div>
              )}
            </div>
          </div>
        </FadeSection>

        {/* Recent Tickets */}
        <FadeSection>
          <div className="card-v2 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white font-heading">Recent Tickets</h2>
                <Link to="/tickets" className="text-sm text-ghana-green hover:text-support-700 dark:hover:text-green-400 font-medium transition-colors">
                  View all
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentTickets.length > 0 ? (
                recentTickets.map((ticket: any) => (
                  <div key={ticket.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        ticket.priority === 'HIGH' || ticket.priority === 'URGENT' ? 'bg-ghana-red' :
                        ticket.priority === 'MEDIUM' ? 'bg-ghana-yellow' :
                        'bg-ghana-green'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{ticket.subject}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{ticket.user?.firstName} • {ticket.createdAt}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityBadge(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">No recent tickets</div>
              )}
            </div>
          </div>
        </FadeSection>
      </div>
    </div>
  );
}

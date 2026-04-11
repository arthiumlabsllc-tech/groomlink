import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Users,
  Store,
  CreditCard,
  Calendar,
  ArrowUp,
  ArrowDown,
  Loader2,
  TrendingUp,
  TrendingDown,
  User,
  Scissors,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useDashboardStats, useDashboardMetrics, useRecentActivities } from '../hooks';
import { formatCurrency } from '../lib/utils';

const GHANA_COLORS = {
  green: '#006B3F',
  gold: '#FCD116',
  red: '#CE1126',
};

// Activity type icons and colors
const ACTIVITY_CONFIG: Record<string, { icon: typeof User; color: string; bgColor: string }> = {
  USER_REGISTERED: { icon: User, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  SALON_REGISTERED: { icon: Store, color: 'text-[#006B3F]', bgColor: 'bg-[#006B3F]/10' },
  BOOKING_CREATED: { icon: Calendar, color: 'text-[#B8960F]', bgColor: 'bg-[#FCD116]/20' },
  BOOKING_COMPLETED: { icon: CheckCircle, color: 'text-[#006B3F]', bgColor: 'bg-[#006B3F]/10' },
  BOOKING_CANCELLED: { icon: AlertCircle, color: 'text-[#CE1126]', bgColor: 'bg-[#CE1126]/10' },
  PAYMENT_RECEIVED: { icon: CreditCard, color: 'text-[#006B3F]', bgColor: 'bg-[#006B3F]/10' },
  SALON_APPROVED: { icon: CheckCircle, color: 'text-[#006B3F]', bgColor: 'bg-[#006B3F]/10' },
  SALON_REJECTED: { icon: AlertCircle, color: 'text-[#CE1126]', bgColor: 'bg-[#CE1126]/10' },
  REVIEW_SUBMITTED: { icon: Scissors, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  default: { icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-50' },
};

interface Activity {
  id: string;
  type: string;
  description: string;
  userEmail?: string;
  userName?: string;
  createdAt: string;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function RecentActivitySection() {
  const { data: activities, isLoading } = useRecentActivities(5);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-[#006B3F]" size={24} />
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
        <div className="text-center py-8 text-gray-500">
          <Clock className="mx-auto mb-2 text-gray-300" size={32} />
          <p className="text-sm">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
      <div className="space-y-4">
        {activities.map((activity: Activity) => {
          const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.default;
          const Icon = config.icon;
          return (
            <div key={activity.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bgColor}`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{activity.description}</p>
                  <p className="text-xs text-gray-500">
                    {activity.userName || activity.userEmail || 'System'}
                  </p>
                </div>
              </div>
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                {formatTimeAgo(activity.createdAt)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Dashboard() {
  const [period, setPeriod] = useState(30);
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics(period);

  const isLoading = statsLoading || metricsLoading;

  // Transform API data for charts
  const bookingData = metrics?.bookingsByDay?.map((item: { date: string; count: number }) => ({
    name: new Date(item.date).toLocaleDateString('en', { weekday: 'short' }),
    bookings: item.count,
  })) || [];

  const revenueData = metrics?.revenueByWeek?.map((item: { week: string; amount: number }) => ({
    name: item.week,
    revenue: item.amount,
  })) || [];

  const userGrowthData = metrics?.userGrowth?.map((item: { month: string; count: number }) => ({
    name: item.month,
    users: item.count,
  })) || [];

  const salonStatusData = [
    { name: 'Approved', value: (stats?.stats as { approvedSalons?: number })?.approvedSalons || 0, color: GHANA_COLORS.green },
    { name: 'Pending', value: (stats?.stats as { pendingSalons?: number })?.pendingSalons || 0, color: GHANA_COLORS.gold },
    { name: 'Rejected', value: (stats?.stats as { rejectedSalons?: number })?.rejectedSalons || 0, color: GHANA_COLORS.red },
  ].filter(item => item.value > 0);

  const statsCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(metrics?.totalRevenue || 0),
      change: '+8.2%',
      trend: 'up',
      icon: CreditCard,
      borderColor: 'border-l-[#006B3F]',
      iconBg: 'bg-[#006B3F]/10',
      iconColor: 'text-[#006B3F]',
      subtitle: 'vs last month',
    },
    {
      title: 'Total Bookings',
      value: stats?.stats?.totalBookings?.toLocaleString() || '0',
      change: `+${stats?.stats?.bookingsLast24h || 0}`,
      trend: 'up',
      icon: Calendar,
      borderColor: 'border-l-[#FCD116]',
      iconBg: 'bg-[#FCD116]/10',
      iconColor: 'text-[#B8960F]',
      subtitle: 'last 24h',
    },
    {
      title: 'Total Users',
      value: stats?.stats?.totalUsers?.toLocaleString() || '0',
      change: '+15.3%',
      trend: 'up',
      icon: Users,
      borderColor: 'border-l-blue-500',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      subtitle: 'vs last month',
    },
    {
      title: 'Pending Salons',
      value: ((stats?.stats as { pendingSalons?: number })?.pendingSalons || 0).toString(),
      change: 'Needs review',
      trend: 'neutral',
      icon: Store,
      borderColor: 'border-l-[#CE1126]',
      iconBg: 'bg-[#CE1126]/10',
      iconColor: 'text-[#CE1126]',
      subtitle: 'awaiting approval',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="relative">
          <Loader2 className="animate-spin text-[#006B3F]" size={48} />
          <div className="absolute inset-0 animate-ping">
            <Loader2 className="text-[#FCD116] opacity-20" size={48} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back! Here's what's happening.</p>
        </div>
        <div className="flex gap-2">
          {[
            { value: 7, label: '7D' },
            { value: 30, label: '30D' },
            { value: 90, label: '90D' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                period === option.value
                  ? 'bg-[#006B3F] text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.title} 
              className={`bg-white rounded-xl shadow-sm p-5 border-l-4 ${stat.borderColor} hover:shadow-md transition-shadow duration-200`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-2 truncate">{stat.value}</p>
                  <div className="flex items-center mt-2 gap-1">
                    {stat.trend === 'up' && <TrendingUp size={14} className="text-green-500" />}
                    {stat.trend === 'down' && <TrendingDown size={14} className="text-red-500" />}
                    <span className={`text-xs font-medium ${
                      stat.trend === 'up' ? 'text-green-500' : 
                      stat.trend === 'down' ? 'text-red-500' : 
                      'text-gray-500'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">{stat.subtitle}</span>
                  </div>
                </div>
                <div className={`${stat.iconBg} p-3 rounded-xl`}>
                  <Icon className={`${stat.iconColor} w-5 h-5`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Daily Bookings</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bookingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a2e', 
                    border: 'none', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{ color: '#FCD116' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="bookings" fill={GHANA_COLORS.gold} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Weekly Revenue</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip 
                  formatter={(value) => [`GHS ${value}`, 'Revenue']}
                  contentStyle={{ 
                    backgroundColor: '#1a1a2e', 
                    border: 'none', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{ color: '#FCD116' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke={GHANA_COLORS.green}
                  strokeWidth={3}
                  dot={{ fill: GHANA_COLORS.green, r: 4, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: GHANA_COLORS.green, stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">User Growth</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a2e', 
                    border: 'none', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{ color: '#FCD116' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Salon Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Salon Status</h2>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salonStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {salonStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a2e', 
                    border: 'none', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mt-4">
            {salonStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600 font-medium">
                  {item.name} <span className="text-gray-400">({item.value})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <RecentActivitySection />
    </div>
  );
}

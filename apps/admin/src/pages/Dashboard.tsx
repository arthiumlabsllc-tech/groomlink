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
} from 'lucide-react';
import { useDashboardStats, useDashboardMetrics } from '../hooks';
import { formatCurrency } from '../lib/utils';

const _COLORS = ['#28a745', '#ffc107', '#dc3545', '#6c757d'];

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
    { name: 'Approved', value: (stats?.stats as { approvedSalons?: number })?.approvedSalons || 0, color: '#28a745' },
    { name: 'Pending', value: (stats?.stats as { pendingSalons?: number })?.pendingSalons || 0, color: '#ffc107' },
    { name: 'Rejected', value: (stats?.stats as { rejectedSalons?: number })?.rejectedSalons || 0, color: '#dc3545' },
  ].filter(item => item.value > 0);

  const statsCards = [
    {
      title: 'Total Bookings',
      value: stats?.stats?.totalBookings?.toLocaleString() || '0',
      change: `+${stats?.stats?.bookingsLast24h || 0}`,
      trend: 'up',
      icon: Calendar,
      color: 'bg-blue-500',
      subtitle: 'last 24h',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(metrics?.totalRevenue || 0),
      change: '+8.2%',
      trend: 'up',
      icon: CreditCard,
      color: 'bg-green-500',
      subtitle: 'vs last month',
    },
    {
      title: 'Total Users',
      value: stats?.stats?.totalUsers?.toLocaleString() || '0',
      change: '+15.3%',
      trend: 'up',
      icon: Users,
      color: 'bg-purple-500',
      subtitle: 'vs last month',
    },
    {
      title: 'Registered Salons',
      value: stats?.stats?.totalSalons?.toLocaleString() || '0',
      change: '+5.1%',
      trend: 'up',
      icon: Store,
      color: 'bg-orange-500',
      subtitle: 'vs last month',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-[#CE1126]" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex gap-2">
          <select 
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="px-3 md:px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white w-full sm:w-auto"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-xl shadow-sm p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-gray-500 truncate">{stat.title}</p>
                  <p className="text-lg md:text-2xl font-bold text-gray-800 mt-1 truncate">{stat.value}</p>
                  <div className="flex items-center mt-1 md:mt-2">
                    {stat.trend === 'up' ? (
                      <ArrowUp size={14} className="text-green-500 md:w-4 md:h-4" />
                    ) : (
                      <ArrowDown size={14} className="text-red-500 md:w-4 md:h-4" />
                    )}
                    <span className={`text-xs md:text-sm ml-1 ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                      {stat.change}
                    </span>
                    <span className="text-xs text-gray-400 ml-1 md:ml-2 hidden sm:inline">{stat.subtitle}</span>
                  </div>
                </div>
                <div className={`${stat.color} p-2 md:p-3 rounded-lg ml-2`}>
                  <Icon className="text-white w-4 h-4 md:w-6 md:h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
        {/* Bookings Chart */}
        <div className="bg-white rounded-xl shadow-sm p-3 md:p-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-2 md:mb-4">Daily Bookings</h2>
          <div className="h-48 md:h-72 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bookingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="bookings" fill="#CE1126" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-sm p-3 md:p-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-2 md:mb-4">Weekly Revenue</h2>
          <div className="h-48 md:h-72 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => `GHS ${value}`} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#006B3F"
                  strokeWidth={2}
                  dot={{ fill: '#006B3F', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
        {/* User Growth */}
        <div className="bg-white rounded-xl shadow-sm p-3 md:p-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-2 md:mb-4">User Growth</h2>
          <div className="h-48 md:h-72 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#FCD116"
                  strokeWidth={2}
                  dot={{ fill: '#FCD116', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Salon Status */}
        <div className="bg-white rounded-xl shadow-sm p-3 md:p-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-2 md:mb-4">Salon Status</h2>
          <div className="h-48 md:h-72 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salonStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {salonStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 md:gap-6 mt-3 md:mt-4">
            {salonStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 md:w-3 md:h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs md:text-sm text-gray-600">
                  {item.name} ({item.value})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm p-3 md:p-6">
        <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-2 md:mb-4">Recent Activity</h2>
        <div className="space-y-1 md:space-y-4">
          {[
            { action: 'New salon registration', detail: 'Elite Barbershop', time: '2 min ago', type: 'info' },
            { action: 'Booking completed', detail: 'GHS 50 - Haircut', time: '5 min ago', type: 'success' },
            { action: 'Payment received', detail: 'GHS 75 - MTN MoMo', time: '10 min ago', type: 'success' },
            { action: 'User complaint', detail: 'Service not as expected', time: '15 min ago', type: 'warning' },
            { action: 'Salon approved', detail: 'Fresh Cuts Salon', time: '30 min ago', type: 'success' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between py-2 md:py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  activity.type === 'success' ? 'bg-green-500' :
                  activity.type === 'warning' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm font-medium text-gray-800 truncate">{activity.action}</p>
                  <p className="text-xs text-gray-500 truncate">{activity.detail}</p>
                </div>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

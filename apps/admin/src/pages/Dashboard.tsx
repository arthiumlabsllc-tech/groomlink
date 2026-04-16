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
  Wallet,
  DollarSign,
  PiggyBank,
  Activity,
  Database,
  Server,
  ShieldAlert,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { useDashboardStats, useDashboardMetrics, useRecentActivities, useComprehensiveRevenueStats, usePaystackBalance, useSystemMonitoring } from '../hooks';
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

// Helper function to calculate percentage change between two periods
function calculatePercentageChange(current: number, previous: number): string {
  if (!previous || previous === 0) {
    return current > 0 ? '+∞%' : '0%';
  }
  const change = ((current - previous) / previous) * 100;
  const formatted = Math.abs(change).toFixed(1);
  const sign = change >= 0 ? '+' : '-';
  return `${sign}${formatted}%`;
}

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Helper function to format bytes to MB
function formatMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// System Monitoring Section Component
function SystemMonitoringSection() {
  const { data: monitoring, isLoading, isFetching, refetch } = useSystemMonitoring(30000);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#006B3F]" />
            System Monitoring
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-[#006B3F]" size={32} />
        </div>
      </div>
    );
  }

  // Use nullish coalescing for each property to handle missing data
  const api = monitoring?.api ?? { status: 'healthy', uptime: 0, version: '' };
  const database = monitoring?.database ?? { status: 'disconnected' as const, responseTimeMs: 0 };
  const redis = monitoring?.redis ?? { status: 'disconnected' as const, responseTimeMs: 0, memoryUsage: 'N/A' };
  const memory = monitoring?.memory ?? { heapUsed: 0, heapTotal: 0, rss: 0, external: 0 };
  const activeSessions = monitoring?.activeSessions ?? { count: 0, socketConnections: 0 };
  const suspiciousActivity = monitoring?.suspiciousActivity ?? { recentFailedLogins: 0 };

  // Calculate memory usage percentage
  const memoryUsagePercent = memory.heapTotal > 0
    ? Math.round((memory.heapUsed / memory.heapTotal) * 100)
    : 0;

  const statusCards = [
    {
      title: 'API Status',
      status: api.status === 'healthy' ? 'Healthy' : 'Issues',
      isHealthy: api.status === 'healthy',
      icon: Zap,
      details: `Uptime: ${formatUptime(api.uptime)}`,
      subDetails: `Node ${api.version}`,
    },
    {
      title: 'Database',
      status: database.status === 'connected' ? 'Connected' : 'Disconnected',
      isHealthy: database.status === 'connected',
      icon: Database,
      details: `Response: ${database.responseTimeMs}ms`,
      subDetails: 'poolSize' in database && database.poolSize ? `Pool: ${database.poolSize}` : undefined,
    },
    {
      title: 'Redis',
      status: redis.status === 'connected' ? 'Connected' : 'Disconnected',
      isHealthy: redis.status === 'connected',
      icon: Server,
      details: `Response: ${redis.responseTimeMs}ms`,
      subDetails: redis.memoryUsage !== 'N/A' ? `Memory: ${redis.memoryUsage}` : undefined,
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#006B3F]" />
          System Monitoring
        </h2>
        <div className="flex items-center gap-2">
          {isFetching && <Loader2 className="animate-spin text-gray-400" size={16} />}
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:text-[#006B3F] hover:bg-[#006B3F]/10 rounded-lg transition-colors"
            title="Refresh now"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {statusCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`p-3 sm:p-4 rounded-lg border ${card.isHealthy ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${card.isHealthy ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Icon className={`w-4 h-4 ${card.isHealthy ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{card.title}</p>
                    <p className={`text-xs font-semibold ${card.isHealthy ? 'text-green-600' : 'text-red-600'}`}>
                      {card.status}
                    </p>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${card.isHealthy ? 'bg-green-500' : 'bg-red-500'} ${card.isHealthy ? 'animate-pulse' : ''}`} />
              </div>
              <div className="mt-3 text-xs text-gray-600">
                <p>{card.details}</p>
                {card.subDetails && <p className="text-gray-400">{card.subDetails}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Memory Usage Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Memory Usage</span>
          <span className="text-sm text-gray-500">{memoryUsagePercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              memoryUsagePercent > 80 ? 'bg-red-500' : memoryUsagePercent > 60 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(memoryUsagePercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Heap: {formatMB(memory.heapUsed)} / {formatMB(memory.heapTotal)}</span>
          <span>RSS: {formatMB(memory.rss)}</span>
        </div>
      </div>

      {/* Active Sessions & Suspicious Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-lg border border-blue-100 bg-blue-50">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Active Sessions</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{activeSessions.count}</p>
          <p className="text-xs text-gray-500">
            {activeSessions.socketConnections > 0 && `${activeSessions.socketConnections} socket connections`}
          </p>
        </div>

        <div className={`p-3 sm:p-4 rounded-lg border ${suspiciousActivity.recentFailedLogins > 0 ? 'border-red-200 bg-red-50' : 'border-green-100 bg-green-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className={`w-4 h-4 ${suspiciousActivity.recentFailedLogins > 0 ? 'text-red-600' : 'text-green-600'}`} />
            <span className="text-sm font-medium text-gray-700">Suspicious Activity</span>
          </div>
          <p className={`text-2xl font-bold ${suspiciousActivity.recentFailedLogins > 0 ? 'text-red-600' : 'text-gray-800'}`}>
            {suspiciousActivity.recentFailedLogins}
          </p>
          <p className="text-xs text-gray-500">Failed logins (24h)</p>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        Auto-refreshes every 30 seconds
      </p>
    </div>
  );
}

function RecentActivitySection() {
  const { data: activities, isLoading } = useRecentActivities(5);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Recent Activity</h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-[#006B3F]" size={24} />
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Recent Activity</h2>
        <div className="text-center py-8 text-gray-500">
          <Clock className="mx-auto mb-2 text-gray-300" size={32} />
          <p className="text-sm">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Recent Activity</h2>
      <div className="space-y-3 sm:space-y-4">
        {activities.map((activity: Activity) => {
          const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.default;
          const Icon = config.icon;
          return (
            <div key={activity.id} className="flex items-center justify-between py-2 sm:py-3 border-b border-gray-100 last:border-0 last:pb-0">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.bgColor}`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">{activity.description}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                    {activity.userName || activity.userEmail || 'System'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] sm:text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full flex-shrink-0 ml-2">
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
  const { data: revenueStats, isLoading: revenueStatsLoading } = useComprehensiveRevenueStats();
  const { data: paystackBalance, isLoading: paystackBalanceLoading } = usePaystackBalance();

  const isLoading = statsLoading || metricsLoading || revenueStatsLoading;

  // Transform API data for charts
  // API returns dailyBookings, dailyRevenue, userGrowth (backend field names)
  // Frontend previously expected bookingsByDay, revenueByWeek - now using actual API field names
  const bookingData = (metrics?.dailyBookings || metrics?.bookingsByDay || [])?.map((item: { date: string; count: number }) => ({
    name: new Date(item.date).toLocaleDateString('en', { weekday: 'short' }),
    bookings: item.count,
  })) || [];

  const revenueData = (metrics?.dailyRevenue || metrics?.revenueByWeek || [])?.map((item: { date?: string; week?: string; total?: number; amount?: number }) => ({
    name: item.date || item.week || '',
    revenue: item.total ?? item.amount ?? 0,
  })) || [];

  const userGrowthData = (metrics?.userGrowth || [])?.map((item: { date: string; count: number }) => ({
    name: new Date(item.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    users: item.count,
  })) || [];

  // Calculate revenue change from dailyRevenue data
  // Compare first half vs second half of the period
  const calculateRevenueChange = (): string => {
    const revenueData = metrics?.dailyRevenue || [];
    if (revenueData.length < 2) return 'N/A';
    
    const midpoint = Math.floor(revenueData.length / 2);
    const previousPeriod = revenueData.slice(0, midpoint).reduce((sum: number, item: { total?: number }) => sum + (item.total || 0), 0);
    const currentPeriod = revenueData.slice(midpoint).reduce((sum: number, item: { total?: number }) => sum + (item.total || 0), 0);
    
    return calculatePercentageChange(currentPeriod, previousPeriod);
  };

  // Calculate user growth change from userGrowth data
  // Compare first half vs second half of the period
  const calculateUserChange = (): string => {
    const growthData = metrics?.userGrowth || [];
    if (growthData.length < 2) return 'N/A';
    
    const midpoint = Math.floor(growthData.length / 2);
    const previousPeriod = growthData.slice(0, midpoint).reduce((sum: number, item: { count: number }) => sum + item.count, 0);
    const currentPeriod = growthData.slice(midpoint).reduce((sum: number, item: { count: number }) => sum + item.count, 0);
    
    return calculatePercentageChange(currentPeriod, previousPeriod);
  };

  // Calculate total revenue from dailyRevenue
  const totalRevenue = (metrics?.dailyRevenue || [])?.reduce(
    (sum: number, item: { total?: number }) => sum + (item.total || 0), 
    0
  ) || metrics?.totalRevenue || 0;

  // Use comprehensive revenue stats for accurate totals
  const comprehensiveTotalRevenue = revenueStats?.totalRevenue || 0;
  const platformFeesEarned = revenueStats?.platformFeesEarned || 0;
  const pendingPayouts = revenueStats?.pendingPayouts || 0;
  const completedPayouts = revenueStats?.completedPayouts || 0;

  // Get Paystack balance (GHS)
  const ghsBalance = paystackBalance?.balances?.find(b => b.currency === 'GHS');
  const paystackBalanceAmount = ghsBalance?.balance || 0;

  const salonStatusData = [
    { name: 'Approved', value: (stats?.stats as { approvedSalons?: number })?.approvedSalons || 0, color: GHANA_COLORS.green },
    { name: 'Pending', value: (stats?.stats as { pendingSalons?: number })?.pendingSalons || 0, color: GHANA_COLORS.gold },
    { name: 'Rejected', value: (stats?.stats as { rejectedSalons?: number })?.rejectedSalons || 0, color: GHANA_COLORS.red },
  ].filter(item => item.value > 0);

  const statsCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(comprehensiveTotalRevenue),
      change: calculateRevenueChange(),
      trend: 'up',
      icon: CreditCard,
      borderColor: 'border-l-[#006B3F]',
      iconBg: 'bg-[#006B3F]/10',
      iconColor: 'text-[#006B3F]',
      subtitle: 'vs prior period',
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
      change: calculateUserChange(),
      trend: 'up',
      icon: Users,
      borderColor: 'border-l-blue-500',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      subtitle: 'vs prior period',
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

  // Financial stats cards
  const financialStatsCards = [
    {
      title: 'Paystack Balance',
      value: formatCurrency(paystackBalanceAmount),
      subtitle: paystackBalanceLoading ? 'Loading...' : 'real-time',
      icon: Wallet,
      borderColor: 'border-l-purple-500',
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-500',
    },
    {
      title: 'Platform Fees Earned',
      value: formatCurrency(platformFeesEarned),
      subtitle: 'total fees collected',
      icon: DollarSign,
      borderColor: 'border-l-emerald-500',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
    },
    {
      title: 'Pending Payouts',
      value: formatCurrency(pendingPayouts),
      subtitle: 'held in escrow',
      icon: PiggyBank,
      borderColor: 'border-l-orange-500',
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-500',
    },
    {
      title: 'Completed Payouts',
      value: formatCurrency(completedPayouts),
      subtitle: 'released to providers',
      icon: CheckCircle,
      borderColor: 'border-l-cyan-500',
      iconBg: 'bg-cyan-50',
      iconColor: 'text-cyan-500',
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Welcome back! Here's what's happening.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-start">
          {[
            { value: 7, label: '7D' },
            { value: 30, label: '30D' },
            { value: 90, label: '90D' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 min-h-[44px] ${
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.title} 
              className={`bg-white rounded-xl shadow-sm p-3 sm:p-5 border-l-4 ${stat.borderColor} hover:shadow-md transition-shadow duration-200`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">{stat.title}</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-800 mt-1 sm:mt-2 truncate">{stat.value}</p>
                  <div className="flex items-center mt-1 sm:mt-2 gap-1 flex-wrap">
                    {stat.trend === 'up' && <TrendingUp size={12} className="text-green-500 sm:w-3.5 sm:h-3.5" />}
                    {stat.trend === 'down' && <TrendingDown size={12} className="text-red-500 sm:w-3.5 sm:h-3.5" />}
                    <span className={`text-[10px] sm:text-xs font-medium ${
                      stat.trend === 'up' ? 'text-green-500' : 
                      stat.trend === 'down' ? 'text-red-500' : 
                      'text-gray-500'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-[10px] sm:text-xs text-gray-400 ml-1 hidden sm:inline">{stat.subtitle}</span>
                  </div>
                </div>
                <div className={`${stat.iconBg} p-2 sm:p-3 rounded-lg sm:rounded-xl`}>
                  <Icon className={`${stat.iconColor} w-4 h-4 sm:w-5 sm:h-5`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Financial Stats Section */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-3 sm:p-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
          Financial Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {financialStatsCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div 
                key={stat.title} 
                className={`bg-white rounded-xl shadow-sm p-3 sm:p-5 border-l-4 ${stat.borderColor} hover:shadow-md transition-shadow duration-200`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500 font-medium">{stat.title}</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-800 mt-1 sm:mt-2 truncate">{stat.value}</p>
                    <span className="text-[10px] sm:text-xs text-gray-400">{stat.subtitle}</span>
                  </div>
                  <div className={`${stat.iconBg} p-2 sm:p-3 rounded-lg sm:rounded-xl`}>
                    <Icon className={`${stat.iconColor} w-4 h-4 sm:w-5 sm:h-5`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Bookings Chart */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Daily Bookings</h2>
          <div className="h-56 sm:h-72">
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
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Weekly Revenue</h2>
          <div className="h-56 sm:h-72">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* User Growth */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">User Growth</h2>
          <div className="h-56 sm:h-72">
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
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Salon Status</h2>
          <div className="h-56 sm:h-72 flex items-center justify-center">
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

      {/* System Monitoring */}
      <SystemMonitoringSection />

      {/* Recent Activity */}
      <RecentActivitySection />
    </div>
  );
}

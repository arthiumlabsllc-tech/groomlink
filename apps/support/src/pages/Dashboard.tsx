import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Store, Ticket, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { api } from '../api';

interface Stats {
  totalUsers: number;
  totalSalons: number;
  activeBookings: number;
  openTickets: number;
  todaySignups: number;
  pendingSalons: number;
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ghana-green"></div>
      </div>
    );
  }

  const statCards = [
    { name: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'border-l-blue-500', iconBg: 'bg-blue-100 text-blue-600', href: '/users' },
    { name: 'Total Salons', value: stats?.totalSalons || 0, icon: Store, color: 'border-l-purple-500', iconBg: 'bg-purple-100 text-purple-600', href: '/salons' },
    { name: 'Open Tickets', value: stats?.openTickets || 0, icon: Ticket, color: 'border-l-ghana-yellow', iconBg: 'bg-yellow-100 text-yellow-600', href: '/tickets' },
    { name: 'Active Bookings', value: stats?.activeBookings || 0, icon: Clock, color: 'border-l-ghana-green', iconBg: 'bg-green-100 text-green-600' },
  ];

  const quickStats = [
    { name: 'Today\'s Signups', value: stats?.todaySignups || 0, icon: TrendingUp, trend: '+12%', trendColor: 'text-ghana-green' },
    { name: 'Pending Salons', value: stats?.pendingSalons || 0, icon: AlertCircle, trend: 'Needs review', trendColor: 'text-ghana-yellow' },
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
      case 'URGENT':
        return 'bg-ghana-red/10 text-ghana-red border border-ghana-red/20';
      case 'MEDIUM':
        return 'bg-ghana-yellow/10 text-yellow-700 border border-ghana-yellow/30';
      case 'LOW':
        return 'bg-ghana-green/10 text-ghana-green border border-ghana-green/20';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'CUSTOMER':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'SALON_OWNER':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'SUPPORT':
        return 'bg-ghana-green/10 text-ghana-green border border-ghana-green/20';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-heading">Support Dashboard</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href || '#'}
            className={`bg-white rounded-xl p-3 sm:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 border-l-4 ${stat.color}`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-2 sm:p-2.5 rounded-lg ${stat.iconBg}`}>
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wide">{stat.name}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickStats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <stat.icon className="w-4 h-4 text-gray-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">{stat.name}</span>
              </div>
              <span className={`text-sm font-semibold ${stat.trendColor}`}>{stat.trend}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-3">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 font-heading">Recent Users</h2>
              <Link to="/users" className="text-sm text-ghana-green hover:text-support-700 font-medium transition-colors">
                View all
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {recentUsers.length > 0 ? (
              recentUsers.map((user: any) => (
                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-sm">
                        {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{user.phoneNumber}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                    {user.role}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">No recent users</div>
            )}
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 font-heading">Recent Tickets</h2>
              <Link to="/tickets" className="text-sm text-ghana-green hover:text-support-700 font-medium transition-colors">
                View all
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {recentTickets.length > 0 ? (
              recentTickets.map((ticket: any) => (
                <div key={ticket.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      ticket.priority === 'HIGH' || ticket.priority === 'URGENT' ? 'bg-ghana-red' :
                      ticket.priority === 'MEDIUM' ? 'bg-ghana-yellow' :
                      'bg-ghana-green'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{ticket.subject}</p>
                      <p className="text-sm text-gray-500">{ticket.user?.firstName} • {ticket.createdAt}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityBadge(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">No recent tickets</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

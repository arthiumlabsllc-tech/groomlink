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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-support-500"></div>
      </div>
    );
  }

  const statCards = [
    { name: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'bg-blue-500', href: '/users' },
    { name: 'Total Salons', value: stats?.totalSalons || 0, icon: Store, color: 'bg-purple-500', href: '/salons' },
    { name: 'Open Tickets', value: stats?.openTickets || 0, icon: Ticket, color: 'bg-orange-500', href: '/tickets' },
    { name: 'Active Bookings', value: stats?.activeBookings || 0, icon: Clock, color: 'bg-green-500' },
  ];

  const quickStats = [
    { name: 'Today\'s Signups', value: stats?.todaySignups || 0, icon: TrendingUp, trend: '+12%' },
    { name: 'Pending Salons', value: stats?.pendingSalons || 0, icon: AlertCircle, trend: 'Needs review' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href || '#'}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.name}</p>
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
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <stat.icon className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">{stat.name}</span>
              </div>
              <span className="text-sm text-gray-500">{stat.trend}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Recent Users</h2>
              <Link to="/users" className="text-sm text-support-600 hover:text-support-700">
                View all
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {recentUsers.length > 0 ? (
              recentUsers.map((user: any) => (
                <div key={user.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{user.phoneNumber}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'CUSTOMER' ? 'bg-blue-100 text-blue-700' :
                    user.role === 'SALON_OWNER' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Recent Tickets</h2>
              <Link to="/tickets" className="text-sm text-support-600 hover:text-support-700">
                View all
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {recentTickets.length > 0 ? (
              recentTickets.map((ticket: any) => (
                <div key={ticket.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{ticket.subject}</p>
                    <p className="text-sm text-gray-500">{ticket.user?.firstName} • {ticket.createdAt}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    ticket.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                    ticket.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {ticket.status}
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

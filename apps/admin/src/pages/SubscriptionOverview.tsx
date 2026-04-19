import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import LoadingScreen from '../components/LoadingScreen';
import {
  useSubscriptionOverview,
  useRecentSubscriptions,
  useExpiringSoonSubscriptions,
  useSubscriptionPlans,
} from '../hooks';
import { formatCurrency, formatDate } from '../lib/utils';

const GHANA_COLORS = {
  green: '#006B3F',
  gold: '#FCD116',
  red: '#CE1126',
};

// Stat Card Skeleton
function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border-l-4 border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="skeleton-shimmer w-24 h-4 mb-2" />
          <div className="skeleton-shimmer w-20 h-8 sm:h-10 mb-2" />
        </div>
        <div className="skeleton-shimmer w-10 h-10 sm:w-12 sm:h-12 rounded-lg" />
      </div>
    </div>
  );
}

// Table Skeleton
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-shimmer w-full h-12 rounded-lg" />
      ))}
    </div>
  );
}

export function SubscriptionOverview() {
  const { data: overview, isLoading: overviewLoading } = useSubscriptionOverview();
  const { data: recentSubscriptions, isLoading: recentLoading } = useRecentSubscriptions();
  const { data: expiringSoon, isLoading: expiringLoading } = useExpiringSoonSubscriptions();
  const { data: plans } = useSubscriptionPlans();

  const statsCards = [
    {
      title: 'Total Subscribers',
      value: overview?.totalSubscribers || 0,
      icon: 'group',
      borderColor: 'border-l-[#006B3F]',
      iconBg: 'bg-[#006B3F]/10',
      iconColor: 'text-[#006B3F]',
    },
    {
      title: 'Revenue This Month',
      value: formatCurrency(overview?.revenueThisMonth || 0),
      icon: 'payments',
      borderColor: 'border-l-[#FCD116]',
      iconBg: 'bg-[#FCD116]/10',
      iconColor: 'text-[#B8960F]',
    },
    {
      title: 'Active Pro',
      value: overview?.activePro || 0,
      icon: 'workspace_premium',
      borderColor: 'border-l-blue-500',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Active Premium',
      value: overview?.activePremium || 0,
      icon: 'diamond',
      borderColor: 'border-l-purple-500',
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-500',
    },
    {
      title: 'Expiring Soon',
      value: overview?.expiringSoon || 0,
      icon: 'schedule',
      borderColor: 'border-l-orange-500',
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-500',
    },
  ];

  const tierData = [
    { name: 'Free', value: overview?.subscribersByTier?.free || 0, color: '#9CA3AF' },
    { name: 'Pro', value: overview?.subscribersByTier?.pro || 0, color: GHANA_COLORS.green },
    { name: 'Premium', value: overview?.subscribersByTier?.premium || 0, color: GHANA_COLORS.gold },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700',
      EXPIRED: 'bg-gray-100 text-gray-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  if (overviewLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Subscription Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage salon subscriptions, plans, and billing
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/subscriptions/plans"
            className="btn-ripple flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Icon name="category" size={18} />
            Plans
          </Link>
          <Link
            to="/subscriptions/invoices"
            className="btn-ripple flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#006B3F] text-white hover:bg-[#005a35] transition-colors"
          >
            <Icon name="receipt" size={18} />
            Invoices
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {overviewLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          statsCards.map((stat) => (
            <div
              key={stat.title}
              className={`bg-white rounded-xl shadow-sm p-4 sm:p-5 border-l-4 ${stat.borderColor} card-v2`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">{stat.title}</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-800 mt-1 truncate">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.iconBg} p-2 sm:p-3 rounded-lg`}>
                  <Icon name={stat.icon} className={`${stat.iconColor} w-4 h-4 sm:w-5 sm:h-5`} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Subscribers by Tier & Expiring Soon */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Subscribers by Tier */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 card-v2">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Icon name="bar_chart" className="w-5 h-5 text-[#006B3F]" />
            Subscribers by Tier
          </h2>
          {overviewLoading ? (
            <div className="skeleton-shimmer w-full h-48 rounded-lg" />
          ) : (
            <div className="space-y-4">
              {tierData.map((tier) => (
                <div key={tier.name} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-medium text-gray-700">{tier.name}</div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="h-4 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(
                            (tier.value / Math.max(overview?.totalSubscribers || 1, 1)) * 100,
                            5
                          )}%`,
                          backgroundColor: tier.color,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-right text-sm font-semibold text-gray-800">
                    {tier.value}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Total Plans Available</span>
              <span className="font-medium text-gray-800">{plans?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 card-v2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Icon name="schedule" className="w-5 h-5 text-orange-500" />
              Expiring Soon (7 days)
            </h2>
            <span className="text-xs text-gray-500">{expiringSoon?.length || 0} salons</span>
          </div>
          {expiringLoading ? (
            <TableSkeleton rows={3} />
          ) : expiringSoon && expiringSoon.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {expiringSoon.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.salonName}</p>
                    <p className="text-xs text-gray-500">
                      {item.planName} • Expires {formatDate(item.expiryDate)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      item.daysRemaining <= 3
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {item.daysRemaining}d left
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Icon name="check_circle" className="mx-auto mb-2 text-green-500" size={32} />
              <p className="text-sm">No subscriptions expiring soon</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Subscriptions */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 card-v2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Icon name="history" className="w-5 h-5 text-[#006B3F]" />
            Recent Subscription Changes
          </h2>
          <Link
            to="/subscriptions/invoices"
            className="text-sm text-[#006B3F] hover:text-[#005a35] font-medium"
          >
            View All
          </Link>
        </div>
        {recentLoading ? (
          <TableSkeleton rows={5} />
        ) : recentSubscriptions && recentSubscriptions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Salon
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentSubscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-gray-800">{sub.salonName}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-700">{sub.planName}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                          sub.status
                        )}`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-500">{formatDate(sub.changedAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Icon name="schedule" className="mx-auto mb-2 text-gray-300" size={32} />
            <p className="text-sm">No recent subscription changes</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/subscriptions/plans"
          className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow card-v2"
        >
          <div className="w-12 h-12 bg-[#006B3F]/10 rounded-lg flex items-center justify-center">
            <Icon name="category" className="w-6 h-6 text-[#006B3F]" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Manage Plans</p>
            <p className="text-xs text-gray-500">Create and edit subscription plans</p>
          </div>
        </Link>
        <Link
          to="/subscriptions/invoices"
          className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow card-v2"
        >
          <div className="w-12 h-12 bg-[#FCD116]/10 rounded-lg flex items-center justify-center">
            <Icon name="receipt" className="w-6 h-6 text-[#B8960F]" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">View Invoices</p>
            <p className="text-xs text-gray-500">Check payment history and status</p>
          </div>
        </Link>
        <Link
          to="/salons"
          className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow card-v2"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
            <Icon name="storefront" className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Salon Subscriptions</p>
            <p className="text-xs text-gray-500">Manage individual salon plans</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

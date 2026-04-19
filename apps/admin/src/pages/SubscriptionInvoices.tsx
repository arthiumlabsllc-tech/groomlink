import { useState } from 'react';
import Icon from '../components/Icon';
import LoadingScreen from '../components/LoadingScreen';
import { useInvoices, useSubscriptionPlans } from '../hooks';
import { formatCurrency, formatDate } from '../lib/utils';

const INVOICE_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
];

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest First' },
  { value: 'createdAt:asc', label: 'Oldest First' },
  { value: 'amount:desc', label: 'Amount (High to Low)' },
  { value: 'amount:asc', label: 'Amount (Low to High)' },
];

export function SubscriptionInvoices() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt:desc');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: invoicesData, isLoading } = useInvoices(
    page,
    20,
    statusFilter || undefined,
    startDate || undefined,
    endDate || undefined,
    planFilter || undefined
  );
  const { data: plans } = useSubscriptionPlans();

  const invoices = invoicesData?.data || [];
  const pagination = invoicesData?.pagination;

  // Filter and sort locally
  const filteredInvoices = invoices
    .filter((invoice) => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        invoice.salonName.toLowerCase().includes(search) ||
        invoice.paymentReference?.toLowerCase().includes(search) ||
        invoice.planName.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      const [field, order] = sortBy.split(':');
      const multiplier = order === 'desc' ? -1 : 1;

      if (field === 'amount') {
        return (a.amount - b.amount) * multiplier;
      }
      if (field === 'createdAt') {
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * multiplier;
      }
      return 0;
    });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PAID: 'bg-green-100 text-green-700 border-green-200',
      PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      FAILED: 'bg-red-100 text-red-700 border-red-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      PAID: 'check_circle',
      PENDING: 'schedule',
      FAILED: 'error',
    };
    return icons[status] || 'help';
  };

  const clearFilters = () => {
    setStatusFilter('');
    setPlanFilter('');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setPage(1);
  };

  const hasActiveFilters = statusFilter || planFilter || startDate || endDate || searchTerm;

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Subscription Invoices</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            View and manage all subscription payments
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icon name="clear_all" size={18} />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 card-v2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Search
            </label>
            <div className="relative">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search salon, reference..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all text-sm"
            >
              {INVOICE_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Plan Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Plan
            </label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all text-sm"
            >
              <option value="">All Plans</option>
              {plans?.map((plan) => (
                <option key={plan.slug} value={plan.slug}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              From
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all text-sm"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              To
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all text-sm"
            />
          </div>
        </div>

        {/* Sort */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
          <span className="text-sm text-gray-500">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all text-sm"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500 card-v2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Paid</p>
              <p className="text-lg font-bold text-gray-800">
                {formatCurrency(
                  filteredInvoices
                    .filter((i) => i.status === 'PAID')
                    .reduce((sum, i) => sum + i.amount, 0)
                )}
              </p>
            </div>
            <div className="bg-green-50 p-2 rounded-lg">
              <Icon name="check_circle" className="text-green-500" size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500 card-v2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Pending</p>
              <p className="text-lg font-bold text-gray-800">
                {formatCurrency(
                  filteredInvoices
                    .filter((i) => i.status === 'PENDING')
                    .reduce((sum, i) => sum + i.amount, 0)
                )}
              </p>
            </div>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <Icon name="schedule" className="text-yellow-500" size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500 card-v2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Failed</p>
              <p className="text-lg font-bold text-gray-800">
                {formatCurrency(
                  filteredInvoices
                    .filter((i) => i.status === 'FAILED')
                    .reduce((sum, i) => sum + i.amount, 0)
                )}
              </p>
            </div>
            <div className="bg-red-50 p-2 rounded-lg">
              <Icon name="error" className="text-red-500" size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-[#006B3F] card-v2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Invoices</p>
              <p className="text-lg font-bold text-gray-800">{filteredInvoices.length}</p>
            </div>
            <div className="bg-[#006B3F]/10 p-2 rounded-lg">
              <Icon name="receipt" className="text-[#006B3F]" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden card-v2">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Salon
                </th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700">
                  <div className="flex items-center gap-1">
                    Amount
                    <Icon name="swap_vert" size={14} />
                  </div>
                </th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700">
                  <div className="flex items-center gap-1">
                    Date
                    <Icon name="swap_vert" size={14} />
                  </div>
                </th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="text-right py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#006B3F]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon name="storefront" className="text-[#006B3F]" size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {invoice.salonName}
                        </p>
                        <p className="text-xs text-gray-500">ID: {invoice.salonId.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-700">{invoice.planName}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm font-semibold text-gray-800">
                      {formatCurrency(invoice.amount)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                        invoice.status
                      )}`}
                    >
                      <Icon name={getStatusIcon(invoice.status)} size={12} />
                      {invoice.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-700">
                      <p>{formatDate(invoice.createdAt)}</p>
                      {invoice.paidAt && (
                        <p className="text-xs text-green-600">Paid {formatDate(invoice.paidAt)}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {invoice.paymentReference ? (
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {invoice.paymentReference}
                      </code>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Icon name="visibility" size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Icon name="receipt_long" className="mx-auto mb-3 text-gray-300" size={40} />
            <p className="text-sm">No invoices found</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-[#006B3F] hover:text-[#005a35] text-sm font-medium"
              >
                Clear filters to see all invoices
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {(page - 1) * 20 + 1} - {Math.min(page * 20, pagination.total)} of{' '}
              {pagination.total} invoices
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name="chevron_left" size={20} />
              </button>
              <span className="text-sm text-gray-700">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name="chevron_right" size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

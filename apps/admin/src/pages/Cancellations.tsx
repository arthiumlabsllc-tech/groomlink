import { useState } from 'react';
import Icon from '../components/Icon';
import { useCancellations } from '../hooks';
import { formatCurrency, formatDate } from '../lib/utils';
import type { CancellationRecord } from '../api/admin';

export function Cancellations() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [cancelledByFilter, setCancelledByFilter] = useState<string>('');
  const { data: cancellationsData, isLoading, error } = useCancellations(page, 20);

  const cancellations = cancellationsData?.data || [];
  const pagination = cancellationsData?.pagination;

  // Filter cancellations
  const filteredCancellations = cancellations.filter((cancellation) => {
    const matchesCancelledBy = !cancelledByFilter || cancellation.cancelledBy === cancelledByFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      cancellation.booking.salon.businessName.toLowerCase().includes(searchLower) ||
      `${cancellation.booking.customer.firstName || ''} ${cancellation.booking.customer.lastName || ''}`.toLowerCase().includes(searchLower) ||
      cancellation.id.toLowerCase().includes(searchLower);
    return matchesCancelledBy && matchesSearch;
  });

  const getCancelledByBadge = (cancelledBy: string) => {
    const isCustomer = cancelledBy === 'CUSTOMER';
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border-l-2 ${
        isCustomer 
          ? 'bg-blue-50 text-blue-700 border-l-blue-500' 
          : 'bg-purple-50 text-purple-700 border-l-purple-500'
      }`}>
        {isCustomer ? <Icon name="person" size={14} /> : <Icon name="storefront" size={14} />}
        {cancelledBy.charAt(0) + cancelledBy.slice(1).toLowerCase()}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="page-enter space-y-6">
        <div className="card-v2 p-6">
          <div className="skeleton-shimmer h-8 w-48 mb-4" />
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton-shimmer h-14 w-full mb-3" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Icon name="error" size={48} className="text-[#CE1126]" />
        <p className="text-lg font-medium text-gray-600">Failed to load cancellations data</p>
        <p className="text-sm text-gray-500">Please try again later</p>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cancellation Records</h1>
          <p className="text-sm text-gray-500 mt-1">View booking cancellation history and refund details</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 card-v2">
          <Icon name="cancel" size={18} className="text-gray-400" />
          <span className="text-sm text-gray-500">Total:</span>
          <span className="text-lg font-bold text-gray-800">{pagination?.total || 0}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by salon, customer, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-sm bg-white border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {[
            { value: '', label: 'All' },
            { value: 'CUSTOMER', label: 'By Customer' },
            { value: 'PROVIDER', label: 'By Provider' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setCancelledByFilter(option.value)}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                cancelledByFilter === option.value
                  ? 'bg-[#1a1a2e] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredCancellations.map((cancellation) => (
          <CancellationCard key={cancellation.id} cancellation={cancellation} getCancelledByBadge={getCancelledByBadge} />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block card-v2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Booking ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Cancelled By</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Salon</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Reason</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Refund %</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Refund Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Provider Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCancellations.map((cancellation) => (
                <tr key={cancellation.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-medium text-gray-800">{cancellation.booking.id.slice(0, 8)}...</span>
                  </td>
                  <td className="px-6 py-4">{getCancelledByBadge(cancellation.cancelledBy)}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-800">{cancellation.booking.salon.businessName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 max-w-xs truncate block">
                      {cancellation.reason || 'No reason provided'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${
                      cancellation.refundPercentage === 100 
                        ? 'bg-[#006B3F]/10 text-[#006B3F]'
                        : cancellation.refundPercentage >= 50
                        ? 'bg-[#FCD116]/20 text-[#B8960F]'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {cancellation.refundPercentage}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-[#006B3F]">
                      {cancellation.refundAmount ? formatCurrency(cancellation.refundAmount) : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {cancellation.providerAmount ? formatCurrency(cancellation.providerAmount) : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{formatDate(cancellation.createdAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredCancellations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 card-v2">
          <Icon name="cancel" size={48} className="text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-600">No cancellations found</p>
          <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between card-v2 px-4 py-3">
          <p className="text-sm text-gray-600">
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, pagination.total)} of {pagination.total} records
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Icon name="chevron_left" size={20} />
            </button>
            <span className="text-sm font-medium text-gray-700">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Icon name="chevron_right" size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile Card Component
function CancellationCard({ 
  cancellation, 
  getCancelledByBadge 
}: { 
  cancellation: CancellationRecord; 
  getCancelledByBadge: (cancelledBy: string) => JSX.Element;
}) {
  return (
    <div className="card-v2 p-4 border-l-4 border-l-orange-500">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#CE1126]/10 to-[#CE1126]/20 rounded-xl flex items-center justify-center">
            <Icon name="cancel" size={20} className="text-[#CE1126]" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">{cancellation.booking.salon.businessName}</p>
            <p className="text-xs text-gray-500">Booking: {cancellation.booking.id.slice(0, 8)}...</p>
          </div>
        </div>
        {getCancelledByBadge(cancellation.cancelledBy)}
      </div>
      <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-3">
        <div className="flex justify-between">
          <span className="text-gray-500">Customer:</span>
          <span className="font-medium text-gray-800">
            {cancellation.booking.customer.firstName || 'Unknown'} {cancellation.booking.customer.lastName || ''}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Reason:</span>
          <span className="text-gray-700 max-w-[180px] truncate text-right">
            {cancellation.reason || 'No reason provided'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Refund %:</span>
          <span className={`font-medium ${
            cancellation.refundPercentage === 100 
              ? 'text-[#006B3F]'
              : cancellation.refundPercentage >= 50
              ? 'text-[#B8960F]'
              : 'text-gray-600'
          }`}>
            {cancellation.refundPercentage}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Refund Amount:</span>
          <span className="font-medium text-[#006B3F]">
            {cancellation.refundAmount ? formatCurrency(cancellation.refundAmount) : '—'}
          </span>
        </div>
        <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
          <span className="text-gray-500">Created:</span>
          <span className="text-gray-700">{formatDate(cancellation.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

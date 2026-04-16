import { useState, useMemo } from 'react';
import { Loader2, Wallet, TrendingUp, RotateCcw, ChevronLeft, ChevronRight, Search, AlertCircle } from 'lucide-react';
import { useEscrow } from '../hooks';
import { formatCurrency, formatDate } from '../lib/utils';
import type { EscrowAccount } from '../api/admin';

export function Escrow() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data: escrowData, isLoading, error } = useEscrow(page, 20);

  const escrowAccounts = escrowData?.data || [];
  const pagination = escrowData?.pagination;

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!escrowAccounts || escrowAccounts.length === 0) {
      return { totalHeld: 0, totalReleased: 0, totalRefunded: 0, totalPlatformFees: 0, totalProviderAmount: 0 };
    }
    
    return escrowAccounts.reduce((acc, escrow) => {
      const amount = typeof escrow.amountHeld === 'string' ? parseFloat(escrow.amountHeld) : (escrow.amountHeld || 0);
      const platformFee = typeof escrow.platformFee === 'string' ? parseFloat(escrow.platformFee) : (escrow.platformFee || 0);
      const providerAmount = typeof escrow.providerAmount === 'string' ? parseFloat(escrow.providerAmount) : (escrow.providerAmount || 0);
      const status = escrow.status?.toUpperCase();
      
      if (status === 'HELD') acc.totalHeld += amount;
      else if (status === 'RELEASED') acc.totalReleased += amount;
      else if (status === 'REFUNDED') acc.totalRefunded += amount;
      acc.totalPlatformFees += platformFee;
      acc.totalProviderAmount += providerAmount;
      return acc;
    }, { totalHeld: 0, totalReleased: 0, totalRefunded: 0, totalPlatformFees: 0, totalProviderAmount: 0 });
  }, [escrowAccounts]);

  // Filter escrow accounts
  const filteredEscrow = escrowAccounts.filter((escrow) => {
    const matchesStatus = !statusFilter || escrow.status?.toUpperCase() === statusFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      escrow.booking?.salon?.businessName?.toLowerCase().includes(searchLower) ||
      `${escrow.booking?.customer?.firstName || ''} ${escrow.booking?.customer?.lastName || ''}`.toLowerCase().includes(searchLower) ||
      escrow.id.toLowerCase().includes(searchLower);
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const upperStatus = status?.toUpperCase() || 'HELD';
    const styles: Record<string, { bg: string; text: string; dot: string }> = {
      HELD: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
      RELEASED: { bg: 'bg-[#006B3F]/10', text: 'text-[#006B3F]', dot: 'bg-[#006B3F]' },
      REFUNDED: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
    };
    const style = styles[upperStatus] || styles.HELD;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
        {upperStatus.charAt(0) + upperStatus.slice(1).toLowerCase()}
      </span>
    );
  };

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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <AlertCircle size={48} className="text-[#CE1126]" />
        <p className="text-lg font-medium text-gray-600">Failed to load escrow data</p>
        <p className="text-sm text-gray-500">Please try again later</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Escrow Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor payment escrow accounts and fund distribution</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-xl">
                <Wallet size={24} />
              </div>
              <span className="text-sm font-medium text-white/80">Total Held</span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(summaryStats.totalHeld)}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#006B3F] to-[#006B3F]/80 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-xl">
                <TrendingUp size={24} />
              </div>
              <span className="text-sm font-medium text-white/80">Total Released</span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(summaryStats.totalReleased)}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-xl">
                <RotateCcw size={24} />
              </div>
              <span className="text-sm font-medium text-white/80">Total Refunded</span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(summaryStats.totalRefunded)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
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
            { value: 'HELD', label: 'Held' },
            { value: 'RELEASED', label: 'Released' },
            { value: 'REFUNDED', label: 'Refunded' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                statusFilter === option.value
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
        {filteredEscrow.map((escrow) => (
          <EscrowCard key={escrow.id} escrow={escrow} getStatusBadge={getStatusBadge} />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Booking ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Salon</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Customer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Platform Fee</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Provider Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEscrow.map((escrow) => (
                <tr key={escrow.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-medium text-gray-800">{escrow.booking?.id?.slice(0, 8) || 'Unknown'}...</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-800">{escrow.booking?.salon?.businessName || 'Unknown Salon'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {escrow.booking?.customer?.firstName || 'Unknown'} {escrow.booking?.customer?.lastName || ''}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-[#006B3F]">{formatCurrency(escrow.amountHeld)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{formatCurrency(escrow.platformFee)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{formatCurrency(escrow.providerAmount)}</span>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(escrow.status)}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{formatDate(escrow.createdAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
          <p className="text-sm text-gray-600">
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, pagination.total)} of {pagination.total} records
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium text-gray-700">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile Card Component
function EscrowCard({ escrow, getStatusBadge }: { escrow: EscrowAccount; getStatusBadge: (status: string) => JSX.Element }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#006B3F]/10 to-[#FCD116]/10 rounded-xl flex items-center justify-center">
            <Wallet size={20} className="text-[#006B3F]" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">{escrow.booking?.salon?.businessName || 'Unknown Salon'}</p>
            <p className="text-xs text-gray-500">Booking: {escrow.booking?.id?.slice(0, 8) || 'Unknown'}...</p>
          </div>
        </div>
        {getStatusBadge(escrow.status)}
      </div>
      <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-3">
        <div className="flex justify-between">
          <span className="text-gray-500">Customer:</span>
          <span className="font-medium text-gray-800">{escrow.booking?.customer?.firstName || 'Unknown'} {escrow.booking?.customer?.lastName || ''}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Amount:</span>
          <span className="font-bold text-[#006B3F]">{formatCurrency(escrow.amountHeld)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Platform Fee:</span>
          <span className="text-gray-700">{formatCurrency(escrow.platformFee)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Provider Amount:</span>
          <span className="text-gray-700">{formatCurrency(escrow.providerAmount)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
          <span className="text-gray-500">Created:</span>
          <span className="text-gray-700">{formatDate(escrow.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

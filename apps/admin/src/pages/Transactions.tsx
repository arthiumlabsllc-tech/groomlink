import { useState } from 'react';
import { Search, RefreshCcw, Eye, Loader2, CreditCard, TrendingUp, X, User, MapPin, Calendar, Clock, Phone } from 'lucide-react';
import { useTransactions, useRefundTransaction, useTransactionStats, useTransaction } from '../hooks';
import { formatCurrency, formatDate } from '../lib/utils';

export function Transactions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  const { data: transactionsData, isLoading } = useTransactions(page, 20, statusFilter || undefined);
  const { data: stats } = useTransactionStats('30d');
  const refundTransaction = useRefundTransaction();
  const { data: transactionDetails, isLoading: detailsLoading } = useTransaction(selectedTransactionId || '');

  const transactions = transactionsData?.data || [];
  const totalRevenue = stats?.totalRevenue || 0;

  const filteredTransactions = transactions.filter((txn) => {
    const searchLower = searchTerm.toLowerCase();
    const firstName = txn.user.firstName;
    const lastName = txn.user.lastName;
    return (
      (firstName ? firstName.toLowerCase().includes(searchLower) : false) ||
      (lastName ? lastName.toLowerCase().includes(searchLower) : false) ||
      (txn.booking?.salon.businessName.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const handleRefund = async (id: string) => {
    if (confirm('Are you sure you want to refund this transaction?')) {
      await refundTransaction.mutateAsync({ id, reason: 'Customer request' });
    }
  };

  const openDetailModal = (id: string) => {
    setSelectedTransactionId(id);
    setShowDetailModal(true);
  };

  const getProviderName = (provider: string) => {
    const names: Record<string, string> = {
      'MTN_MOMO': 'MTN MoMo',
      'VODAFONE_CASH': 'Vodafone Cash',
      'AIRTEL_TIGO': 'AirtelTigo',
    };
    return names[provider] || provider;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; dot: string }> = {
      COMPLETED: { bg: 'bg-[#006B3F]/10', text: 'text-[#006B3F]', dot: 'bg-[#006B3F]' },
      PENDING: { bg: 'bg-[#FCD116]/20', text: 'text-[#B8960F]', dot: 'bg-[#FCD116]' },
      FAILED: { bg: 'bg-[#CE1126]/10', text: 'text-[#CE1126]', dot: 'bg-[#CE1126]' },
      REFUNDED: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
    };
    const style = styles[status] || styles.PENDING;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
        {status.toLowerCase()}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Transaction Monitoring</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage payment transactions</p>
        </div>
      </div>

      {/* Revenue Highlight Card */}
      <div className="bg-gradient-to-br from-[#006B3F] to-[#006B3F]/80 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#FCD116]/20 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <TrendingUp size={24} className="text-[#FCD116]" />
            </div>
            <span className="text-sm font-medium text-white/80">Total Revenue (Last 30 Days)</span>
          </div>
          <p className="text-4xl font-bold">{formatCurrency(totalRevenue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-sm bg-white border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {[
            { value: '', label: 'All' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'FAILED', label: 'Failed' },
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
        {filteredTransactions.map((txn) => (
          <div key={txn.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#006B3F]/10 to-[#FCD116]/10 rounded-xl flex items-center justify-center">
                  <CreditCard size={20} className="text-[#006B3F]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{txn.id.slice(0, 8)}...</p>
                  <p className="text-xs text-gray-500">{formatDate(txn.createdAt)}</p>
                </div>
              </div>
              {getStatusBadge(txn.status)}
            </div>
            <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between">
                <span className="text-gray-500">User:</span>
                <span className="font-medium text-gray-800">{txn.user.firstName || 'Unknown'} {txn.user.lastName || ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Salon:</span>
                <span className="font-medium text-gray-800">{txn.booking?.salon.businessName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Method:</span>
                <span className="text-gray-700">{getProviderName(txn.provider)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
                <span className="text-gray-500">Amount:</span>
                <span className="text-lg font-bold text-[#006B3F]">{formatCurrency(txn.amount, txn.currency)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
              <button 
                onClick={() => openDetailModal(txn.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors font-medium text-sm"
              >
                <Eye size={16} />
                View
              </button>
              {txn.status === 'COMPLETED' && (
                <button 
                  onClick={() => handleRefund(txn.id)}
                  disabled={refundTransaction.isPending}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#FCD116] text-[#1a1a2e] rounded-xl hover:bg-[#e6c014] disabled:opacity-50 transition-colors font-medium text-sm"
                >
                  <RefreshCcw size={16} />
                  Refund
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Transaction ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Salon</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Method</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-medium text-gray-800">{txn.id.slice(0, 8)}...</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-800">{txn.user.firstName || 'Unknown'} {txn.user.lastName || ''}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{txn.booking?.salon.businessName || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-[#006B3F]">{formatCurrency(txn.amount, txn.currency)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{getProviderName(txn.provider)}</span>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(txn.status)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => openDetailModal(txn.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                      {txn.status === 'COMPLETED' && (
                        <button 
                          onClick={() => handleRefund(txn.id)}
                          disabled={refundTransaction.isPending}
                          className="p-2 bg-[#FCD116] text-[#1a1a2e] rounded-lg hover:bg-[#e6c014] disabled:opacity-50 transition-colors" 
                          title="Refund"
                        >
                          <RefreshCcw size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {showDetailModal && selectedTransactionId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Transaction Details</h2>
              <button 
                onClick={() => { setShowDetailModal(false); setSelectedTransactionId(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {detailsLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-[#006B3F]" size={32} />
              </div>
            ) : transactionDetails ? (
              <div className="p-6 space-y-6">
                {/* Transaction Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#006B3F]/10 to-[#FCD116]/10 rounded-xl flex items-center justify-center">
                      <CreditCard size={28} className="text-[#006B3F]" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-800">{formatCurrency(transactionDetails.amount, transactionDetails.currency)}</p>
                      <p className="text-sm text-gray-500 font-mono">{transactionDetails.id}</p>
                    </div>
                  </div>
                  {getStatusBadge(transactionDetails.status)}
                </div>

                {/* Transaction Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Payment Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <CreditCard size={18} className="text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Provider</p>
                          <p className="text-gray-800 font-medium">{getProviderName(transactionDetails.provider)}</p>
                        </div>
                      </div>
                      {transactionDetails.providerTransactionId && (
                        <div className="flex items-center gap-3">
                          <div className="w-[18px] flex justify-center">
                            <span className="text-gray-400 text-xs">#</span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Provider Reference</p>
                            <p className="text-gray-800 font-mono text-sm">{transactionDetails.providerTransactionId}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Created</p>
                          <p className="text-gray-800">{formatDate(transactionDetails.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock size={18} className="text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Last Updated</p>
                          <p className="text-gray-800">{formatDate(transactionDetails.updatedAt)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Customer Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <User size={18} className="text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Name</p>
                          <p className="text-gray-800 font-medium">
                            {transactionDetails.user.firstName || 'Unknown'} {transactionDetails.user.lastName || ''}
                          </p>
                        </div>
                      </div>
                      {transactionDetails.user.phoneNumber && (
                        <div className="flex items-center gap-3">
                          <Phone size={18} className="text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Phone</p>
                            <p className="text-gray-800">{transactionDetails.user.phoneNumber}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                {transactionDetails.booking && (
                  <div className="border-t border-gray-100 pt-6">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Booking Details</h4>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <MapPin size={18} className="text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Salon</p>
                          <p className="text-gray-800 font-medium">{transactionDetails.booking.salon.businessName}</p>
                        </div>
                      </div>
                      {transactionDetails.booking.service && (
                        <div className="flex items-center gap-3">
                          <CreditCard size={18} className="text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Service</p>
                            <p className="text-gray-800">{transactionDetails.booking.service.name}</p>
                          </div>
                        </div>
                      )}
                      {(transactionDetails.booking as any).scheduledDate && (
                        <div className="flex items-center gap-3">
                          <Calendar size={18} className="text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Scheduled Date</p>
                            <p className="text-gray-800">{(transactionDetails.booking as any).scheduledDate}</p>
                          </div>
                        </div>
                      )}
                      {(transactionDetails.booking as any).scheduledTime && (
                        <div className="flex items-center gap-3">
                          <Clock size={18} className="text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Scheduled Time</p>
                            <p className="text-gray-800">{(transactionDetails.booking as any).scheduledTime}</p>
                          </div>
                        </div>
                      )}
                      {(transactionDetails.booking as any).worker && (
                        <div className="flex items-center gap-3">
                          <User size={18} className="text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Worker</p>
                            <p className="text-gray-800">{(transactionDetails.booking as any).worker.name || 'Assigned'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => { setShowDetailModal(false); setSelectedTransactionId(null); }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  {transactionDetails.status === 'COMPLETED' && (
                    <button 
                      onClick={() => {
                        setShowDetailModal(false);
                        handleRefund(transactionDetails.id);
                      }}
                      disabled={refundTransaction.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-[#FCD116] text-[#1a1a2e] rounded-lg hover:bg-[#e6c014] disabled:opacity-50 transition-colors font-medium"
                    >
                      <RefreshCcw size={18} />
                      Refund
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">Unable to load transaction details</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

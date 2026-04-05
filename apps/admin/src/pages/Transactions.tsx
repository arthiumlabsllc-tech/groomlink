import { useState } from 'react';
import { Search, RefreshCcw, Eye, Loader2 } from 'lucide-react';
import { useTransactions, useRefundTransaction, useTransactionStats } from '../hooks';
import { formatCurrency, formatDate, getStatusColor } from '../lib/utils';

export function Transactions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: transactionsData, isLoading } = useTransactions(page, 20, statusFilter || undefined);
  const { data: stats } = useTransactionStats('30d');
  const refundTransaction = useRefundTransaction();

  const transactions = transactionsData?.data || [];
  const totalRevenue = stats?.totalRevenue || 0;

  const filteredTransactions = transactions.filter((txn) =>
    txn.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    txn.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    txn.booking?.salon.businessName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefund = async (id: string) => {
    if (confirm('Are you sure you want to refund this transaction?')) {
      await refundTransaction.mutateAsync({ id, reason: 'Customer request' });
    }
  };

  const getProviderName = (provider: string) => {
    const names: Record<string, string> = {
      'MTN_MOMO': 'MTN MoMo',
      'VODAFONE_CASH': 'Vodafone Cash',
      'AIRTEL_TIGO': 'AirtelTigo',
    };
    return names[provider] || provider;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-[#CE1126]" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Transaction Monitoring</h1>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg shadow-sm">
            <span className="text-sm text-green-600">Total Revenue (30d):</span>
            <span className="text-lg font-semibold text-green-600">{formatCurrency(totalRevenue)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 bg-white p-4 rounded-xl shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE1126] focus:border-transparent"
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Status</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Transaction ID</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">User</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Salon</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Amount</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Method</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Status</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTransactions.map((txn) => (
              <tr key={txn.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-800">{txn.id.slice(0, 8)}...</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {txn.user.firstName} {txn.user.lastName}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {txn.booking?.salon.businessName || '-'}
                </td>
                <td className="px-6 py-4 font-medium text-gray-800">
                  {formatCurrency(txn.amount, txn.currency)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {getProviderName(txn.provider)}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-sm capitalize ${getStatusColor(txn.status)}`}>
                    {txn.status.toLowerCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Eye size={18} />
                    </button>
                    {txn.status === 'COMPLETED' && (
                      <button 
                        onClick={() => handleRefund(txn.id)}
                        disabled={refundTransaction.isPending}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg disabled:opacity-50" 
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
  );
}

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Layout from '../components/Layout'
import Icon from '../components/Icon'
import { api, PayoutBalance, PayoutHistoryResponse } from '../lib/api'
import { useSalon } from '../store/SalonContext'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(amount: number): string {
  return `GH₵${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="card-v2 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon name={icon} className="text-white text-lg" />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}

function RequestPayoutModal({ balance, salonId, onClose }: { balance: number; salonId: string; onClose: () => void }) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const queryClient = useQueryClient()

  const numericAmount = parseFloat(amount) || 0
  const isValid = numericAmount > 0 && numericAmount <= balance

  const handleRequest = async () => {
    if (!isValid) return
    setLoading(true)
    setError('')
    try {
      const response = await api.requestPayout(salonId, numericAmount)
      setSuccess(response.data?.message || `GH₵${numericAmount.toFixed(2)} sent to your MoMo!`)
      queryClient.invalidateQueries({ queryKey: ['payoutBalance', salonId] })
      queryClient.invalidateQueries({ queryKey: ['payoutHistory', salonId] })
    } catch (err: any) {
      setError(err.message || 'Payout failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Request Payout</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <Icon name="check_circle" className="text-green-600 text-3xl" />
            </div>
            <p className="text-green-700 dark:text-green-400 font-medium mb-4">{success}</p>
            <button
              onClick={onClose}
              className="btn-primary w-full"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400">Available Balance</p>
              <p className="text-2xl font-bold text-green-800 dark:text-green-300">{formatCurrency(balance)}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount (GH₵)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="input-v2 w-full text-lg"
              />
              <div className="flex gap-2 mt-2">
                {[25, 50, 100, 200].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v.toString())}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    GH₵{v}
                  </button>
                ))}
                <button
                  onClick={() => setAmount(balance.toFixed(2))}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  Max
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-2">
              <Icon name="info" className="text-blue-500 text-sm mt-0.5" />
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Payouts are sent instantly to your Mobile Money wallet.
              </p>
            </div>

            <button
              onClick={handleRequest}
              disabled={!isValid || loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : `Send ${numericAmount > 0 ? formatCurrency(numericAmount) : 'GH₵0.00'}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function Earnings() {
  const { salon } = useSalon()
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const salonId = salon?.id || ''

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['payoutBalance', salonId],
    queryFn: () => api.getPayoutBalance(salonId),
    enabled: !!salonId,
    select: (res) => res.data,
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['payoutHistory', salonId, currentPage],
    queryFn: () => api.getPayoutHistory(salonId, currentPage),
    enabled: !!salonId,
    select: (res) => res.data,
  })

  const balance: PayoutBalance | undefined = balanceData
  const history: PayoutHistoryResponse | undefined = historyData
  const payouts = history?.payouts || []
  const pagination = history?.pagination
  const summary = history?.summary
  const thisMonth = history?.thisMonth

  return (
    <Layout activeTab="earnings">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Earnings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track your payouts and earnings</p>
          </div>
          {balance && balance.availableBalance > 0 && (
            <button
              onClick={() => setShowPayoutModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Icon name="account_balance_wallet" className="text-lg" />
              Request Payout
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon="account_balance_wallet"
            label="Available Balance"
            value={balanceLoading ? '...' : formatCurrency(balance?.availableBalance || 0)}
            color="bg-green-600"
          />
          <StatCard
            icon="trending_up"
            label="Total Earned"
            value={historyLoading ? '...' : formatCurrency(summary?.totalPaidOut || 0)}
            color="bg-blue-600"
          />
          <StatCard
            icon="event"
            label="This Month"
            value={historyLoading ? '...' : formatCurrency(thisMonth?.earned || 0)}
            color="bg-purple-600"
          />
          <StatCard
            icon="receipt_long"
            label="Commission Paid"
            value={historyLoading ? '...' : formatCurrency(summary?.totalCommission || 0)}
            color="bg-orange-600"
          />
        </div>

        {/* Payout History Table */}
        <div className="card-v2 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payout History</h2>
          </div>

          {historyLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading payout history...</p>
            </div>
          ) : payouts.length === 0 ? (
            <div className="p-12 text-center">
              <Icon name="account_balance_wallet" className="text-4xl text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No payouts yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Complete bookings to start earning
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Service</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                      <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {payouts.map((payout) => (
                      <tr key={payout.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {payout.date ? formatDate(payout.date) : 'N/A'}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-900 dark:text-white font-medium">
                          {payout.serviceName}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                          {payout.customerName}
                        </td>
                        <td className="px-5 py-4 text-sm text-right font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(payout.netReceived)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Sent
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={currentPage === pagination.totalPages}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Payout Modal */}
      {showPayoutModal && balance && (
        <RequestPayoutModal
          balance={balance.availableBalance}
          salonId={salonId}
          onClose={() => setShowPayoutModal(false)}
        />
      )}
    </Layout>
  )
}

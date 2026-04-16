import { useState, useEffect, useCallback } from 'react'
import { 
  Users, Clock, CheckCircle, SkipForward, Play, Volume2,
  RefreshCw, AlertCircle, Store, ArrowRightCircle
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { api, QueueEntry, QueueStatus } from '../lib/api'
import { useSalon } from '../store/SalonContext'

export default function Queue() {
  const { salonId, loading: salonLoading, hasSalon } = useSalon()
  const [queueData, setQueueData] = useState<QueueStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchQueue = useCallback(async () => {
    if (!salonId) return
    try {
      setError(null)
      const response = await api.getQueue(salonId)
      if (response.success) {
        setQueueData(response.data)
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error('Failed to fetch queue:', err)
      setError('Failed to load queue data')
    } finally {
      setLoading(false)
    }
  }, [salonId])

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchQueue()
    }, 15000)
    return () => clearInterval(interval)
  }, [fetchQueue])

  const handleAction = async (action: string, queueId: string) => {
    // For 'call' action, use salonId since callNext expects it; others use queueId
    const actionId = action === 'call' ? (salonId || '') : queueId
    setActionLoading(`${action}-${actionId}`)
    try {
      let response
      switch (action) {
        case 'call':
          response = await api.callNext(salonId!)
          break
        case 'start':
          response = await api.startService(queueId)
          break
        case 'complete':
          response = await api.completeService(queueId)
          break
        case 'skip':
          response = await api.skipCustomer(queueId)
          break
      }
      if (response?.success) {
        await fetchQueue()
      }
    } catch (err) {
      console.error(`Failed to ${action}:`, err)
      setError(`Failed to ${action} customer`)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'CALLED': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'IN_SERVICE': return 'bg-green-100 text-green-700 border-green-200'
      case 'COMPLETED': return 'bg-gray-100 text-gray-600 border-gray-200'
      case 'SKIPPED': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'WAITING': return 'Waiting'
      case 'CALLED': return 'Called'
      case 'IN_SERVICE': return 'In Service'
      case 'COMPLETED': return 'Completed'
      case 'SKIPPED': return 'Skipped'
      default: return status
    }
  }

  const formatWaitTime = (joinedAt: string) => {
    const joined = new Date(joinedAt)
    const now = new Date()
    const diffMs = now.getTime() - joined.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins === 1) return '1 min'
    return `${diffMins} mins`
  }

  const formatEstimatedWait = (minutes: number) => {
    if (minutes < 1) return '< 1 min'
    if (minutes === 1) return '1 min'
    return `${minutes} mins`
  }

  const waitingEntries = queueData?.entries.filter(e => e.status === 'WAITING') || []
  const calledEntries = queueData?.entries.filter(e => e.status === 'CALLED') || []
  const inServiceEntries = queueData?.entries.filter(e => e.status === 'IN_SERVICE') || []

  return (
    <Layout activeTab="queue">
      {(salonLoading || loading) ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-ghana-green border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading queue...</p>
        </div>
      ) : hasSalon === false ? (
        <div className="card text-center py-12">
          <div className="w-20 h-20 bg-ghana-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-10 h-10 text-ghana-gold" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Set up your salon first</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            You need to create your salon profile before you can manage your queue.
          </p>
          <Link 
            to="/settings" 
            className="btn-primary inline-flex items-center gap-2"
          >
            Create Salon Profile
            <ArrowRightCircle className="w-5 h-5" />
          </Link>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">Live Queue</h1>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-200">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-medium text-green-700">Live</span>
              </div>
            </div>
            <p className="text-gray-500">
              Manage your customers in real-time. Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
              <button 
                onClick={fetchQueue}
                className="ml-auto text-sm font-medium hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div className="stat-card border-l-4 border-l-amber-500 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-amber-100">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{queueData?.totalWaiting || 0}</div>
              <div className="text-xs sm:text-sm text-gray-500">Total Waiting</div>
            </div>

            <div className="stat-card border-l-4 border-l-blue-500 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-blue-100">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                {queueData?.averageWait ? `${Math.round(queueData.averageWait)} min` : '0 min'}
              </div>
              <div className="text-xs sm:text-sm text-gray-500">Average Wait</div>
            </div>

            <div className="stat-card border-l-4 border-l-green-500 p-4 sm:p-6 col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-green-100">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{inServiceEntries.length}</div>
              <div className="text-xs sm:text-sm text-gray-500">Currently Serving</div>
            </div>
          </div>

          {/* Refresh Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={fetchQueue}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Queue Content */}
          {queueData?.entries.length === 0 ? (
            <div className="card text-center py-16">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No customers in queue</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Your queue is currently empty. Customers will appear here when they join the queue.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Currently In Service */}
              {inServiceEntries.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Currently Serving
                  </h3>
                  <div className="space-y-3">
                    {inServiceEntries.map((entry) => (
                      <QueueCard
                        key={entry.id}
                        entry={entry}
                        actionLoading={actionLoading}
                        onAction={handleAction}
                        getStatusColor={getStatusColor}
                        getStatusLabel={getStatusLabel}
                        formatWaitTime={formatWaitTime}
                        formatEstimatedWait={formatEstimatedWait}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Called Customers */}
              {calledEntries.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Called
                  </h3>
                  <div className="space-y-3">
                    {calledEntries.map((entry) => (
                      <QueueCard
                        key={entry.id}
                        entry={entry}
                        actionLoading={actionLoading}
                        onAction={handleAction}
                        getStatusColor={getStatusColor}
                        getStatusLabel={getStatusLabel}
                        formatWaitTime={formatWaitTime}
                        formatEstimatedWait={formatEstimatedWait}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Waiting Customers */}
              {waitingEntries.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Waiting ({waitingEntries.length})
                  </h3>
                  <div className="space-y-3">
                    {waitingEntries.map((entry) => (
                      <QueueCard
                        key={entry.id}
                        entry={entry}
                        actionLoading={actionLoading}
                        onAction={handleAction}
                        getStatusColor={getStatusColor}
                        getStatusLabel={getStatusLabel}
                        formatWaitTime={formatWaitTime}
                        formatEstimatedWait={formatEstimatedWait}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Layout>
  )
}

interface QueueCardProps {
  entry: QueueEntry
  actionLoading: string | null
  onAction: (action: string, queueId: string) => void
  getStatusColor: (status: string) => string
  getStatusLabel: (status: string) => string
  formatWaitTime: (joinedAt: string) => string
  formatEstimatedWait: (minutes: number) => string
}

function QueueCard({ 
  entry, 
  actionLoading, 
  onAction, 
  getStatusColor, 
  getStatusLabel,
  formatWaitTime,
  formatEstimatedWait
}: QueueCardProps) {
  const isLoading = (action: string) => actionLoading === `${action}-${entry.id}`
  // For 'call' action, check if actionLoading starts with 'call-' since it uses salonId
  const isLoadingCall = actionLoading?.startsWith('call-') ?? false

  return (
    <div className="card hover:shadow-lg transition-shadow p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Top row: Position & Customer Info */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-ghana-green/10 rounded-full flex items-center justify-center text-base sm:text-lg font-bold text-ghana-green flex-shrink-0">
            #{entry.position}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 truncate">
              {entry.customer.firstName} {entry.customer.lastName}
            </div>
            <div className="text-sm text-gray-500 truncate">
              {entry.service?.name || 'General Service'}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Waiting for {formatWaitTime(entry.joinedAt)}
            </div>
          </div>
        </div>

        {/* Second row: Status & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          {/* Status & Wait Time */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(entry.status)}`}>
              {getStatusLabel(entry.status)}
            </span>
            {entry.status === 'WAITING' && (
              <span className="text-xs text-gray-500">
                Est. wait: {formatEstimatedWait(entry.estimatedWait)}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {entry.status === 'WAITING' && (
              <button
                onClick={() => onAction('call', entry.id)}
                disabled={!!actionLoading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
              >
                {isLoadingCall ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
                <span>Call Next</span>
              </button>
            )}

            {entry.status === 'CALLED' && (
              <>
                <button
                  onClick={() => onAction('start', entry.id)}
                  disabled={!!actionLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                >
                  {isLoading('start') ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  <span>Start</span>
                </button>
                <button
                  onClick={() => onAction('skip', entry.id)}
                  disabled={!!actionLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                >
                  {isLoading('skip') ? (
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <SkipForward className="w-4 h-4" />
                  )}
                  <span>Skip</span>
                </button>
              </>
            )}

            {entry.status === 'IN_SERVICE' && (
              <button
                onClick={() => onAction('complete', entry.id)}
                disabled={!!actionLoading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-ghana-green text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
              >
                {isLoading('complete') ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>Complete</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

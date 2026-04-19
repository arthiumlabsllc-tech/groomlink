import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'
import { useSubscription, cancelSubscription } from '../hooks/useSubscription'

const planColors: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  pro: 'bg-ghana-green/10 text-ghana-green',
  premium: 'bg-ghana-gold/20 text-amber-700',
}

const planBorders: Record<string, string> = {
  free: 'border-gray-200',
  pro: 'border-ghana-green/30',
  premium: 'border-ghana-gold/40',
}

export default function SubscriptionStatus() {
  const { subscription, loading, refetch } = useSubscription()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="card-v2 p-5 animate-pulse">
        <div className="h-5 w-32 skeleton-shimmer rounded mb-3" />
        <div className="h-4 w-24 skeleton-shimmer rounded mb-2" />
        <div className="h-4 w-20 skeleton-shimmer rounded" />
      </div>
    )
  }

  const planSlug = subscription?.plan?.slug || 'free'
  const planName = subscription?.plan?.name || 'Free'
  const expiresAt = subscription?.expires_at
  const isPaid = planSlug !== 'free'
  const cancelAtPeriodEnd = subscription?.cancel_at_period_end

  const usageStats = subscription?.usage_stats || {}
  const staffLimit = subscription?.plan?.maxStaff || 1
  const locationLimit = subscription?.plan?.maxLocations || 1

  const handleCancel = async () => {
    try {
      setCancelling(true)
      setCancelError(null)
      await cancelSubscription(false) // Cancel at period end
      setShowCancelDialog(false)
      refetch()
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel subscription')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <div className={`card-v2 p-5 border ${planBorders[planSlug]}`}>
        {/* Plan badge */}
        <div className="flex items-center justify-between mb-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${planColors[planSlug]}`}>
            {planSlug === 'premium' && <Icon name="workspace_premium" size={14} filled />}
            {planSlug === 'pro' && <Icon name="verified" size={14} filled />}
            {planName} Plan
          </span>
          {cancelAtPeriodEnd && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-medium">
              Cancels at period end
            </span>
          )}
        </div>

        {/* Expiry date */}
        {expiresAt && isPaid && (
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
            <Icon name="event" size={16} className="text-gray-400" />
            <span>
              {cancelAtPeriodEnd ? 'Access until' : 'Renews on'}{' '}
              {new Date(expiresAt).toLocaleDateString('en-GH', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        )}

        {/* Quick usage stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon name="group" size={14} className="text-gray-400" />
              <span className="text-xs text-gray-500">Staff</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {usageStats.staff_management?.used ?? 0} / {staffLimit === 50 ? '∞' : staffLimit}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon name="location_on" size={14} className="text-gray-400" />
              <span className="text-xs text-gray-500">Locations</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {usageStats.multi_location?.used ?? 1} / {locationLimit === 10 ? '∞' : locationLimit}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Link
            to="/pricing"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-semibold bg-ghana-green text-white hover:bg-ghana-green/90 transition-colors"
          >
            <Icon name="upgrade" size={16} />
            {isPaid ? 'Manage' : 'Upgrade'}
          </Link>
          {isPaid && !cancelAtPeriodEnd && (
            <button
              onClick={() => setShowCancelDialog(true)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Icon name="cancel" size={16} />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Cancel confirmation dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-elevated max-w-sm w-full p-6 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Icon name="warning" size={20} className="text-red-500" filled />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Cancel Subscription?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-2">
              Your subscription will remain active until the end of your current billing period. After that, you'll be moved to the Free plan.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              You'll lose access to Pro/Premium features including advanced analytics, custom branding, and more.
            </p>
            {cancelError && (
              <p className="text-sm text-red-600 mb-4">{cancelError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelDialog(false)
                  setCancelError(null)
                }}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Keep Plan
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

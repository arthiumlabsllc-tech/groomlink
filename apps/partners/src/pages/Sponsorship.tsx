import { useState } from 'react'
import Icon from '../components/Icon'
import Layout from '../components/Layout'
import {
  useSponsorshipPackages,
  useSponsorshipStatus,
  purchaseSponsorship,
  resumeSponsorshipPayment,
  formatPackageDuration,
} from '../hooks/useSponsorship'
import type { SponsorshipPackage, SponsoredSalonOrder } from '../hooks/useSponsorship'

function timeRemaining(endTime: string): string {
  const diffMs = new Date(endTime).getTime() - Date.now()
  if (diffMs <= 0) return 'Expired'
  const hours = Math.floor(diffMs / (60 * 60 * 1000))
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} ${hours % 24}h left`
  return `${hours}h ${Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000))}m left`
}

function priorityLabel(priority: number): { label: string; className: string } {
  if (priority >= 3) return { label: 'Top Tier', className: 'bg-ghana-gold/20 text-amber-700' }
  if (priority === 2) return { label: 'Boosted', className: 'bg-ghana-green/10 text-ghana-green' }
  return { label: 'Standard', className: 'bg-gray-100 text-gray-600' }
}

function ActiveCard({ order }: { order: SponsoredSalonOrder }) {
  const badge = priorityLabel(order.priority)
  return (
    <div className="max-w-3xl mx-auto mb-10 rounded-2xl bg-ghana-green/5 border border-ghana-green/20 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-ghana-green/10 flex items-center justify-center flex-shrink-0">
          <Icon name="verified" size={26} className="text-ghana-green" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-gray-900">Your salon is sponsored</h2>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
          </div>
          <p className="text-gray-600 text-sm mb-3">
            You are boosted in search results and discovery for your customers.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-gray-700 font-medium">
              <Icon name="timer" size={16} className="text-gray-400" />
              {timeRemaining(order.endTime)}
            </span>
            <span className="flex items-center gap-1.5 text-gray-500">
              <Icon name="event" size={16} className="text-gray-400" />
              Ends {new Date(order.endTime).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PendingCard({
  order,
  onResume,
  onCheck,
  busy,
  checking,
}: {
  order: SponsoredSalonOrder
  onResume: () => void
  onCheck: () => void
  busy: boolean
  checking: boolean
}) {
  return (
    <div className="max-w-3xl mx-auto mb-10 rounded-2xl bg-amber-50 border border-amber-200 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Icon name="hourglass_top" size={26} className="text-amber-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Payment pending</h2>
          <p className="text-gray-600 text-sm mb-4">
            You started a sponsorship purchase for GHS {Number(order.amountPaid ?? 0).toFixed(2)}.
            Complete the payment to activate your boost. Unpaid orders expire after 24 hours.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onResume}
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ghana-red hover:bg-ghana-red/90 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {busy ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icon name="payments" size={18} />
              )}
              Complete payment
            </button>
            <button
              onClick={onCheck}
              disabled={checking}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-colors disabled:opacity-60"
            >
              <Icon name="refresh" size={18} />
              {checking ? 'Checking...' : "I've completed payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PackageCard({
  pkg,
  disabled,
  buying,
  onBuy,
}: {
  pkg: SponsorshipPackage
  disabled: boolean
  buying: boolean
  onBuy: (pkg: SponsorshipPackage) => void
}) {
  const badge = priorityLabel(pkg.priorityLevel)
  const isTop = pkg.priorityLevel >= 3

  return (
    <div
      className={`relative rounded-2xl shadow-lg bg-white p-6 sm:p-8 flex flex-col transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 ${
        isTop ? 'border-2 border-ghana-gold' : 'border border-gray-200'
      }`}
    >
      {isTop && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-ghana-gold text-gray-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
            Best Visibility
          </span>
        </div>
      )}

      <div className="mb-4">
        <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3 ${badge.className}`}>
          {badge.label} placement
        </span>
        <h3 className="text-2xl font-bold text-gray-900">{pkg.packageName}</h3>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-gray-900">₵{Number(pkg.priceGhs).toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
          <Icon name="timer" size={16} className="text-gray-400" />
          <span className="text-sm text-gray-600">
            Sponsored for {formatPackageDuration(pkg.durationType, pkg.durationValue)}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
          <Icon name="trending_up" size={16} className="text-gray-400" />
          <span className="text-sm text-gray-600">Priority #{pkg.priorityLevel} in search results</span>
        </div>
      </div>

      <div className="flex-1 mb-6">
        <ul className="space-y-2.5">
          {[
            'Appear above regular salons in search',
            'Highlighted in customer discovery',
            'Sponsored badge on your salon profile',
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2.5">
              <Icon name="check_circle" size={18} className="text-ghana-green flex-shrink-0" filled />
              <span className="text-sm text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => onBuy(pkg)}
        disabled={disabled || buying}
        className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-200 btn-ripple ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-ghana-red hover:bg-ghana-red/90 text-white shadow-md hover:shadow-lg'
        }`}
      >
        {buying ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Starting checkout...
          </span>
        ) : disabled ? (
          'Unavailable'
        ) : (
          'Get Sponsored'
        )}
      </button>
    </div>
  )
}

export default function Sponsorship() {
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [resuming, setResuming] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { packages, loading: packagesLoading } = useSponsorshipPackages()
  const { status, loading: statusLoading, refetch: refetchStatus } = useSponsorshipStatus()

  const active = status?.active ?? null
  const pending = status?.pending ?? null
  const hasBlocker = !!active || !!pending

  const handleBuy = async (pkg: SponsorshipPackage) => {
    try {
      setBuyingId(pkg.id)
      setError(null)
      const result = await purchaseSponsorship(pkg.id)
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      } else {
        setError(result.message || 'Failed to start checkout. Please try again.')
        refetchStatus()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to purchase sponsorship. Please try again.')
    } finally {
      setBuyingId(null)
    }
  }

  const handleResume = async () => {
    if (!pending) return
    try {
      setResuming(true)
      setError(null)
      const result = await resumeSponsorshipPayment(pending.id)
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      } else {
        setError(result.message || 'Failed to resume payment. Please try again.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resume payment. Please try again.')
    } finally {
      setResuming(false)
    }
  }

  const handleCheck = async () => {
    try {
      setChecking(true)
      await refetchStatus()
    } finally {
      setChecking(false)
    }
  }

  return (
    <Layout activeTab="sponsorship">
      <div className="page-enter">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Get Sponsored</h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Boost your salon to the top of search results and reach more customers.
          </p>
        </div>

        {/* Status cards */}
        {active && <ActiveCard order={active} />}
        {!active && pending && (
          <PendingCard
            order={pending}
            onResume={handleResume}
            onCheck={handleCheck}
            busy={resuming}
            checking={checking}
          />
        )}

        {/* Error message */}
        {error && (
          <div className="max-w-md mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <Icon name="error" size={20} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <Icon name="close" size={16} className="text-red-400" />
            </button>
          </div>
        )}

        {/* Packages */}
        {packagesLoading || statusLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl shadow-lg bg-white p-8">
                <div className="h-6 w-20 skeleton-shimmer rounded mb-4" />
                <div className="h-10 w-32 skeleton-shimmer rounded mb-2" />
                <div className="h-4 w-24 skeleton-shimmer rounded mb-6" />
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-4 skeleton-shimmer rounded" />
                  ))}
                </div>
                <div className="h-12 skeleton-shimmer rounded-xl mt-6" />
              </div>
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="max-w-md mx-auto text-center rounded-2xl bg-white shadow-lg p-10">
            <div className="w-14 h-14 mx-auto rounded-xl bg-gray-100 flex items-center justify-center mb-4">
              <Icon name="workspace_premium" size={28} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No packages available right now</h3>
            <p className="text-sm text-gray-500">
              Sponsorship packages are coming soon. Contact our team if you'd like to be notified when they launch.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                disabled={hasBlocker}
                buying={buyingId === pkg.id}
                onBuy={handleBuy}
              />
            ))}
          </div>
        )}

        {/* Footnote */}
        <div className="text-center mt-12 mb-4">
          <p className="text-gray-400 text-sm">
            Payment is processed securely via mobile money. Your sponsorship activates instantly after payment confirms.
          </p>
        </div>
      </div>
    </Layout>
  )
}

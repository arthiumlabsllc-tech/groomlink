import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import Layout from '../components/Layout'
import { usePlans, useSubscription, subscribeToPlan } from '../hooks/useSubscription'
import type { SubscriptionPlan } from '../hooks/useSubscription'

// Fallback plans in case the API doesn't return data
const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    slug: 'free',
    priceMonthlyGhs: 0,
    priceYearlyGhs: 0,
    transactionFeePercentage: 5,
    maxStaff: 1,
    maxLocations: 1,
    features: {
      instant_payouts: false,
      priority_support: false,
      advanced_analytics: false,
      custom_branding: false,
      staff_management: false,
      multi_location: false,
      loyalty_program: false,
      marketing_tools: false,
      api_access: false,
      dedicated_account_manager: false,
    },
    feature_list: [
      { name: 'Instant Payouts', included: false },
      { name: 'Priority Support', included: false },
      { name: 'Advanced Analytics', included: false },
      { name: 'Custom Branding', included: false },
      { name: 'Staff Management', included: false },
      { name: 'Multi-Location', included: false },
      { name: 'Loyalty Program', included: false },
      { name: 'Marketing Tools', included: false },
      { name: 'API Access', included: false },
      { name: 'Dedicated Account Manager', included: false },
    ],
    isActive: true,
    sortOrder: 0,
  },
  {
    id: 'pro',
    name: 'Pro',
    slug: 'pro',
    priceMonthlyGhs: 99,
    priceYearlyGhs: 1009,
    transactionFeePercentage: 3,
    maxStaff: 5,
    maxLocations: 2,
    features: {
      instant_payouts: true,
      priority_support: true,
      advanced_analytics: true,
      custom_branding: true,
      staff_management: true,
      multi_location: false,
      loyalty_program: false,
      marketing_tools: false,
      api_access: false,
      dedicated_account_manager: false,
    },
    feature_list: [
      { name: 'Instant Payouts', included: true },
      { name: 'Priority Support', included: true },
      { name: 'Advanced Analytics', included: true },
      { name: 'Custom Branding', included: true },
      { name: 'Staff Management', included: true },
      { name: 'Multi-Location', included: false },
      { name: 'Loyalty Program', included: false },
      { name: 'Marketing Tools', included: false },
      { name: 'API Access', included: false },
      { name: 'Dedicated Account Manager', included: false },
    ],
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'premium',
    name: 'Premium',
    slug: 'premium',
    priceMonthlyGhs: 299,
    priceYearlyGhs: 3049,
    transactionFeePercentage: 1.5,
    maxStaff: 50,
    maxLocations: 10,
    features: {
      instant_payouts: true,
      priority_support: true,
      advanced_analytics: true,
      custom_branding: true,
      staff_management: true,
      multi_location: true,
      loyalty_program: true,
      marketing_tools: true,
      api_access: true,
      dedicated_account_manager: true,
    },
    feature_list: [
      { name: 'Instant Payouts', included: true },
      { name: 'Priority Support', included: true },
      { name: 'Advanced Analytics', included: true },
      { name: 'Custom Branding', included: true },
      { name: 'Staff Management', included: true },
      { name: 'Multi-Location', included: true },
      { name: 'Loyalty Program', included: true },
      { name: 'Marketing Tools', included: true },
      { name: 'API Access', included: true },
      { name: 'Dedicated Account Manager', included: true },
    ],
    isActive: true,
    sortOrder: 2,
  },
]

function PlanCard({
  plan,
  isYearly,
  isCurrentPlan,
  onSubscribe,
  subscribing,
}: {
  plan: SubscriptionPlan
  isYearly: boolean
  isCurrentPlan: boolean
  onSubscribe: (planSlug: string) => void
  subscribing: boolean
}) {
  const isPro = plan.slug === 'pro'
  const isPremium = plan.slug === 'premium'

  const price = isYearly
    ? (plan.priceYearlyGhs ?? plan.priceMonthlyGhs * 12)
    : plan.priceMonthlyGhs

  const displayPrice = isYearly ? Math.round(price / 12) : price

  const planBadgeColor = plan.slug === 'free'
    ? 'bg-gray-100 text-gray-600'
    : plan.slug === 'pro'
      ? 'bg-ghana-green/10 text-ghana-green'
      : 'bg-ghana-gold/20 text-amber-700'

  const cardBorder = isPro
    ? 'border-2 border-ghana-green'
    : isPremium
      ? 'border-2 border-ghana-gold'
      : 'border border-gray-200'

  const ctaBg = isCurrentPlan
    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
    : 'bg-ghana-red hover:bg-ghana-red/90 text-white shadow-md hover:shadow-lg'

  return (
    <div
      className={`relative rounded-2xl shadow-lg bg-white p-6 sm:p-8 flex flex-col transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 ${cardBorder}`}
    >
      {/* Most Popular badge for Premium */}
      {isPremium && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-ghana-gold text-gray-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
            Most Popular
          </span>
        </div>
      )}

      {/* Pro highlight label */}
      {isPro && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-ghana-green text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
            Best Value
          </span>
        </div>
      )}

      {/* Plan name & badge */}
      <div className="mb-4">
        <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3 ${planBadgeColor}`}>
          {plan.name} Plan
        </span>
        <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-gray-900">
            ₵{displayPrice}
          </span>
          <span className="text-gray-500 text-sm">
            /mo{isYearly ? ', billed yearly' : ''}
          </span>
        </div>
        {isYearly && plan.priceYearlyGhs ? (
          <p className="text-xs text-ghana-green font-medium mt-1">
            ₵{plan.priceYearlyGhs}/year- Save 15%
          </p>
        ) : null}
      </div>

      {/* Transaction fee */}
      <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gray-50 rounded-xl">
        <Icon name="percent" size={16} className="text-gray-400" />
        <span className="text-sm text-gray-600">
          {plan.transactionFeePercentage}% transaction fee
        </span>
      </div>

      {/* Staff & Location limits */}
      <div className="flex gap-3 mb-6">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
          <Icon name="group" size={14} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-600">
            {plan.maxStaff === 50 ? 'Unlimited' : `Up to ${plan.maxStaff}`} staff
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
          <Icon name="location_on" size={14} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-600">
            {plan.maxLocations === 10 ? 'Unlimited' : `Up to ${plan.maxLocations}`} location{plan.maxLocations > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Feature list */}
      <div className="flex-1 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Features</p>
        <ul className="space-y-2.5">
          {plan.feature_list.map((feature) => (
            <li key={feature.name} className="flex items-center gap-2.5">
              {feature.included ? (
                <Icon name="check_circle" size={18} className="text-ghana-green flex-shrink-0" filled />
              ) : (
                <Icon name="cancel" size={18} className="text-gray-300 flex-shrink-0" />
              )}
              <span className={`text-sm ${feature.included ? 'text-gray-700' : 'text-gray-400'}`}>
                {feature.name}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA button */}
      <button
        onClick={() => !isCurrentPlan && onSubscribe(plan.slug)}
        disabled={isCurrentPlan || subscribing}
        className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-200 btn-ripple ${ctaBg}`}
      >
        {isCurrentPlan ? (
          <span className="flex items-center justify-center gap-2">
            <Icon name="check" size={18} />
            Current Plan
          </span>
        ) : subscribing ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </span>
        ) : (
          'Upgrade'
        )}
      </button>
    </div>
  )
}

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false)
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const { plans: apiPlans, loading: plansLoading } = usePlans()
  const { subscription, loading: subLoading } = useSubscription()

  const plans = apiPlans.length > 0 ? apiPlans : FALLBACK_PLANS
  const currentPlanSlug = subscription?.plan?.slug || 'free'

  const handleSubscribe = async (planSlug: string) => {
    if (planSlug === currentPlanSlug) return

    try {
      setSubscribingPlan(planSlug)
      setError(null)

      const result = await subscribeToPlan(planSlug, isYearly ? 'YEARLY' : 'MONTHLY')

      if (result.checkoutUrl) {
        // Redirect to Hubtel payment page
        window.location.href = result.checkoutUrl
      } else {
        // Free plan or no checkout needed- refresh status
        navigate('/pricing')
        window.location.reload()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to subscribe. Please try again.')
    } finally {
      setSubscribingPlan(null)
    }
  }

  return (
    <Layout activeTab="pricing">
      <div className="page-enter">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Choose Your Plan
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Unlock the full potential of your salon. Grow your business with the right tools.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className={`text-sm font-medium ${!isYearly ? 'text-gray-900' : 'text-gray-400'}`}>
            Monthly
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
              isYearly ? 'bg-ghana-green' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                isYearly ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${isYearly ? 'text-gray-900' : 'text-gray-400'}`}>
            Yearly
          </span>
          {isYearly && (
            <span className="bg-ghana-green/10 text-ghana-green text-xs font-bold px-3 py-1 rounded-full">
              Save 15%
            </span>
          )}
        </div>

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

        {/* Loading state */}
        {plansLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl shadow-lg bg-white p-8">
                <div className="h-6 w-20 skeleton-shimmer rounded mb-4" />
                <div className="h-10 w-32 skeleton-shimmer rounded mb-2" />
                <div className="h-4 w-24 skeleton-shimmer rounded mb-6" />
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div key={j} className="h-4 skeleton-shimmer rounded" />
                  ))}
                </div>
                <div className="h-12 skeleton-shimmer rounded-xl mt-6" />
              </div>
            ))}
          </div>
        ) : (
          /* Plan cards */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isYearly={isYearly}
                isCurrentPlan={plan.slug === currentPlanSlug}
                onSubscribe={handleSubscribe}
                subscribing={subscribingPlan === plan.slug}
              />
            ))}
          </div>
        )}

        {/* FAQ or support link */}
        <div className="text-center mt-12 mb-4">
          <p className="text-gray-400 text-sm">
            Need help choosing?{' '}
            <a href="#" className="text-ghana-green hover:underline font-medium">
              Contact our team
            </a>
          </p>
        </div>
      </div>
    </Layout>
  )
}

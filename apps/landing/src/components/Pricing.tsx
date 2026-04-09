import { useState } from 'react'
import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'

const customerPlans = [
  {
    name: 'Free',
    price: 'Free',
    period: '',
    description: 'Book appointments and discover salons',
    features: [
      'Unlimited salon discovery',
      'Instant booking',
      'Mobile Money payments',
      'Push notifications',
      'Review & rate salons',
      'Booking history',
    ],
    cta: 'Get Started',
    ctaLink: '/register',
    highlighted: false,
  },
  {
    name: 'Premium',
    price: 'GH₵ 25',
    period: '/month',
    description: 'Exclusive perks for frequent users',
    features: [
      'Everything in Free',
      'Priority booking',
      'Exclusive discounts',
      'Loyalty rewards points',
      'Early access to new salons',
      'Dedicated support',
    ],
    cta: 'Go Premium',
    ctaLink: '/register',
    highlighted: true,
  },
]

const salonPlans = [
  {
    name: 'Basic',
    price: 'GH₵ 49',
    period: '/month',
    description: 'For small salons getting started',
    features: [
      'Up to 100 bookings/month',
      'Staff management (up to 5)',
      'Service catalog',
      'Basic analytics',
      'Email support',
      '14-day free trial',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/register',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: 'GH₵ 99',
    period: '/month',
    description: 'For growing salons and barbershops',
    features: [
      'Unlimited bookings',
      'Staff management (up to 20)',
      'Advanced analytics',
      'Priority support',
      'Online payments',
      'Custom booking page',
      '14-day free trial',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/register',
    highlighted: true,
  },
]

export default function Pricing() {
  const [activeTab, setActiveTab] = useState<'customers' | 'salons'>('customers')

  const plans = activeTab === 'customers' ? customerPlans : salonPlans

  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-ghana-green font-semibold text-sm uppercase tracking-wider">Pricing</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 font-display">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
            Start for free as a customer. Salon owners can try our Professional plan free for 14 days.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-white rounded-full p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
                activeTab === 'customers'
                  ? 'bg-ghana-green text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              For Customers
            </button>
            <button
              onClick={() => setActiveTab('salons')}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
                activeTab === 'salons'
                  ? 'bg-ghana-green text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              For Salons
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-8 transition-all duration-300 ${
                plan.highlighted
                  ? 'bg-white shadow-xl border-2 border-ghana-gold scale-[1.02]'
                  : 'bg-white shadow-lg border border-gray-100'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-ghana-gold text-gray-900 text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide">
                  Recommended
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 font-display">
                  {plan.name}
                </h3>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-gray-900 font-display">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-gray-500 text-sm">{plan.period}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-ghana-green flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.ctaLink.startsWith('mailto:') ? (
                <a
                  href={plan.ctaLink}
                  className={`block w-full py-3 rounded-xl font-semibold text-center transition-all ${
                    plan.highlighted
                      ? 'bg-ghana-green text-white hover:bg-ghana-green/90 shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </a>
              ) : (
                <Link
                  to={plan.ctaLink}
                  className={`block w-full py-3 rounded-xl font-semibold text-center transition-all ${
                    plan.highlighted
                      ? 'bg-ghana-green text-white hover:bg-ghana-green/90 shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

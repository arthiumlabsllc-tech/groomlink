import { useState } from 'react'
import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'

const customerPlan = {
  name: 'Always Free',
  price: 'Free',
  description: 'Book appointments and discover salons',
  features: [
    'Unlimited salon discovery',
    'Instant booking',
    'Mobile Money payments (MTN MoMo, Vodafone Cash)',
    'SMS & push notifications',
    'Review & rate salons',
    'Loyalty rewards',
    'Booking history',
  ],
  cta: 'Get Started',
  ctaLink: '/register',
}

const salonPlans = [
  {
    name: 'Salon Pro',
    price: 'GH₵ 99',
    period: '/month',
    description: 'For growing salons and barbershops',
    features: [
      'Unlimited bookings',
      'Staff management (up to 10)',
      'Service catalog',
      'Business analytics dashboard',
      'Priority support',
      'Online payments',
      '14-day free trial',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/register',
    highlighted: true,
  },
  {
    name: 'Salon Enterprise',
    price: 'GH₵ 299',
    period: '/month',
    description: 'For multiple locations & chains',
    features: [
      'Everything in Pro',
      'Multi-location support',
      'Advanced analytics & reports',
      'API access',
      'White-label options',
      'Dedicated account manager',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    ctaLink: 'mailto:hello@groomlinkgh.com',
    highlighted: false,
  },
]

export default function Pricing() {
  const [activeTab, setActiveTab] = useState<'customers' | 'salons'>('customers')

  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-primary-500 font-semibold text-sm uppercase tracking-wider">Pricing</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 font-display">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
            Start for free as a customer. Salon owners can try our Pro plan free for 14 days.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-gray-200 rounded-full p-1">
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-6 py-2 rounded-full font-semibold text-sm transition-all ${
                activeTab === 'customers'
                  ? 'bg-ghana-gold text-ghana-black'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              For Customers
            </button>
            <button
              onClick={() => setActiveTab('salons')}
              className={`px-6 py-2 rounded-full font-semibold text-sm transition-all ${
                activeTab === 'salons'
                  ? 'bg-ghana-gold text-ghana-black'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              For Salons
            </button>
          </div>
        </div>

        {/* Customer Tab Content */}
        {activeTab === 'customers' && (
          <div className="max-w-md mx-auto">
            <div className="relative rounded-2xl p-8 bg-white shadow-lg">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {customerPlan.name}
                </h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {customerPlan.price}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  {customerPlan.description}
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {customerPlan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-primary-500" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={customerPlan.ctaLink}
                className="block w-full py-3 rounded-lg font-semibold text-center transition-colors bg-primary-500 text-white hover:bg-primary-600"
              >
                {customerPlan.cta}
              </Link>
            </div>
          </div>
        )}

        {/* Salon Tab Content */}
        {activeTab === 'salons' && (
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {salonPlans.map((plan, index) => (
              <div
                key={index}
                className={`relative rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'bg-primary-500 text-white shadow-2xl scale-105'
                    : 'bg-white shadow-lg'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-ghana-gold text-ghana-black text-sm font-semibold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className={`text-xl font-semibold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <div className="mt-4">
                    <span className={`text-4xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                      {plan.price}
                    </span>
                    <span className={plan.highlighted ? 'text-white/70' : 'text-gray-500'}>
                      {plan.period}
                    </span>
                  </div>
                  <p className={`mt-2 text-sm ${plan.highlighted ? 'text-white/70' : 'text-gray-500'}`}>
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className={`w-5 h-5 ${plan.highlighted ? 'text-ghana-gold' : 'text-primary-500'}`} />
                      <span className={plan.highlighted ? 'text-white/90' : 'text-gray-600'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {plan.ctaLink.startsWith('mailto:') ? (
                  <a
                    href={plan.ctaLink}
                    className={`block w-full py-3 rounded-lg font-semibold text-center transition-colors ${
                      plan.highlighted
                        ? 'bg-ghana-gold text-ghana-black hover:bg-yellow-400'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                    }`}
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <Link
                    to={plan.ctaLink}
                    className={`block w-full py-3 rounded-lg font-semibold text-center transition-colors ${
                      plan.highlighted
                        ? 'bg-ghana-gold text-ghana-black hover:bg-yellow-400'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

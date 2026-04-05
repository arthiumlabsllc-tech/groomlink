import { Check } from 'lucide-react'

const plans = [
  {
    name: 'Customer',
    price: 'Free',
    description: 'Book appointments and discover salons',
    features: [
      'Unlimited salon discovery',
      'Instant booking',
      'Mobile Money payments',
      'SMS notifications',
      'Review & rate salons',
      'Loyalty rewards',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Salon Pro',
    price: 'GH₵ 99',
    period: '/month',
    description: 'For growing salons and barbershops',
    features: [
      'Everything in Customer',
      'Unlimited bookings',
      'Staff management',
      'Service catalog',
      'Business analytics',
      'Priority support',
    ],
    cta: 'Start Free Trial',
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
      'Advanced analytics',
      'API access',
      'White-label options',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-primary-500 font-semibold text-sm uppercase tracking-wider">Pricing</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 font-display">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
            Start for free as a customer. Salon owners can try our Pro plan free for 14 days.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
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
                  {plan.period && (
                    <span className={plan.highlighted ? 'text-white/70' : 'text-gray-500'}>
                      {plan.period}
                    </span>
                  )}
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

              <button 
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  plan.highlighted 
                    ? 'bg-ghana-gold text-ghana-black hover:bg-yellow-400' 
                    : 'bg-primary-500 text-white hover:bg-primary-600'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

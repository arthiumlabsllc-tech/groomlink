import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

// Official payment artwork; the dark variants swap in automatically via
// prefers-color-scheme (see <picture> below).
const paymentLogos = [
  // dark variants are horizontal/white artwork, so they get smaller heights
  { light: '/pay-mtn-light.png', dark: '/pay-mtn-dark.png', alt: 'MTN Mobile Money', cls: 'pay-logo pay-logo-mtn' },
  { light: '/pay-telecel-light.png', dark: '/pay-telecel-dark.png', alt: 'Telecel Cash', cls: 'pay-logo pay-logo-telecel' },
  { light: '/pay-airtel-light.png', dark: '/pay-airtel-dark.png', alt: 'AirtelTigo Money', cls: 'pay-logo pay-logo-airtel' },
]

const trustSignals = [
  {
    icon: 'verified',
    title: 'Verified Professionals',
    description: 'Every salon & barber is vetted before going live',
  },
  {
    icon: 'shield',
    title: 'Secure Payments',
    description: 'End-to-end encrypted mobile money & card payments',
  },
  {
    icon: 'schedule',
    title: 'Instant Confirmation',
    description: 'Book and get confirmed in real-time, 24/7',
  },
  {
    icon: 'support_agent',
    title: '24/7 Support',
    description: 'Our team is always here to help you',
  },
]

const stats = [
  { value: '1,500+', label: 'Verified Salons' },
  { value: '50K+', label: 'Monthly Bookings' },
  { value: '4.8', label: 'Average Rating' },
  { value: '98%', label: 'Satisfaction' },
]

export default function TrustBadges() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-20 bg-white">
      <div className="section-container">
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h2 className="text-3xl sm:text-4xl font-bold text-brand-text mb-4">
            Trusted Across Ghana
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Join thousands of Ghanaians who book with confidence every day.
          </p>
        </div>

        {/* Stats Row */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="text-center p-6 bg-brand-surface rounded-2xl"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="text-3xl sm:text-4xl font-bold text-brand-primary mb-2">
                {stat.value}
              </div>
              <div className="text-gray-600 text-sm font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Trust Signals Grid */}
        <div className={`grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '200ms' }}>
          {trustSignals.map((signal, index) => (
            <div
              key={signal.title}
              className="flex items-start gap-4 p-5 bg-brand-surface rounded-xl"
              style={{ transitionDelay: `${(index + 4) * 100}ms` }}
            >
              <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon name={signal.icon} size={24} className="text-brand-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-text text-sm mb-1">
                  {signal.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {signal.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Payment Methods */}
        <div className={`text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '400ms' }}>
          <p className="text-gray-500 text-sm mb-4">Pay securely with</p>
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-10">
            {paymentLogos.map((logo) => (
              <picture key={logo.alt}>
                <source media="(prefers-color-scheme: dark)" srcSet={logo.dark} />
                <img
                  src={logo.light}
                  alt={logo.alt}
                  className={logo.cls}
                />
              </picture>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

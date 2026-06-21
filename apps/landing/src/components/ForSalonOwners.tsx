import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

const benefits = [
  {
    icon: 'account_balance_wallet',
    text: 'Instant payouts to Mobile Money',
  },
  {
    icon: 'trending_up',
    text: 'Free, easy-to-use business dashboard',
  },
  {
    icon: 'headset',
    text: '24/7 customer support',
  },
]

export default function ForSalonOwners() {
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
    <section 
      ref={sectionRef} 
      className="py-20 bg-gradient-to-br from-brand-secondary to-[#004d2d] relative overflow-hidden"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-brand-gold/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

      <div className="section-container relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Own a Shop?{' '}
              <span className="text-brand-gold">Claim Your Territory.</span>
            </h2>
            
            <p className="text-white/80 text-lg mb-8">
              Fill your chair, grow your clientele, and get paid instantly to Mobile Money.
            </p>

            {/* Benefits List */}
            <ul className="space-y-4 mb-10">
              {benefits.map((benefit, index) => (
                <li
                  key={index}
                  className={`flex items-center gap-4 transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}
                  style={{ transitionDelay: `${(index + 1) * 150}ms` }}
                >
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon name="check_circle" size={20} className="text-brand-gold" filled />
                  </div>
                  <span className="text-white font-medium">{benefit.text}</span>
                </li>
              ))}
            </ul>

            {/* CTA Buttons */}
            <div className={`flex flex-col sm:flex-row gap-3 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: '500ms' }}
            >
              <a
                href="https://partners.groomlinkgh.com"
                className="inline-block bg-white text-brand-secondary font-bold py-4 px-8 rounded-lg hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl text-center"
              >
                List Your Business
              </a>
              <a
                href="https://partners.groomlinkgh.com"
                className="inline-block bg-brand-gold/20 border border-brand-gold/40 text-white font-bold py-4 px-8 rounded-lg hover:bg-brand-gold/30 transition-all duration-300 text-center inline-flex items-center justify-center gap-2"
              >
                <span>✂️</span> Stylist? Get Booked
              </a>
            </div>
          </div>

          {/* Visual/Stats */}
          <div className={`hidden lg:block transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'}`}>
            <div className="relative">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <div className="text-4xl font-bold text-brand-gold mb-2">1,500+</div>
                  <div className="text-white/80">Partner Salons</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mt-8">
                  <div className="text-4xl font-bold text-brand-gold mb-2">50K+</div>
                  <div className="text-white/80">Monthly Bookings</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <div className="text-4xl font-bold text-brand-gold mb-2">98%</div>
                  <div className="text-white/80">Satisfaction Rate</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mt-8">
                  <div className="text-4xl font-bold text-brand-gold mb-2">24/7</div>
                  <div className="text-white/80">Support Available</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

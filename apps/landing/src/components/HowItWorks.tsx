import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'

const customerSteps = [
  {
    number: '01',
    icon: 'search',
    title: 'Search',
    description: 'Browse top-rated barbers, salons & beauty pros near you by service, location, or rating.',
  },
  {
    number: '02',
    icon: 'calendar_today',
    title: 'Choose & Book',
    description: 'Compare prices, read reviews, pick your stylist, and book your appointment in seconds.',
  },
  {
    number: '03',
    icon: 'auto_awesome',
    title: 'Show Up & Enjoy',
    description: 'Get reminded before your appointment, earn loyalty points, and pay securely via Mobile Money.',
  },
]

const professionalSteps = [
  {
    number: '01',
    icon: 'app_registration',
    title: 'Register',
    description: 'Sign up and create your business or freelancer profile in under 5 minutes.',
  },
  {
    number: '02',
    icon: 'visibility',
    title: 'Get Discovered',
    description: 'Appear in customer searches, showcase your work, and collect 5-star reviews.',
  },
  {
    number: '03',
    icon: 'payments',
    title: 'Receive Clients & Get Paid',
    description: 'Accept bookings, manage your calendar, and receive instant payouts to Mobile Money.',
  },
]

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<'customer' | 'professional'>('customer')

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

  const steps = activeTab === 'customer' ? customerSteps : professionalSteps

  return (
    <section ref={sectionRef} className="py-20 bg-brand-surface">
      <div className="section-container">
        {/* Section Header */}
        <div className={`text-center mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h2 className="text-3xl sm:text-4xl font-bold text-brand-text mb-4">
            How It Works
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Whether you're looking for a fresh cut or growing your business, GroomLink makes it easy.
          </p>
        </div>

        {/* Tabs */}
        <div className={`flex justify-center mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-200 inline-flex">
            <button
              onClick={() => setActiveTab('customer')}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'customer'
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'text-gray-600 hover:text-brand-text'
              }`}
            >
              <Icon name="person" size={18} />
              For Customers
            </button>
            <button
              onClick={() => setActiveTab('professional')}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'professional'
                  ? 'bg-brand-secondary text-white shadow-md'
                  : 'text-gray-600 hover:text-brand-text'
              }`}
            >
              <Icon name="storefront" size={18} />
              For Professionals
            </button>
          </div>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`relative transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="card card-hover p-8 text-center h-full">
                {/* Step Number */}
                <span className="absolute top-4 right-4 text-5xl font-bold text-gray-100 select-none">
                  {step.number}
                </span>
                
                {/* Icon */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
                  activeTab === 'customer' ? 'bg-brand-primary/10' : 'bg-brand-secondary/10'
                }`}>
                  <Icon name={step.icon} size={32} className={activeTab === 'customer' ? 'text-brand-primary' : 'text-brand-secondary'} />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-bold text-brand-text mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA based on tab */}
        <div className={`text-center mt-12 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {activeTab === 'customer' ? (
            <Link
              to="/explore"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Icon name="search" size={20} />
              Book a Professional Now
            </Link>
          ) : (
            <a
              href="https://partners.groomlinkgh.com"
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Icon name="rocket_launch" size={20} />
              Join as a Professional
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

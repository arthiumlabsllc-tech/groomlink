import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

const steps = [
  {
    number: '01',
    icon: 'search',
    title: 'Find',
    description: 'Search salons and services near you',
  },
  {
    number: '02',
    icon: 'calendar_today',
    title: 'Book',
    description: 'Choose your stylist, time, and pay securely',
  },
  {
    number: '03',
    icon: 'auto_awesome',
    title: 'Relax',
    description: 'Get your service and earn loyalty points',
  },
]

export default function HowItWorks() {
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
    <section ref={sectionRef} className="py-20 bg-brand-surface">
      <div className="section-container">
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h2 className="text-3xl sm:text-4xl font-bold text-brand-text mb-4">
            How It Works
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Book your next grooming appointment in three simple steps
          </p>
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
                <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Icon name={step.icon} size={32} className="text-brand-primary" />
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
      </div>
    </section>
  )
}

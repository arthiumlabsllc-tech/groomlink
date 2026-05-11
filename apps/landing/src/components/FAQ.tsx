import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

const customerFAQs = [
  {
    question: 'How do I book an appointment?',
    answer: 'Simply search for a salon or barber near you, select your preferred service and stylist, choose a time slot, and confirm your booking. You will receive an instant confirmation via SMS and email.',
  },
  {
    question: 'Can I pay with Mobile Money?',
    answer: 'Yes! GroomLink accepts MTN Mobile Money, Vodafone Cash, and AirtelTigo Money. We also accept Visa and Mastercard for card payments. All transactions are secure and encrypted.',
  },
  {
    question: 'What if I need to cancel or reschedule?',
    answer: 'You can cancel or reschedule your appointment directly from the app or website up to 2 hours before your scheduled time. Refer to our cancellation policy for details on refunds.',
  },
  {
    question: 'Are the salons verified?',
    answer: 'Yes, every salon and professional on GroomLink goes through a verification process. We check their business registration, location, and service quality before they go live on the platform.',
  },
]

const professionalFAQs = [
  {
    question: 'How do I register my salon?',
    answer: 'Click "List Your Business" and fill out your profile with your business name, location, services, and pricing. Our team will verify your details within 24-48 hours.',
  },
  {
    question: 'How much does it cost to join?',
    answer: 'Listing your salon on GroomLink is completely free! We only charge a small commission per successful booking, which covers payment processing and platform maintenance.',
  },
  {
    question: 'How do I get paid?',
    answer: 'Payments are sent directly to your registered Mobile Money wallet within 24-48 hours after the service is completed. You can track all your earnings in the partner dashboard.',
  },
  {
    question: 'Can I manage my own schedule?',
    answer: 'Absolutely. You have full control over your availability, services, and pricing through the partner app. Set your working hours, block off time, and manage appointments easily.',
  },
]

export default function FAQ() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<'customer' | 'professional'>('customer')
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const faqs = activeTab === 'customer' ? customerFAQs : professionalFAQs

  return (
    <section ref={sectionRef} className="py-20 bg-brand-surface">
      <div className="section-container max-w-4xl">
        {/* Section Header */}
        <div className={`text-center mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h2 className="text-3xl sm:text-4xl font-bold text-brand-text mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600 text-lg">
            Everything you need to know about GroomLink.
          </p>
        </div>

        {/* Tabs */}
        <div className={`flex justify-center mb-10 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-200 inline-flex">
            <button
              onClick={() => { setActiveTab('customer'); setOpenIndex(0) }}
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
              onClick={() => { setActiveTab('professional'); setOpenIndex(0) }}
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

        {/* FAQ Items */}
        <div className={`space-y-4 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-brand-text pr-4">
                  {faq.question}
                </span>
                <Icon
                  name={openIndex === index ? 'expand_less' : 'expand_more'}
                  size={24}
                  className="text-gray-400 flex-shrink-0"
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <p className="px-6 pb-6 text-gray-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

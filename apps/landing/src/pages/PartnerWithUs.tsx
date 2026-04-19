import { useEffect, useRef, useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Icon from '../components/Icon'

// Animation hook using IntersectionObserver
function useScrollAnimation(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold])

  return { ref, isVisible }
}

// Benefit Card Component
interface BenefitCardProps {
  icon: string
  title: string
  description: string
  delay: number
  isVisible: boolean
}

function BenefitCard({ icon, title, description, delay, isVisible }: BenefitCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="w-14 h-14 bg-gradient-to-br from-[#006B3F] to-[#004d2d] rounded-xl flex items-center justify-center mb-4">
        <Icon name={icon} size={28} className="text-[#FCD116]" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}

// Step Card Component
interface StepCardProps {
  number: number
  icon: string
  title: string
  description: string
  delay: number
  isVisible: boolean
}

function StepCard({ number, icon, title, description, delay, isVisible }: StepCardProps) {
  return (
    <div
      className={`relative text-center ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${delay}ms`, transition: 'all 0.6s ease-out' }}
    >
      {/* Connector line (hidden on mobile) */}
      {number < 3 && (
        <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-[#006B3F]/30 to-[#FCD116]/30" />
      )}
      
      {/* Number badge */}
      <div className="w-24 h-24 mx-auto mb-6 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#006B3F] to-[#004d2d] rounded-full flex items-center justify-center shadow-lg">
          <Icon name={icon} size={32} className="text-[#FCD116]" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 bg-[#CE1126] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
          {number}
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 max-w-xs mx-auto">{description}</p>
    </div>
  )
}

// Stat Card Component
interface StatCardProps {
  value: string
  label: string
  delay: number
  isVisible: boolean
}

function StatCard({ value, label, delay, isVisible }: StatCardProps) {
  return (
    <div
      className={`text-center p-6 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      style={{ transitionDelay: `${delay}ms`, transition: 'all 0.6s ease-out' }}
    >
      <div className="text-4xl md:text-5xl font-bold text-[#FCD116] mb-2">{value}</div>
      <div className="text-white/80 font-medium">{label}</div>
    </div>
  )
}

// FAQ Item Component
interface FAQItemProps {
  question: string
  answer: string
  isOpen: boolean
  onClick: () => void
}

function FAQItem({ question, answer, isOpen, onClick }: FAQItemProps) {
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onClick}
        className="w-full py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors px-2 -mx-2 rounded-lg"
      >
        <span className="font-semibold text-gray-900 pr-4">{question}</span>
        <Icon
          name={isOpen ? 'expand_less' : 'expand_more'}
          size={24}
          className="text-[#006B3F] flex-shrink-0"
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-40 opacity-100 pb-5' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="text-gray-600 leading-relaxed">{answer}</p>
      </div>
    </div>
  )
}

export default function PartnerWithUs() {
  const [scrolled, setScrolled] = useState(false)
  const [openFAQ, setOpenFAQ] = useState<number | null>(0)

  // Scroll animations
  const benefitsAnim = useScrollAnimation(0.2)
  const stepsAnim = useScrollAnimation(0.2)
  const statsAnim = useScrollAnimation(0.2)
  const pricingAnim = useScrollAnimation(0.2)
  const faqAnim = useScrollAnimation(0.2)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToBenefits = () => {
    const element = document.getElementById('benefits')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const benefits = [
    {
      icon: 'search',
      title: 'Get Discovered',
      description: 'Appear in search results when customers look for salons nearby. Be visible to thousands of potential clients actively seeking grooming services.',
    },
    {
      icon: 'calendar_today',
      title: 'Easy Booking Management',
      description: 'Accept, manage, and track all bookings from one intuitive dashboard. No more phone tag or missed appointments.',
    },
    {
      icon: 'trending_up',
      title: 'Grow Your Revenue',
      description: 'Fill empty slots, reduce no-shows with automated reminders, and attract new customers to boost your bottom line.',
    },
    {
      icon: 'storefront',
      title: 'Professional Online Presence',
      description: 'Get your own branded page with photo gallery, customer reviews, services list, and business hours.',
    },
  ]

  const steps = [
    {
      icon: 'person_add',
      title: 'Sign Up For Free',
      description: 'Create your partner account in just 2 minutes. No credit card required.',
    },
    {
      icon: 'settings',
      title: 'Set Up Your Salon',
      description: 'Add your services, staff, business hours, and upload gallery photos.',
    },
    {
      icon: 'event_available',
      title: 'Start Receiving Bookings',
      description: 'Customers find you through our app and book directly. You get notified instantly.',
    },
  ]

  const stats = [
    { value: '500+', label: 'Partner Salons' },
    { value: '50K+', label: 'Monthly Bookings' },
    { value: '98%', label: 'Satisfaction Rate' },
  ]

  const faqs = [
    {
      question: 'Is it really free?',
      answer: 'Yes! Signing up and listing your salon on GroomLink is completely free. We only charge a small commission when you actually receive a booking, so we only make money when you make money.',
    },
    {
      question: 'How do customers find my salon?',
      answer: 'Customers discover your salon through our mobile app, website, and search results. We optimize your listing to appear when customers search for services you offer in your area.',
    },
    {
      question: 'Do I need a smartphone?',
      answer: 'Not necessarily. You can manage your salon entirely from the web dashboard on any computer. However, we also offer a mobile app for convenient on-the-go management.',
    },
    {
      question: 'How do I get paid?',
      answer: 'Customers pay directly at your salon after their service. GroomLink simply facilitates the booking process. We are working on integrated payment options for future releases.',
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      <Header scrolled={scrolled} />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
        {/* Background with Ghana colors gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#006B3F] via-[#004d2d] to-[#1a1a2e]">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#FCD116]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#CE1126]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FCD116]/5 rounded-full blur-3xl" />
          
          {/* Pattern overlay */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>
        </div>

        <div className="relative z-10 section-container py-16 lg:py-24">
          <div className="max-w-4xl mx-auto text-center">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8 animate-fade-in">
              <span className="text-[#FCD116] text-lg">🇬🇭</span>
              <span className="text-white/90 text-sm font-medium">
                Ghana's Leading Salon Booking Platform
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white font-display leading-tight mb-6 animate-fade-in-up">
              Grow Your Salon Business with{' '}
              <span className="text-[#FCD116]">GroomLink</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-white/80 mb-10 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Join Ghana's leading salon booking platform. Get discovered by thousands of customers, 
              manage bookings effortlessly, and increase your revenue — all for free.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <a
                href="https://partners.groomlinkgh.com"
                className="inline-flex items-center justify-center gap-2 bg-[#FCD116] text-[#1A1A1A] font-bold py-4 px-8 rounded-xl hover:bg-[#e5bc14] transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <Icon name="rocket_launch" size={20} />
                Start For Free
              </a>
              <button
                onClick={scrollToBenefits}
                className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white font-semibold py-4 px-8 rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/20"
              >
                <Icon name="expand_more" size={20} />
                Learn More
              </button>
            </div>

            {/* Social proof */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-white/70 text-sm animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-2">
                <Icon name="check_circle" size={18} className="text-[#FCD116]" filled />
                <span>Free to join</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="check_circle" size={18} className="text-[#FCD116]" filled />
                <span>No setup fees</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="check_circle" size={18} className="text-[#FCD116]" filled />
                <span>Instant activation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80L48 74.7C96 69 192 59 288 53.3C384 48 480 48 576 53.3C672 59 768 69 864 69.3C960 69 1056 59 1152 53.3C1248 48 1344 48 1392 48L1440 48V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0Z" fill="#F8F9FA"/>
          </svg>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 lg:py-28 bg-[#F8F9FA]">
        <div className="section-container">
          <div className="text-center max-w-3xl mx-auto mb-16" ref={benefitsAnim.ref}>
            <span className={`inline-block text-[#006B3F] font-semibold text-sm uppercase tracking-wider mb-3 transition-all duration-700 ${benefitsAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              Why Partner With Us
            </span>
            <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 transition-all duration-700 delay-100 ${benefitsAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              Everything You Need to{' '}
              <span className="text-[#006B3F]">Succeed</span>
            </h2>
            <p className={`text-gray-600 text-lg transition-all duration-700 delay-200 ${benefitsAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              Powerful tools and features designed to help your salon thrive in the digital age.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <BenefitCard
                key={index}
                icon={benefit.icon}
                title={benefit.title}
                description={benefit.description}
                delay={index * 100}
                isVisible={benefitsAnim.isVisible}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="section-container">
          <div className="text-center max-w-3xl mx-auto mb-16" ref={stepsAnim.ref}>
            <span className={`inline-block text-[#006B3F] font-semibold text-sm uppercase tracking-wider mb-3 transition-all duration-700 ${stepsAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              Simple Process
            </span>
            <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 transition-all duration-700 delay-100 ${stepsAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              Get Started in{' '}
              <span className="text-[#006B3F]">3 Easy Steps</span>
            </h2>
            <p className={`text-gray-600 text-lg transition-all duration-700 delay-200 ${stepsAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              From signup to your first booking in minutes, not days.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12 max-w-5xl mx-auto" ref={stepsAnim.ref}>
            {steps.map((step, index) => (
              <StepCard
                key={index}
                number={index + 1}
                icon={step.icon}
                title={step.title}
                description={step.description}
                delay={index * 150}
                isVisible={stepsAnim.isVisible}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 lg:py-20 bg-gradient-to-r from-[#006B3F] to-[#004d2d] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FCD116]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#CE1126]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="section-container relative" ref={statsAnim.ref}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <StatCard
                key={index}
                value={stat.value}
                label={stat.label}
                delay={index * 100}
                isVisible={statsAnim.isVisible}
              />
            ))}
          </div>
          
          <div className={`text-center mt-12 transition-all duration-700 delay-300 ${statsAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <p className="text-white/70 text-lg">
              Trusted by barbershops and salons across Ghana
            </p>
          </div>
        </div>
      </section>

      {/* Pricing/CTA Section */}
      <section className="py-20 lg:py-28 bg-[#F8F9FA]">
        <div className="section-container">
          <div className="max-w-4xl mx-auto" ref={pricingAnim.ref}>
            <div className={`bg-gradient-to-br from-[#006B3F] to-[#004d2d] rounded-3xl p-8 md:p-12 lg:p-16 text-center relative overflow-hidden transition-all duration-700 ${pricingAnim.isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#FCD116]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#CE1126]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

              <div className="relative">
                <div className={`inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 transition-all duration-700 delay-100 ${pricingAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <Icon name="verified" size={18} className="text-[#FCD116]" filled />
                  <span className="text-white/90 text-sm font-medium">No Hidden Fees</span>
                </div>

                <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 transition-all duration-700 delay-200 ${pricingAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  Completely Free to Get Started
                </h2>

                <p className={`text-white/80 text-lg mb-8 max-w-xl mx-auto transition-all duration-700 delay-300 ${pricingAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  No monthly fees. No setup costs. No credit card required. 
                  Start growing your business today.
                </p>

                <div className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-700 delay-400 ${pricingAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <a
                    href="https://partners.groomlinkgh.com"
                    className="inline-flex items-center justify-center gap-2 bg-[#FCD116] text-[#1A1A1A] font-bold py-4 px-10 rounded-xl hover:bg-[#e5bc14] transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-lg"
                  >
                    <Icon name="rocket_launch" size={22} />
                    Start Now — It's Free
                  </a>
                </div>

                <div className={`mt-8 flex flex-wrap items-center justify-center gap-6 text-white/60 text-sm transition-all duration-700 delay-500 ${pricingAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <div className="flex items-center gap-1">
                    <Icon name="schedule" size={16} />
                    <span>2 min setup</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Icon name="support_agent" size={16} />
                    <span>24/7 support</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Icon name="cancel" size={16} />
                    <span>Cancel anytime</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="section-container">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12" ref={faqAnim.ref}>
              <span className={`inline-block text-[#006B3F] font-semibold text-sm uppercase tracking-wider mb-3 transition-all duration-700 ${faqAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                Got Questions?
              </span>
              <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 transition-all duration-700 delay-100 ${faqAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                Frequently Asked{' '}
                <span className="text-[#006B3F]">Questions</span>
              </h2>
            </div>

            <div className={`bg-[#F8F9FA] rounded-2xl p-6 md:p-8 transition-all duration-700 delay-200 ${faqAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {faqs.map((faq, index) => (
                <FAQItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openFAQ === index}
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                />
              ))}
            </div>

            <div className={`text-center mt-10 transition-all duration-700 delay-300 ${faqAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <p className="text-gray-600 mb-4">Still have questions?</p>
              <a
                href="mailto:hello@groomlinkgh.com"
                className="inline-flex items-center gap-2 text-[#006B3F] font-semibold hover:text-[#004d2d] transition-colors"
              >
                <Icon name="mail" size={20} />
                Contact our team
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

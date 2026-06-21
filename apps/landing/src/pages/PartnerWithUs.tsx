import { useEffect, useRef, useState, useCallback } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'

/* ─── Hooks ─── */
function useScrollAnimation(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setIsVisible(true); obs.disconnect() } }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, isVisible }
}

function useCountUp(end: number, isVisible: boolean, duration = 2000) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!isVisible) return
    let start = 0
    const startTime = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * end))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [isVisible, end, duration])
  return count
}

/* ─── Inline SVG Icons ─── */
function CalendarIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FCD116" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FCD116" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
    </svg>
  )
}
function TrendingUpIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FCD116" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  )
}
function CheckIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#006B3F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
}
function PhoneIcon() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <rect x="30" y="10" width="60" height="100" rx="10" stroke="#006B3F" strokeWidth="2" fill="#F0FDF4" />
      <rect x="40" y="25" width="40" height="60" rx="2" fill="#DCFCE7" />
      <circle cx="60" cy="98" r="5" stroke="#006B3F" strokeWidth="2" fill="white" />
      <text x="60" y="58" textAnchor="middle" fontSize="22" fill="#006B3F">₵</text>
      <circle cx="60" cy="80" r="4" fill="#22C55E" />
    </svg>
  )
}
function StarIcon({ filled = true }: { filled?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? '#FCD116' : 'none'} stroke="#FCD116" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

/* ─── Sub-components ─── */
function FadeIn({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useScrollAnimation()
  return (
    <div ref={ref} className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

function StatCounter({ value, suffix, label, isVisible, delay }: { value: number; suffix: string; label: string; isVisible: boolean; delay: number }) {
  const count = useCountUp(value, isVisible)
  return (
    <div className="text-center p-6 transition-all duration-700" style={{ transitionDelay: `${delay}ms` }}>
      <div className="text-4xl md:text-5xl font-bold text-[#FCD116] mb-2">{count}{suffix}</div>
      <div className="text-white/80 font-medium">{label}</div>
    </div>
  )
}

interface FAQItemProps { question: string; answer: string; isOpen: boolean; onClick: () => void }
function FAQItem({ question, answer, isOpen, onClick }: FAQItemProps) {
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button onClick={onClick} className="w-full py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors px-2 -mx-2 rounded-lg">
        <span className="font-semibold text-gray-900 pr-4">{question}</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#006B3F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-60 opacity-100 pb-5' : 'max-h-0 opacity-0'}`}>
        <p className="text-gray-600 leading-relaxed">{answer}</p>
      </div>
    </div>
  )
}

/* ─── Main Component ─── */
export default function PartnerWithUs() {
  const [scrolled, setScrolled] = useState(false)
  const [openFAQ, setOpenFAQ] = useState<number | null>(0)
  const statsAnim = useScrollAnimation(0.2)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  const scrollToHowItWorks = useCallback(() => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const faqs = [
    { question: 'What is GroomLink?', answer: 'GroomLink is Ghana\'s leading salon and barbershop booking platform. We connect customers with the best salons and barbershops across the country, making it easy to discover, book, and pay for grooming services online.' },
    { question: 'How does the marketplace help me?', answer: 'We connect you with thousands of customers actively searching for grooming services in your area. Your salon gets visibility across our app, website, and social media channels- bringing you bookings you would never get on your own.' },
    { question: 'What is online booking?', answer: 'Customers can book your services 24/7 from their phone- no more phone tag or WhatsApp back-and-forth. They see your availability in real-time and book instantly. You get notified immediately of every new booking.' },
    { question: 'Who is GroomLink for?', answer: 'GroomLink is for salon owners, barbershop owners, hairstylists, nail technicians, and any grooming professional in Ghana who wants to grow their business with modern booking technology.' },
    { question: 'How do I get paid?', answer: 'Payments go directly to your mobile money account (MTN MoMo, Vodafone Cash, AirtelTigo Money) immediately after you complete a service. No waiting days or weeks for your money.' },
    { question: 'Is there a contract?', answer: 'No! GroomLink is free to join with no contracts or commitments. You can deactivate your listing at any time. We only earn when you earn- a small commission on completed bookings.' },
  ]

  const testimonials = [
    { quote: 'GroomLink has transformed my salon. I get 40% more bookings and payments come straight to my MoMo!', name: 'Akua Mensah', salon: 'Glow Beauty Salon', city: 'Accra' },
    { quote: 'I used to spend hours on WhatsApp managing bookings. Now everything is automated.', name: 'Kwame Boateng', salon: 'Kings Barbershop', city: 'Kumasi' },
    { quote: 'The instant payout feature is a game changer. No more chasing payments!', name: 'Ama Darko', salon: 'Style Hub', city: 'Takoradi' },
  ]

  const pricingFeatures = ['Free listing on GroomLink marketplace', 'Instant payouts to mobile money', '24/7 customer support', 'No hidden fees or charges', 'Custom booking link & QR code', 'Client management tools']

  return (
    <div className="min-h-screen bg-white">
      <Header scrolled={scrolled} />

      {/* ─── 1. Hero Section ─── */}
      <section className="relative min-h-[92vh] flex items-center pt-24 overflow-hidden bg-gradient-to-br from-[#006B3F] via-[#00573a] to-[#004d2d]">
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-[#FCD116]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#CE1126]/10 rounded-full blur-3xl" />

        <div className="relative z-10 section-container py-16 lg:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-5 py-2.5 mb-8">
              <span className="text-[#FCD116] text-lg">🇬🇭</span>
              <span className="text-white text-sm font-semibold">Trusted by 500+ Ghanaian salons</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-white leading-tight mb-6">
              The #1 Salon & Barbershop Booking Platform in{' '}
              <span className="text-[#FCD116]">Ghana</span>
            </h1>

            <p className="text-lg sm:text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Get more bookings, get paid instantly, and build a loyal client base. Trusted by salons across Accra, Kumasi, and beyond.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://partners.groomlinkgh.com" className="inline-flex items-center justify-center gap-2 bg-[#CE1126] text-white font-bold py-4 px-8 rounded-xl hover:bg-[#a80e1f] transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-lg">
                Start Free Now- No Credit Card Required
              </a>
              <button onClick={scrollToHowItWorks} className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white font-semibold py-4 px-8 rounded-xl hover:bg-white/20 transition-all duration-300 border-2 border-white/30">
                See How It Works
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
              </button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full"><path d="M0 60L60 55C120 50 240 40 360 35C480 30 600 30 720 33C840 36 960 42 1080 45C1200 48 1320 48 1380 48L1440 48V60H0Z" fill="#F8F9FA" /></svg>
        </div>
      </section>

      {/* ─── 2. Social Proof Strip ─── */}
      <section className="py-6 bg-[#F8F9FA] border-y border-gray-100">
        <div className="section-container">
          <p className="text-center text-gray-500 font-medium text-sm tracking-wide">
            Join salons from <span className="text-gray-900 font-semibold">Accra</span>, <span className="text-gray-900 font-semibold">Kumasi</span>, <span className="text-gray-900 font-semibold">Takoradi</span>, <span className="text-gray-900 font-semibold">Tema</span>, <span className="text-gray-900 font-semibold">Cape Coast</span>
          </p>
        </div>
      </section>

      {/* ─── 3. Three Benefit Columns ─── */}
      <section className="py-20 lg:py-28 bg-[#F8F9FA]">
        <div className="section-container">
          <FadeIn className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block text-[#006B3F] font-semibold text-sm uppercase tracking-wider mb-3">Why GroomLink</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Everything You Need to <span className="text-[#006B3F]">Thrive</span></h2>
            <p className="text-gray-600 text-lg">Powerful tools designed for Ghanaian salon and barbershop owners.</p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { Icon: CalendarIcon, title: 'Stay Booked, Without the Back and Forth', text: '24/7 online booking, automated reminders, and client management tools keep your calendar full.' },
              { Icon: ShieldIcon, title: 'Focus on Your Clients, Not Admin', text: 'Streamline scheduling, payments, and client communication in one simple app.' },
              { Icon: TrendingUpIcon, title: 'Build a Business You\'re Proud Of', text: 'Data-driven insights help you grow revenue and make smart decisions.' },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 150}>
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#006B3F] to-[#004d2d] rounded-xl flex items-center justify-center mb-5">
                    <item.Icon />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. Pricing Section ─── */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="section-container">
          <FadeIn className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-block text-[#006B3F] font-semibold text-sm uppercase tracking-wider mb-3">Simple Pricing</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Start for <span className="text-[#006B3F]">Free</span></h2>
          </FadeIn>

          <FadeIn className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-[#006B3F] px-8 py-6 text-center">
                <p className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-1">FREE to Start</p>
                <p className="text-5xl font-bold text-white">₵0<span className="text-lg font-normal text-white/70"> / month</span></p>
              </div>
              <div className="px-8 py-8">
                <p className="text-gray-600 text-center mb-6">No setup fees. 10% commission only on completed bookings.</p>
                <ul className="space-y-3 mb-8">
                  {pricingFeatures.map((f, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex-shrink-0"><CheckIcon /></span>
                      <span className="text-gray-700">{f}</span>
                    </li>
                  ))}
                </ul>
                <a href="https://partners.groomlinkgh.com" className="block w-full text-center bg-[#CE1126] text-white font-bold py-4 px-8 rounded-xl hover:bg-[#a80e1f] transition-all duration-300 shadow-lg hover:shadow-xl text-lg">
                  Start Free Now
                </a>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── 5. By the Numbers ─── */}
      <section className="py-16 lg:py-20 bg-gradient-to-r from-[#006B3F] to-[#004d2d] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FCD116]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#CE1126]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="section-container relative" ref={statsAnim.ref}>
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">By the Numbers</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCounter value={500} suffix="+" label="Salons Trust Us" isVisible={statsAnim.isVisible} delay={0} />
            <StatCounter value={10000} suffix="+" label="Happy Customers" isVisible={statsAnim.isVisible} delay={100} />
            <StatCounter value={30} suffix="%" label="More Bookings" isVisible={statsAnim.isVisible} delay={200} />
            <StatCounter value={25} suffix="%" label="No-Show Reduction" isVisible={statsAnim.isVisible} delay={300} />
          </div>
        </div>
      </section>

      {/* ─── 6. Testimonials ─── */}
      <section className="py-20 lg:py-28 bg-[#F8F9FA]">
        <div className="section-container">
          <FadeIn className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block text-[#006B3F] font-semibold text-sm uppercase tracking-wider mb-3">Testimonials</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Loved by <span className="text-[#006B3F]">Salon Owners</span></h2>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <FadeIn key={i} delay={i * 150}>
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 h-full flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => <StarIcon key={j} />)}
                  </div>
                  <p className="text-gray-700 leading-relaxed mb-6 flex-1">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#006B3F] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {t.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                      <p className="text-gray-500 text-xs">{t.salon}, {t.city}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 7. Feature Spotlight: Instant Payouts ─── */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="section-container">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <span className="inline-block text-[#006B3F] font-semibold text-sm uppercase tracking-wider mb-3">Instant Payouts</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Get Paid <span className="text-[#006B3F]">Instantly</span> After Every Service</h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                No waiting days or weeks. Funds go directly to your mobile money (MTN, Vodafone, AirtelTigo) immediately when you complete a service.
              </p>
              <div className="flex flex-wrap gap-3">
                {['MTN MoMo', 'Vodafone Cash', 'AirtelTigo Money'].map(p => (
                  <span key={p} className="bg-green-50 text-[#006B3F] px-4 py-2 rounded-lg text-sm font-medium border border-green-100">{p}</span>
                ))}
              </div>
            </FadeIn>
            <FadeIn delay={200} className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-4 bg-green-50 rounded-3xl blur-xl" />
                <div className="relative bg-gradient-to-br from-green-50 to-white rounded-3xl p-10 border border-green-100">
                  <PhoneIcon />
                  <div className="mt-4 text-center">
                    <span className="text-[#006B3F] font-bold text-lg">Instant Payout</span>
                    <p className="text-gray-500 text-sm">Funds in seconds, not days</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── 8. How It Works ─── */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-[#F8F9FA]">
        <div className="section-container">
          <FadeIn className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block text-[#006B3F] font-semibold text-sm uppercase tracking-wider mb-3">How It Works</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Get Started in <span className="text-[#006B3F]">3 Simple Steps</span></h2>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
            {/* Connection lines (desktop only) */}
            <div className="hidden md:block absolute top-16 left-[33%] w-[34%] h-0.5 bg-gradient-to-r from-[#006B3F]/30 to-[#FCD116]/30" />
            <div className="hidden md:block absolute top-16 left-[66%] w-[34%] h-0.5 bg-gradient-to-r from-[#FCD116]/30 to-[#CE1126]/30" />

            {[
              { num: 1, title: 'Set up your profile', desc: 'Sign up in 5 minutes. Add your services, prices, and hours.', color: 'from-[#006B3F] to-[#004d2d]' },
              { num: 2, title: 'Share your booking link', desc: 'Get a custom QR code and link to share on social media.', color: 'from-[#006B3F] to-[#004d2d]' },
              { num: 3, title: 'Start getting booked', desc: 'Clients book 24/7. You get paid instantly.', color: 'from-[#006B3F] to-[#004d2d]' },
            ].map((step, i) => (
              <FadeIn key={i} delay={i * 150}>
                <div className="text-center relative">
                  <div className="w-28 h-28 mx-auto mb-6 relative">
                    <div className={`absolute inset-0 bg-gradient-to-br ${step.color} rounded-full flex items-center justify-center shadow-lg`}>
                      <span className="text-3xl font-bold text-[#FCD116]">{step.num}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 max-w-xs mx-auto">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 9. Final CTA Section ─── */}
      <section className="py-20 lg:py-28 bg-[#006B3F] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FCD116]/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

        <div className="section-container relative">
          <FadeIn className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">Ready to Grow Your Salon Business?</h2>
            <p className="text-white/80 text-lg mb-10">Join hundreds of Ghanaian salons already using GroomLink.</p>
            <a href="https://partners.groomlinkgh.com" className="inline-flex items-center justify-center gap-2 bg-[#FCD116] text-[#1A1A1A] font-bold py-4 px-10 rounded-xl hover:bg-[#e5bc14] transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-lg">
              Start Free Now
            </a>
            <p className="text-white/50 text-sm mt-6">No credit card required. Free to list.</p>
          </FadeIn>
        </div>
      </section>

      {/* ─── 10. FAQ Section ─── */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="section-container">
          <FadeIn className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block text-[#006B3F] font-semibold text-sm uppercase tracking-wider mb-3">Got Questions?</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Frequently Asked <span className="text-[#006B3F]">Questions</span></h2>
            </div>

            <div className="bg-[#F8F9FA] rounded-2xl p-6 md:p-8">
              {faqs.map((faq, i) => (
                <FAQItem key={i} question={faq.question} answer={faq.answer} isOpen={openFAQ === i} onClick={() => setOpenFAQ(openFAQ === i ? null : i)} />
              ))}
            </div>

            <div className="text-center mt-10">
              <p className="text-gray-600 mb-4">Still have questions?</p>
              <a href="mailto:hello@groomlinkgh.com" className="inline-flex items-center gap-2 text-[#006B3F] font-semibold hover:text-[#004d2d] transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                Contact our team
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      <Footer />
    </div>
  )
}

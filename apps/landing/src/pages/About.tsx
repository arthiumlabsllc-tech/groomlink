import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Icon from '../components/Icon'
import GhanaFlag from '../components/GhanaFlag'

// ============================================================
// GroomLink About Page (/about)
// ============================================================
// The story, mission, and values behind the platform. Shared by
// both desktop and mobile (links from Footer "About Us" and
// MobileHome MiniFooter "About").

const stats = [
  { value: '500+', label: 'Verified Salons' },
  { value: '50k+', label: 'Bookings Processed' },
  { value: '16', label: 'Regions Covered' },
  { value: '4.9/5', label: 'Customer Rating' },
]

const values = [
  {
    icon: 'verified',
    title: 'Trust First',
    body: "Every salon is verified. Every payment is protected. Every review is real. We don't let anyone on the platform we wouldn't book ourselves.",
    tint: 'bg-[#006B3F]/10 text-[#006B3F]',
  },
  {
    icon: 'favorite',
    title: 'Beauty is Local',
    body: "Ghana's best stylists aren't in some foreign directory — they're down the road. We shine a light on the talent already in your neighborhood.",
    tint: 'bg-[#CE1126]/10 text-[#CE1126]',
  },
  {
    icon: 'rocket_launch',
    title: 'Owners Come First',
    body: "Salons keep 100% of their revenue — no commission. We only succeed when our partners do. Their growth is our scoreboard.",
    tint: 'bg-[#FCD116]/20 text-[#8a6d00]',
  },
  {
    icon: 'diversity_3',
    title: 'Made for Ghana',
    body: "Mobile Money native. Twi-friendly support. Built on the realities of Accra traffic, power cuts, and small-salon hustle.",
    tint: 'bg-ghana-red/10 text-ghana-red',
  },
]

export default function About() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header scrolled={scrolled} />

      {/* Hero */}
      <section className="relative pt-36 md:pt-40 pb-20 overflow-hidden bg-gradient-to-br from-[#006B3F] via-[#00573a] to-[#004d2d]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FCD116]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#CE1126]/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
        <div className="section-container relative text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6">
            <GhanaFlag className="w-5 h-3.5" />
            <span className="text-white text-sm font-medium">Built in Ghana, for Ghana</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-5 leading-tight">
            Grooming, <span className="text-[#FCD116]">rebooked.</span>
          </h1>
          <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            We're making it stupidly easy to find, book, and pay your favorite salon or barber — anywhere in Ghana, any time of day.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 bg-white">
        <div className="section-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-5xl mx-auto -mt-20 relative z-10 bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-gray-100">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-[#006B3F] mb-1">{s.value}</p>
                <p className="text-gray-500 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 bg-white">
        <div className="section-container">
          <div className="max-w-3xl mx-auto">
            <span className="inline-block text-[#006B3F] font-semibold text-sm uppercase tracking-wider mb-3">Our Story</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">Why we built GroomLink</h2>
            <div className="prose prose-gray max-w-none space-y-4 text-gray-600 leading-relaxed">
              <p>
                In 2024, one of our founders spent two hours calling five barbershops in East Legon — one didn't pick up, two were fully booked, one quoted a price that changed when he arrived. The fifth had closed down three months earlier.
              </p>
              <p>
                Meanwhile the stylists we talked to had the opposite problem: quiet afternoons, no-show customers, and no good way to show up on Google. The demand was there, the supply was there — the plumbing was broken.
              </p>
              <p className="font-medium text-gray-900">
                So we built GroomLink: real-time availability, upfront prices, Mobile Money payments, and a rating system that actually protects both sides.
              </p>
              <p>
                Today, hundreds of salons and barbershops across Accra, Kumasi, Takoradi, and Tamale use GroomLink to fill their chairs — and thousands of customers skip the phone calls.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="py-16 bg-[#F8F9FA]">
        <div className="section-container">
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-[#006B3F]/10 flex items-center justify-center mb-4">
                <Icon name="flag" size={24} className="text-[#006B3F]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Our Mission</h3>
              <p className="text-gray-600 leading-relaxed">
                To connect every Ghanaian to trusted grooming in under 60 seconds — and to make every salon owner's life easier, not harder.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-[#CE1126]/10 flex items-center justify-center mb-4">
                <Icon name="visibility" size={24} className="text-[#CE1126]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Our Vision</h3>
              <p className="text-gray-600 leading-relaxed">
                A Ghana where booking a haircut is as instant as hailing a ride — and where every neighborhood salon is one search away from its next best customer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-white">
        <div className="section-container">
          <div className="text-center mb-10">
            <span className="inline-block text-[#006B3F] font-semibold text-sm uppercase tracking-wider mb-2">What we stand for</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Our Values</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 max-w-5xl mx-auto">
            {values.map((v, i) => (
              <div key={i} className="bg-[#F8F9FA] rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${v.tint}`}>
                  <Icon name={v.icon} size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="py-16 bg-[#F8F9FA]">
        <div className="section-container">
          <div className="max-w-5xl mx-auto bg-gradient-to-br from-[#006B3F] to-[#004d2d] rounded-2xl p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FCD116]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="relative grid md:grid-cols-2 gap-6 items-center">
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">Want to work with us?</h3>
                <p className="text-white/80 mb-0">
                  We're hiring in Accra. Or list your salon for free and join the community.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link
                  to="/careers"
                  className="inline-flex items-center gap-2 bg-white text-[#006B3F] font-bold px-5 py-3 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  See Careers
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </Link>
                <a
                  href="https://partners.groomlinkgh.com"
                  className="inline-flex items-center gap-2 bg-[#FCD116] text-[#006B3F] font-bold px-5 py-3 rounded-xl hover:bg-[#e5bc14] transition-colors"
                >
                  List Your Business
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

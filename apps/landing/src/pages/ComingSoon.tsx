import { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Icon from '../components/Icon'

// ============================================================
// ComingSoon (/careers, /blog, /press)
// ============================================================
// Lightweight placeholder that auto-detects its context from the
// route so a single component can serve three footer links
// without shipping three separate pages. Includes an email
// waitlist hook that posts to the same /guest/support/tickets
// endpoint used by the Support page, so interest signals land
// in the agent dashboard.

import { API_BASE_URL } from '../config'

type Context = 'careers' | 'blog' | 'press' | 'download' | 'generic'

const COPY: Record<Context, {
  eyebrow: string
  title: string
  subtitle: string
  body: string
  cta: string
  emailLabel: string
  icon: string
}> = {
  careers: {
    eyebrow: 'Join the Team',
    title: "Careers at GroomLink",
    subtitle: "We're building the grooming layer for Ghana. Want in?",
    body: "We're not hiring publicly yet, but we're always meeting great people — engineers, designers, ops, growth. Drop your email and we'll reach out when roles open.",
    cta: 'Join the talent list',
    emailLabel: 'Careers interest',
    icon: 'work',
  },
  blog: {
    eyebrow: 'The GroomLink Blog',
    title: 'Stories, tips & salon spotlights',
    subtitle: 'Coming soon: hair trends, owner playbooks, and behind-the-scenes from the GroomLink community.',
    body: "We're putting the first stories together. Want an email when the first post drops?",
    cta: 'Notify me',
    emailLabel: 'Blog waitlist',
    icon: 'edit_note',
  },
  press: {
    eyebrow: 'Press & Media',
    title: 'Press Kit',
    subtitle: 'Writing about GroomLink? We love that.',
    body: 'Our full press kit — logos, founder bios, milestones, imagery — is being packaged. For interviews or anything urgent, email press@groomlinkgh.com directly.',
    cta: 'Request press kit',
    emailLabel: 'Press request',
    icon: 'newspaper',
  },
  download: {
    eyebrow: 'Mobile App',
    title: 'The GroomLink app is on the way',
    subtitle: 'iOS and Android — launching very soon.',
    body: "We're putting the final touches on the mobile experience. Leave your email and we'll send you the App Store / Play Store link the moment it's live.",
    cta: 'Notify me at launch',
    emailLabel: 'App launch waitlist',
    icon: 'smartphone',
  },
  generic: {
    eyebrow: 'Coming Soon',
    title: 'This page is on the way',
    subtitle: "We're working on it. Leave your email and we'll ping you when it's live.",
    body: "Meanwhile, you can reach us via Support any time.",
    cta: 'Notify me',
    emailLabel: 'Page waitlist',
    icon: 'pending',
  },
}

export default function ComingSoon() {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  // Detect context from path so /careers -> careers copy, etc.
  const path = location.pathname.replace(/^\//, '').toLowerCase()
  const ctx: Context =
    path === 'careers' ? 'careers' :
    path === 'blog' ? 'blog' :
    path === 'press' ? 'press' :
    (path === 'download' || path === 'app' || path === 'get-app') ? 'download' :
    'generic'
  const c = COPY[ctx]

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Please enter a valid email.')
      setStatus('error')
      return
    }
    setStatus('sending')
    setError('')
    try {
      const res = await fetch(`${API_BASE_URL}/guest/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: 'Waitlist signup',
          guestEmail: email.trim(),
          subject: `[${c.emailLabel}] ${path || 'coming-soon'}`,
          message: `Waitlist signup for ${path || 'coming-soon'} page from ${window.location.href}`,
        }),
      })
      if (!res.ok) throw new Error()
      setStatus('sent')
      setEmail('')
    } catch {
      setStatus('error')
      setError("Couldn't save right now. Try again in a moment.")
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <Header scrolled={scrolled} />

      <section className="pt-32 md:pt-36 pb-20 bg-gradient-to-br from-[#006B3F] via-[#00573a] to-[#004d2d] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FCD116]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#CE1126]/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
        <div className="section-container relative">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
              <Icon name={c.icon} size={40} className="text-[#FCD116]" />
            </div>
            <span className="inline-block text-[#FCD116] font-semibold text-sm uppercase tracking-wider mb-3">
              {c.eyebrow}
            </span>
            <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4 leading-tight">
              {c.title}
            </h1>
            <p className="text-base sm:text-lg text-white/80 mb-6 leading-relaxed">
              {c.subtitle}
            </p>
            <p className="text-sm text-white/60 mb-8 max-w-xl mx-auto leading-relaxed">
              {c.body}
            </p>
          </div>
        </div>
      </section>

      <section className="flex-1 flex items-start justify-center py-16 bg-[#F8F9FA]">
        <div className="section-container">
          <div className="max-w-2xl mx-auto text-center">
            {status === 'sent' ? (
              <div className="max-w-md mx-auto bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#006B3F] flex items-center justify-center">
                  <Icon name="check" size={24} className="text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">You're on the list</h3>
                <p className="text-gray-600 text-sm">We'll be in touch.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                <div className="flex flex-col sm:flex-row gap-2 bg-white rounded-xl shadow-lg border border-gray-100 p-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 px-4 py-3 rounded-lg outline-none text-sm"
                  />
                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="bg-[#006B3F] text-white font-semibold py-3 px-6 rounded-lg hover:bg-[#004d2d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {status === 'sending' ? 'Sending...' : c.cta}
                  </button>
                </div>
                {status === 'error' && error && (
                  <p className="mt-3 text-sm text-[#CE1126]">{error}</p>
                )}
              </form>
            )}

            <div className="mt-10 flex flex-wrap justify-center gap-3 text-sm">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-gray-600 hover:text-[#006B3F] transition-colors font-medium"
              >
                <Icon name="arrow_back" size={16} />
                Back to home
              </Link>
              <span className="text-gray-300">•</span>
              <Link
                to="/support"
                className="inline-flex items-center gap-1.5 text-gray-600 hover:text-[#006B3F] transition-colors font-medium"
              >
                Contact Support
              </Link>
              <span className="text-gray-300">•</span>
              <Link
                to="/about"
                className="inline-flex items-center gap-1.5 text-gray-600 hover:text-[#006B3F] transition-colors font-medium"
              >
                About GroomLink
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

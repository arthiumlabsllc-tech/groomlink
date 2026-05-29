import { useState, useEffect } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Icon from '../components/Icon'

// ============================================================
// GroomLink Support Page (/support)
// ============================================================
// Single entry point for any user type (customer, salon owner,
// freelancer, or guest visitor) to reach the support team.
// Provides three channels (Live Chat, WhatsApp, Phone) plus a
// fallback contact form. Channel details come from the public
// site-settings endpoint so admins can change them without a deploy.

const API_BASE_URL = 'https://groomlinkgh.com/api'

interface SiteSettings {
  email: string
  phoneNumber: string
  whatsappNumber: string
  backupPhoneNumber: string
  address: string
}

const DEFAULT_SETTINGS: SiteSettings = {
  email: 'hello@groomlinkgh.com',
  phoneNumber: '+233 24 123 4567',
  whatsappNumber: '',
  backupPhoneNumber: '',
  address: 'Accra, Ghana',
}

/** Strip anything but + and digits for tel: / wa.me links */
function normalizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, '')
}

/** Build WhatsApp link: https://wa.me/233... (digits only, no leading +) */
function whatsappLink(raw: string, message: string): string {
  const digits = raw.replace(/\D/g, '')
  const text = encodeURIComponent(message)
  return `https://wa.me/${digits}?text=${text}`
}

const faqs = [
  {
    q: 'I booked but the salon never showed — what do I do?',
    a: "Open the booking, tap 'Report Issue', or contact us via Live Chat with your booking ID. Refunds are processed within 24 hours for verified cases.",
  },
  {
    q: "I'm a salon owner — my payout hasn't arrived",
    a: 'Payouts to Mobile Money normally arrive within minutes. If more than 1 hour has passed, send us the booking ID via WhatsApp and we will trace it with Paystack/Hubtel.',
  },
  {
    q: 'How do I reset my password or change my phone number?',
    a: 'Accounts use email OTP (no password), so just log in again with your email. To change your phone number, go to Profile → Edit. If your email changed, contact support.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Visit the Delete My Account page from the footer, or email us at hello@groomlinkgh.com with your registered email.',
  },
]

function FAQItem({ question, answer, open, onToggle }: { question: string; answer: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
      >
        <span className="font-semibold text-gray-900">{question}</span>
        <Icon
          name={open ? 'expand_less' : 'expand_more'}
          size={24}
          className="text-[#006B3F] flex-shrink-0"
        />
      </button>
      {open && <p className="pb-4 text-gray-600 text-sm leading-relaxed">{answer}</p>}
    </div>
  )
}

export default function Support() {
  const [scrolled, setScrolled] = useState(false)
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  // Form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formSubject, setFormSubject] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/public-settings`)
        if (!res.ok) return
        const json = await res.json()
        if (json.success && json.data) {
          setSettings({
            email: json.data.email || DEFAULT_SETTINGS.email,
            phoneNumber: json.data.phoneNumber || DEFAULT_SETTINGS.phoneNumber,
            whatsappNumber: json.data.whatsappNumber || DEFAULT_SETTINGS.whatsappNumber,
            backupPhoneNumber: json.data.backupPhoneNumber || DEFAULT_SETTINGS.backupPhoneNumber,
            address: json.data.address || DEFAULT_SETTINGS.address,
          })
        }
      } catch {
        /* keep defaults */
      }
    }
    load()
  }, [])

  const openLiveChat = () => {
    window.dispatchEvent(new CustomEvent('chat:open'))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formEmail.trim() || !formMessage.trim()) {
      setFormError('Please fill in your name, email and message.')
      setFormStatus('error')
      return
    }
    setFormStatus('sending')
    setFormError('')
    try {
      // Create a real support ticket — lands in the agent dashboard
      // just like messages from the live chat widget.
      const res = await fetch(`${API_BASE_URL}/guest/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: formName.trim(),
          guestEmail: formEmail.trim(),
          subject: formSubject.trim() || 'Support request',
          message: formMessage.trim(),
        }),
      })
      if (!res.ok) {
        // Fall back to mailto so the user is never stuck
        const body = encodeURIComponent(`Name: ${formName}\nEmail: ${formEmail}\n\n${formMessage}`)
        window.location.href = `mailto:${settings.email}?subject=${encodeURIComponent(formSubject || 'Support request')}&body=${body}`
        setFormStatus('sent')
        return
      }
      setFormStatus('sent')
      setFormName('')
      setFormEmail('')
      setFormSubject('')
      setFormMessage('')
    } catch {
      // Network failure: fall back to mailto
      const body = encodeURIComponent(`Name: ${formName}\nEmail: ${formEmail}\n\n${formMessage}`)
      window.location.href = `mailto:${settings.email}?subject=${encodeURIComponent(formSubject || 'Support request')}&body=${body}`
      setFormStatus('sent')
    }
  }

  const phoneForLink = normalizePhone(settings.phoneNumber)
  const waNumber = settings.whatsappNumber || settings.phoneNumber // Fallback to phone if whatsapp not set
  const waLink = whatsappLink(
    waNumber,
    "Hi GroomLink, I need some help.",
  )

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header scrolled={scrolled} />

      {/* Hero */}
      <section className="relative pt-36 md:pt-40 pb-14 bg-gradient-to-br from-[#006B3F] via-[#00573a] to-[#004d2d] overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FCD116]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#CE1126]/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
        <div className="section-container relative text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-5">
            <Icon name="support_agent" size={18} className="text-[#FCD116]" />
            <span className="text-white text-sm font-medium">We're here 7 days a week</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            How can we <span className="text-[#FCD116]">help?</span>
          </h1>
          <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto">
            Whether you're a customer, salon owner, freelancer, or just browsing — reach our team any way you like.
          </p>
        </div>
      </section>

      {/* 3 contact channel cards */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="section-container">
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto -mt-24 relative z-10">
            {/* Live Chat */}
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 rounded-xl bg-[#006B3F]/10 flex items-center justify-center mb-4">
                <Icon name="chat" size={28} className="text-[#006B3F]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Live Chat</h3>
              <p className="text-gray-600 text-sm mb-5 leading-relaxed">
                Talk to an agent right now. No login required — just type your message.
              </p>
              <button
                onClick={openLiveChat}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#006B3F] text-white font-semibold py-3 px-4 rounded-xl hover:bg-[#004d2d] transition-colors"
              >
                Start Live Chat
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </button>
              <p className="text-xs text-gray-400 mt-3 text-center">Average reply: under 5 minutes</p>
            </div>

            {/* WhatsApp */}
            {waNumber && (
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all">
                <div className="w-14 h-14 rounded-xl bg-[#25D366]/10 flex items-center justify-center mb-4">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">WhatsApp</h3>
                <p className="text-gray-600 text-sm mb-5 leading-relaxed">
                  Send us a WhatsApp message — great for sharing screenshots or booking IDs.
                </p>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold py-3 px-4 rounded-xl hover:bg-[#1ebe57] transition-colors"
                >
                  Message on WhatsApp
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </a>
                <p className="text-xs text-gray-400 mt-3 text-center break-all">{waNumber}</p>
              </div>
            )}

            {/* Phone */}
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 rounded-xl bg-[#CE1126]/10 flex items-center justify-center mb-4">
                <Icon name="call" size={28} className="text-[#CE1126]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Phone</h3>
              <p className="text-gray-600 text-sm mb-5 leading-relaxed">
                Prefer talking? Call us — someone will pick up during business hours.
              </p>
              <a
                href={`tel:${phoneForLink}`}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#CE1126] text-white font-semibold py-3 px-4 rounded-xl hover:bg-[#a80e1f] transition-colors"
              >
                Call {settings.phoneNumber}
              </a>
              <p className="text-xs text-gray-400 mt-3 text-center">Mon–Sat · 8:00 AM – 8:00 PM GMT</p>
              {settings.backupPhoneNumber && (
                <>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2 font-medium">Backup Number:</p>
                    <a
                      href={`tel:${settings.backupPhoneNumber.replace(/\D/g, '')}`}
                      className="w-full inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-medium py-2.5 px-4 rounded-xl hover:bg-gray-200 transition-colors text-sm"
                    >
                      <Icon name="phone_in_talk" size={16} />
                      {settings.backupPhoneNumber}
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Contact form + info */}
      <section className="py-12 lg:py-16 bg-[#F8F9FA]">
        <div className="section-container">
          <div className="max-w-5xl mx-auto grid md:grid-cols-5 gap-8">
            {/* Form */}
            <div className="md:col-span-3 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Send us a message</h2>
              <p className="text-gray-500 text-sm mb-6">We usually reply within a few hours on business days.</p>

              {formStatus === 'sent' ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#006B3F] flex items-center justify-center">
                    <Icon name="check" size={24} className="text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">Message sent</h3>
                  <p className="text-gray-600 text-sm">
                    Thanks! We'll get back to you at the email you provided.
                  </p>
                  <button
                    onClick={() => setFormStatus('idle')}
                    className="mt-4 text-[#006B3F] font-semibold text-sm hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Your name *</label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/10 outline-none text-sm"
                        placeholder="Ama Mensah"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Your email *</label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/10 outline-none text-sm"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subject</label>
                    <input
                      type="text"
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/10 outline-none text-sm"
                      placeholder="Booking issue, payout question, general..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Message *</label>
                    <textarea
                      value={formMessage}
                      onChange={(e) => setFormMessage(e.target.value)}
                      rows={5}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/10 outline-none text-sm resize-y"
                      placeholder="Tell us what's happening..."
                    />
                  </div>
                  {formStatus === 'error' && formError && (
                    <p className="text-sm text-[#CE1126]">{formError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={formStatus === 'sending'}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#006B3F] text-white font-semibold py-3 px-8 rounded-xl hover:bg-[#004d2d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {formStatus === 'sending' ? 'Sending...' : 'Send message'}
                  </button>
                </form>
              )}
            </div>

            {/* Side info */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Other ways to reach us</h3>
                <div className="space-y-4">
                  <a href={`mailto:${settings.email}`} className="flex items-start gap-3 group">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-[#006B3F]/10 transition-colors">
                      <Icon name="mail" size={18} className="text-gray-600 group-hover:text-[#006B3F]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-[#006B3F] transition-colors break-all">{settings.email}</p>
                    </div>
                  </a>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Icon name="location_on" size={18} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Office</p>
                      <p className="text-sm font-semibold text-gray-900">{settings.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Icon name="schedule" size={18} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Hours</p>
                      <p className="text-sm font-semibold text-gray-900">Mon–Sat · 8:00 AM – 8:00 PM</p>
                      <p className="text-xs text-gray-500 mt-0.5">Live Chat is 24/7</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#006B3F] to-[#004d2d] rounded-2xl p-6 text-white shadow-sm">
                <h3 className="font-bold mb-2">Are you a salon owner?</h3>
                <p className="text-white/80 text-sm mb-4">
                  For partner-specific questions (payouts, subscriptions, KYC) include your salon name when you contact us.
                </p>
                <a
                  href="https://partners.groomlinkgh.com/login"
                  className="inline-flex items-center gap-2 bg-[#FCD116] text-[#006B3F] font-bold text-sm px-4 py-2 rounded-lg hover:bg-[#e5bc14] transition-colors"
                >
                  Go to Partner Dashboard
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick FAQ */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="section-container">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <span className="inline-block text-[#006B3F] font-semibold text-sm uppercase tracking-wider mb-2">Quick answers</span>
              <h2 className="text-3xl font-bold text-gray-900">Frequently asked</h2>
            </div>
            <div className="bg-[#F8F9FA] rounded-2xl px-5 sm:px-7">
              {faqs.map((f, i) => (
                <FAQItem
                  key={i}
                  question={f.q}
                  answer={f.a}
                  open={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

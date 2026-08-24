import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Icon from '../components/Icon'

export default function Download() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <Header scrolled={scrolled} />

      {/* Hero Section */}
      <section className="pt-32 md:pt-36 pb-20 bg-gradient-to-br from-[#006B3F] via-[#00573a] to-[#004d2d] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FCD116]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#CE1126]/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
        <div className="section-container relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
              <Icon name="smartphone" size={40} className="text-[#FCD116]" />
            </div>
            <span className="inline-block text-[#FCD116] font-semibold text-sm uppercase tracking-wider mb-3">
              Download GroomLink
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
              Choose Your App
            </h1>
            <p className="text-lg text-white/80">
              Download the right app for your needs — book services or manage your business
            </p>
          </div>
        </div>
      </section>

      <main className="flex-1 pt-12 pb-24">
        <div className="section-container">
          {/* App Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
            {/* Customer App */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow">
              {/* Header */}
              <div className="bg-gradient-to-br from-[#006B3F] to-[#004d2d] p-8 text-white">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Customer App</h2>
                <p className="text-white/80">Find & book grooming services</p>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {[
                    'Discover nearby salons & barbers',
                    'Book appointments instantly',
                    'Secure mobile money payments',
                    'Read reviews & ratings',
                    'Manage your bookings'
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#006B3F]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon name="check" size={12} className="text-[#006B3F]" />
                      </div>
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Download Buttons */}
                <div className="space-y-3">
                  {/* Google Play - Available */}
                  <a
                    href="https://play.google.com/store/apps/details?id=com.arthiumlabsllc.groomlink&utm_source=na_Med"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-black rounded-xl px-5 py-3 hover:opacity-90 transition-opacity w-full"
                  >
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                    <div className="flex flex-col leading-tight">
                      <span className="text-white/70 text-xs">Get it on</span>
                      <span className="text-white font-semibold text-base -mt-0.5">Google Play</span>
                    </div>
                  </a>

                  {/* Apple App Store - Coming Soon */}
                  <a
                    href="#"
                    className="flex items-center gap-3 bg-black rounded-xl px-5 py-3 opacity-50 cursor-not-allowed w-full"
                    title="Coming Soon"
                  >
                    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <div className="flex flex-col leading-tight">
                      <span className="text-white/70 text-xs">Coming Soon to</span>
                      <span className="text-white font-semibold text-base -mt-0.5">App Store</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            {/* Partners App */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow">
              {/* Header */}
              <div className="bg-gradient-to-br from-[#FCD116] to-[#e5bc14] p-8 text-gray-900">
                <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Partners App</h2>
                <p className="text-gray-800">Manage your salon & bookings</p>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {[
                    'List your salon for free',
                    'Manage appointments & availability',
                    'View earnings & request payouts',
                    'Communicate with customers',
                    'Grow your clientele'
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#FCD116]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon name="check" size={12} className="text-gray-900" />
                      </div>
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Download Buttons */}
                <div className="space-y-3">
                  {/* Google Play - Available */}
                  <a
                    href="https://play.google.com/store/apps/details?id=com.arthiumlabsllc.partners&utm_source=na_Med"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-black rounded-xl px-5 py-3 hover:opacity-90 transition-opacity w-full"
                  >
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                    <div className="flex flex-col leading-tight">
                      <span className="text-white/70 text-xs">Get it on</span>
                      <span className="text-white font-semibold text-base -mt-0.5">Google Play</span>
                    </div>
                  </a>

                  {/* Apple App Store - Coming Soon */}
                  <a
                    href="#"
                    className="flex items-center gap-3 bg-black rounded-xl px-5 py-3 opacity-50 cursor-not-allowed w-full"
                    title="Coming Soon"
                  >
                    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <div className="flex flex-col leading-tight">
                      <span className="text-white/70 text-xs">Coming Soon to</span>
                      <span className="text-white font-semibold text-base -mt-0.5">App Store</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="text-center max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Not sure which app to download?</h3>
              <div className="text-gray-600 text-sm space-y-2">
                <p>
                  <strong className="text-gray-900">Customer App:</strong> For people who want to book grooming services like haircuts, styling, makeup, nail care, and spa treatments.
                </p>
                <p>
                  <strong className="text-gray-900">Partners App:</strong> For salon owners, barbershops, and beauty professionals who want to list their business and manage bookings.
                </p>
              </div>
            </div>
          </div>

          {/* Back to Home */}
          <div className="text-center mt-12">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[#006B3F] hover:text-[#004d2d] transition-colors font-medium"
            >
              <Icon name="arrow_back" size={20} />
              Back to home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

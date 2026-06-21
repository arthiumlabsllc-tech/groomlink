import { useState, useEffect, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import NearbySalons from './components/NearbySalons'
import PopularCategories from './components/PopularCategories'
import Testimonials from './components/Testimonials'
import TrustBadges from './components/TrustBadges'
import FAQ from './components/FAQ'
import ForSalonOwners from './components/ForSalonOwners'
import Footer from './components/Footer'
import MobileHome from './components/MobileHome'
import LoadingScreen from './components/LoadingScreen'
import ChatWidget from './components/ChatWidget'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import DataDeletion from './pages/DataDeletion'
import Register from './pages/Register'
import SalonDetail from './pages/SalonDetail'
import Explore from './pages/Explore'
import PartnerWithUs from './pages/PartnerWithUs'
import Support from './pages/Support'
import About from './pages/About'
import Download from './pages/Download'
import ComingSoon from './pages/ComingSoon'
import NotFound from './pages/NotFound'

/* Floating Partner CTA for desktop - slides in after scrolling */
function FloatingPartnerBanner() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 500)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (dismissed) return null

  return (
    <div
      className={`fixed bottom-8 right-8 z-40 transition-all duration-500 ${
        visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95 pointer-events-none'
      }`}
    >
      <div className="relative bg-gradient-to-br from-[#006B3F] to-[#004d2d] rounded-2xl p-5 shadow-2xl border border-[#FCD116]/20 max-w-xs">
        <button
          onClick={() => setDismissed(true)}
          className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-[#FCD116] rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse-slow">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#006B3F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-base mb-1">Own a Shop? Claim Your Territory</p>
            <p className="text-white/70 text-sm mb-3">List for free & fill your chair with more bookings</p>
            <a
              href="https://partners.groomlinkgh.com"
              className="inline-flex items-center gap-2 bg-[#FCD116] text-[#006B3F] font-extrabold text-sm px-5 py-2.5 rounded-xl hover:bg-[#e5bc14] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Get Started
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function DesktopLanding() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Header scrolled={scrolled} />
      <main>
        <Hero />
        <HowItWorks />
        <NearbySalons />
        <PopularCategories />
        <TrustBadges />
        <Testimonials />
        <ForSalonOwners />
        <FAQ />
      </main>
      <Footer />
      <FloatingPartnerBanner />
    </div>
  )
}

function LandingPage() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile ? <MobileHome /> : <DesktopLanding />
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/salon/:id" element={<SalonDetail />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/delete-account" element={<DataDeletion />} />
          <Route path="/register" element={<Register />} />
          <Route path="/partners" element={<PartnerWithUs />} />
          <Route path="/for-salon-owners" element={<PartnerWithUs />} />
          <Route path="/support" element={<Support />} />
          <Route path="/contact" element={<Support />} />
          <Route path="/help" element={<Support />} />
          <Route path="/about" element={<About />} />
          <Route path="/careers" element={<ComingSoon />} />
          <Route path="/blog" element={<ComingSoon />} />
          <Route path="/press" element={<ComingSoon />} />
          <Route path="/download" element={<Download />} />
          <Route path="/app" element={<Download />} />
          <Route path="/get-app" element={<Download />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <ChatWidget />
    </BrowserRouter>
  )
}

export default App

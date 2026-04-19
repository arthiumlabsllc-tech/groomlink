import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import FeaturedSalons from './components/FeaturedSalons'
import PopularCategories from './components/PopularCategories'
import Testimonials from './components/Testimonials'
import ForSalonOwners from './components/ForSalonOwners'
import Footer from './components/Footer'
import MobileHome from './components/MobileHome'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import Register from './pages/Register'
import SalonDetail from './pages/SalonDetail'
import Explore from './pages/Explore'
import PartnerWithUs from './pages/PartnerWithUs'

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
        <FeaturedSalons />
        <PopularCategories />
        <Testimonials />
        <ForSalonOwners />
      </main>
      <Footer />
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
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/salon/:id" element={<SalonDetail />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/register" element={<Register />} />
        <Route path="/partners" element={<PartnerWithUs />} />
        <Route path="/for-salon-owners" element={<PartnerWithUs />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

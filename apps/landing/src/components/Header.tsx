import { useState, useEffect } from 'react'
import Icon from './Icon'
import RoleSelectorModal from './RoleSelectorModal'
import BrandLogo from './BrandLogo'

interface HeaderProps {
  scrolled: boolean
}

export default function Header({ scrolled }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [roleModalOpen, setRoleModalOpen] = useState(false)

  const openRoleModal = () => {
    setRoleModalOpen(true)
    setMobileMenuOpen(false)
  }

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const navLinks = [
    { name: 'Find a Salon', href: '/explore' },
    { name: 'Partner With Us', href: '/partners' },
  ]

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-md' : 'bg-white'
      }`}
    >
      {/* Partner With Us Banner - ALL devices, bold & animated */}
      {!bannerDismissed && (
        <div className="relative bg-gradient-to-r from-[#006B3F] via-[#008a50] to-[#006B3F] overflow-hidden">
          {/* Animated shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
          <a
            href="/partners"
            className="relative flex items-center justify-center gap-2 text-white text-center py-2.5 sm:py-3 font-bold tracking-wide hover:bg-white/10 transition-colors group"
          >
            <span className="text-[#FCD116] text-lg sm:text-xl animate-bounce-gentle">&#9733;</span>
            <span className="text-xs sm:text-sm md:text-base">
              OWN A SHOP? CLAIM YOUR TERRITORY
            </span>
            <span className="bg-[#FCD116] text-[#006B3F] font-extrabold text-xs sm:text-sm px-3 py-1 rounded-full group-hover:scale-110 transition-transform shadow-md">
              GET STARTED
            </span>
            <span className="text-[#FCD116] text-lg sm:text-xl animate-bounce-gentle" style={{ animationDelay: '0.3s' }}>&#9733;</span>
          </a>
          <button
            onClick={(e) => { e.preventDefault(); setBannerDismissed(true); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-1 transition-colors"
            aria-label="Dismiss"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}
      <nav className="section-container">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center">
            <BrandLogo className="h-10 md:h-14" wordmarkClassName="text-[8px] md:text-[11px]" />
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-brand-text font-medium hover:text-brand-primary transition-colors"
              >
                {link.name}
              </a>
            ))}
            <button
              onClick={openRoleModal}
              className="text-brand-text font-medium hover:text-brand-primary transition-colors"
            >
              Log In / Sign Up
            </button>
            <button
              onClick={openRoleModal}
              className="btn-primary text-sm"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <Icon name="close" size={24} className="text-brand-text" />
            ) : (
              <Icon name="menu" size={24} className="text-brand-text" />
            )}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <div 
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="bg-white border-t border-gray-100 py-4 space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="block text-brand-text font-medium py-2 hover:text-brand-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <button
              onClick={openRoleModal}
              className="block w-full text-left text-brand-text font-medium py-2 hover:text-brand-primary transition-colors"
            >
              Log In / Sign Up
            </button>
            {/* Dedicated partner login for mobile — visible safety net */}
            <a
              href="https://partners.groomlinkgh.com/login"
              className="block text-brand-text/70 text-sm py-2 hover:text-brand-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Salon Owner / Freelancer Login
            </a>
            <button
              onClick={openRoleModal}
              className="block w-full btn-primary text-center text-sm mt-4"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>
      <RoleSelectorModal open={roleModalOpen} onClose={() => setRoleModalOpen(false)} />
    </header>
  )
}

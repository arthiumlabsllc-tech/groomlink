import { useState, useEffect } from 'react'
import Icon from './Icon'

interface HeaderProps {
  scrolled: boolean
}

export default function Header({ scrolled }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
    { name: 'For Barbershop/Salon', href: 'https://partners.groomlinkgh.com' },
  ]

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-md' : 'bg-white'
      }`}
    >
      <nav className="section-container">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center">
            <img 
              src="/logo-full-black.png" 
              alt="GroomLink" 
              className="h-8 w-auto"
            />
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
            <a
              href="https://my.groomlinkgh.com/login"
              className="text-brand-text font-medium hover:text-brand-primary transition-colors"
            >
              Login/Signup
            </a>
            <a
              href="https://my.groomlinkgh.com/login"
              className="btn-primary text-sm"
            >
              Download App
            </a>
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
            <a
              href="https://my.groomlinkgh.com/login"
              className="block text-brand-text font-medium py-2 hover:text-brand-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Login/Signup
            </a>
            <a
              href="https://my.groomlinkgh.com/login"
              className="block btn-primary text-center text-sm mt-4"
              onClick={() => setMobileMenuOpen(false)}
            >
              Download App
            </a>
          </div>
        </div>
      </nav>
    </header>
  )
}

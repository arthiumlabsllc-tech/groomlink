import { Menu, X, Scissors, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

const API_BASE_URL = 'https://groomlinkgh.com/api'

interface SiteSettings {
  siteName: string
  logoUrl?: string
  email?: string
  phoneNumber?: string
  address?: string
  maintenanceMode: boolean
}

interface HeaderProps {
  scrolled: boolean
}

// Default/fallback values
const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'GroomLink',
  email: 'hello@groomlinkgh.com',
  phoneNumber: '+233 24 123 4567',
  address: 'Accra, Ghana',
  maintenanceMode: false
}

export default function Header({ scrolled }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLoginDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/public-settings`)
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setSiteSettings({
              ...DEFAULT_SETTINGS,
              ...result.data
            })
          }
        }
      } catch (error) {
        // Keep default values on error
        console.error('Failed to fetch site settings:', error)
      }
    }

    fetchSiteSettings()
  }, [])

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Pricing', href: '#pricing' },
  ]

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-md' : 'bg-transparent'
      }`}
    >
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="#" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-ghana-green via-ghana-gold to-ghana-red rounded-full flex items-center justify-center overflow-hidden">
              {siteSettings.logoUrl ? (
                <img 
                  src={siteSettings.logoUrl} 
                  alt={siteSettings.siteName} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Scissors className="w-5 h-5 text-white" />
              )}
            </div>
            <span className={`text-xl font-bold font-display ${scrolled ? 'text-ghana-green' : 'text-white'}`}>
              {siteSettings.siteName}
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className={`relative font-medium transition-colors group ${
                  scrolled ? 'text-gray-700 hover:text-ghana-green' : 'text-white/90 hover:text-white'
                }`}
              >
                {link.name}
                <span 
                  className={`absolute -bottom-1 left-0 h-0.5 bg-ghana-gold transition-all duration-300 ${
                    scrolled ? 'w-0 group-hover:w-full' : 'w-0 group-hover:w-full'
                  }`} 
                />
              </a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Login Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setLoginDropdownOpen(!loginDropdownOpen)}
                className={`font-medium px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-1 ${
                  scrolled 
                    ? 'text-ghana-green border-ghana-green hover:bg-ghana-green hover:text-white' 
                    : 'text-white border-white/50 hover:border-white hover:bg-white/10'
                }`}
              >
                Sign In
                <ChevronDown className={`w-4 h-4 transition-transform ${loginDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {loginDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                  <a
                    href="https://my.groomlinkgh.com/login"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    onClick={() => setLoginDropdownOpen(false)}
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Customer</div>
                      <div className="text-xs text-gray-500">Book salon services</div>
                    </div>
                  </a>
                  <div className="border-t border-gray-100 my-1"></div>
                  <a
                    href="https://partners.groomlinkgh.com/login"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    onClick={() => setLoginDropdownOpen(false)}
                  >
                    <div className="w-10 h-10 bg-ghana-green/10 rounded-full flex items-center justify-center">
                      <Scissors className="w-5 h-5 text-ghana-green" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Salon Owner</div>
                      <div className="text-xs text-gray-500">Manage your salon</div>
                    </div>
                  </a>
                </div>
              )}
            </div>
            <Link 
              to="/register" 
              className="bg-ghana-green hover:bg-ghana-green/90 text-white font-medium px-5 py-2 rounded-lg transition-all shadow-sm hover:shadow-md"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className={scrolled ? 'text-gray-700' : 'text-white'} />
            ) : (
              <Menu className={scrolled ? 'text-gray-700' : 'text-white'} />
            )}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <div 
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="bg-white rounded-xl shadow-xl mt-2 p-6 space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="block text-gray-700 font-medium py-2 hover:text-ghana-green transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <hr className="border-gray-100" />
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase">Sign in as:</div>
              <a
                href="https://my.groomlinkgh.com/login"
                className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div>
                  <div className="font-medium">Customer</div>
                  <div className="text-xs opacity-75">Book salon services</div>
                </div>
              </a>
              <a
                href="https://partners.groomlinkgh.com/login"
                className="flex items-center gap-3 px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Scissors className="w-5 h-5" />
                <div>
                  <div className="font-medium">Salon Owner</div>
                  <div className="text-xs opacity-75">Manage your salon</div>
                </div>
              </a>
            </div>
            <Link 
              to="/register" 
              className="block text-center bg-ghana-green text-white font-medium py-3 rounded-lg hover:bg-ghana-green/90 transition-all"
              onClick={() => setMobileMenuOpen(false)}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>
    </header>
  )
}

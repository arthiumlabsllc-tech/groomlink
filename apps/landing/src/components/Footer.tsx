import { useState, useEffect } from 'react'
import Icon from './Icon'

const API_BASE_URL = 'https://groomlinkgh.com/api'

interface SiteSettings {
  siteName: string
  email?: string
  phoneNumber?: string
  address?: string
}

const footerLinks = {
  company: [
    { name: 'About Us', href: '#' },
    { name: 'Careers', href: '#' },
    { name: 'Blog', href: '#' },
    { name: 'Press', href: '#' },
  ],
  forCustomers: [
    { name: 'Find a Salon', href: '/explore' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Download App', href: 'https://my.groomlinkgh.com/login' },
    { name: 'Customer Login', href: 'https://my.groomlinkgh.com/login' },
  ],
  forSalons: [
    { name: 'List Your Salon', href: 'https://partners.groomlinkgh.com' },
    { name: 'Partner Login', href: 'https://partners.groomlinkgh.com/login' },
    { name: 'Success Stories', href: '#' },
    { name: 'Pricing', href: '#' },
  ],
  support: [
    { name: 'Help Center', href: '#' },
    { name: 'Contact Us', href: '#' },
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
  ],
}

const socialLinks = [
  { name: 'Facebook', href: '#', svg: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
  { name: 'Twitter', href: '#', svg: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  { name: 'Instagram', href: '#', svg: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
]

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'GroomLink',
  email: 'hello@groomlinkgh.com',
  phoneNumber: '+233 24 123 4567',
  address: 'Accra, Ghana',
}

export default function Footer() {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)

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
        console.error('Failed to fetch site settings:', error)
      }
    }

    fetchSiteSettings()
  }, [])

  return (
    <footer className="bg-[#1A1A1A] text-white">
      <div className="section-container">
        {/* Main Footer */}
        <div className="py-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand Column */}
          <div className="col-span-2">
            <a href="/" className="flex items-center mb-4">
              <img 
                src="/logo-white.png" 
                alt="GroomLink" 
                className="h-8 w-auto"
              />
            </a>
            <p className="text-gray-400 text-sm mb-6 max-w-xs">
              Ghana's premier salon and barbershop booking platform. Book top grooming services instantly.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3 text-sm">
              <a 
                href={`mailto:${siteSettings.email}`} 
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <Icon name="mail" size={16} />
                {siteSettings.email}
              </a>
              <a 
                href={`tel:${siteSettings.phoneNumber?.replace(/\s/g, '')}`} 
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <Icon name="call" size={16} />
                {siteSettings.phoneNumber}
              </a>
              <div className="flex items-center gap-2 text-gray-400">
                <Icon name="location_on" size={16} />
                {siteSettings.address}
              </div>
            </div>

            {/* App Store Badges */}
            <div className="flex gap-3 mt-6">
              {/* Apple App Store */}
              <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 opacity-60 cursor-not-allowed">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="flex flex-col leading-tight">
                  <span className="text-gray-400 text-[10px]">Download on</span>
                  <span className="text-white text-xs font-medium">App Store</span>
                </div>
              </div>
              {/* Google Play */}
              <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 opacity-60 cursor-not-allowed">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                <div className="flex flex-col leading-tight">
                  <span className="text-gray-400 text-[10px]">Get it on</span>
                  <span className="text-white text-xs font-medium">Google Play</span>
                </div>
              </div>
            </div>
          </div>

          {/* For Customers */}
          <div>
            <h4 className="font-semibold text-white mb-4">For Customers</h4>
            <ul className="space-y-3">
              {footerLinks.forCustomers.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-gray-400 hover:text-white text-sm transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* For Salons */}
          <div>
            <h4 className="font-semibold text-white mb-4">For Barbershop/Salon</h4>
            <ul className="space-y-3">
              {footerLinks.forSalons.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-gray-400 hover:text-white text-sm transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-white mb-4">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-gray-400 hover:text-white text-sm transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-gray-400 hover:text-white text-sm transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-sm">
            <p className="text-gray-400">
              © 2025 GroomLink. All rights reserved.
            </p>
            <span className="hidden sm:inline text-gray-600">•</span>
            <p className="text-gray-400 flex items-center gap-1">
              Made in Ghana <span className="text-lg">🇬🇭</span>
            </p>
            <span className="hidden sm:inline text-gray-600">•</span>
            <a 
              href="#" 
              className="text-gray-400 hover:text-white transition-colors"
            >
              An Arthium Labs Product
            </a>
          </div>
          
          {/* Social Links */}
          <div className="flex items-center gap-3">
            {socialLinks.map((social, i) => (
              <a 
                key={i}
                href={social.href}
                className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:bg-brand-primary hover:text-white transition-all"
                aria-label={social.name}
              >
                {social.svg}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

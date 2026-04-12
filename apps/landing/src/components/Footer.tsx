import { Scissors, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

const API_BASE_URL = 'https://groomlinkgh.com/api'

interface SiteSettings {
  siteName: string
  logoUrl?: string
  email?: string
  phoneNumber?: string
  address?: string
  maintenanceMode: boolean
}

const footerLinks = {
  company: [
    { name: 'About Us', href: '#' },
    { name: 'Careers', href: '#' },
    { name: 'Blog', href: '#' },
    { name: 'Press', href: '#' },
  ],
  forCustomers: [
    { name: 'Find a Salon', href: '/register' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Customer Login', href: 'https://my.groomlinkgh.com/login' },
  ],
  forSalons: [
    { name: 'Partner With Us', href: '/register' },
    { name: 'Salon Login', href: 'https://partners.groomlinkgh.com/login' },
    { name: 'Success Stories', href: '#' },
    { name: 'Business Resources', href: '#' },
  ],
  support: [
    { name: 'Help Center', href: '#' },
    { name: 'Contact Us', href: '#' },
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
  ],
}

const socialLinks = [
  { name: 'Facebook', icon: Facebook, href: '#' },
  { name: 'Twitter', icon: Twitter, href: '#' },
  { name: 'Instagram', icon: Instagram, href: '#' },
  { name: 'LinkedIn', icon: Linkedin, href: '#' },
]

// Default/fallback values
const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'GroomLink',
  email: 'hello@groomlinkgh.com',
  phoneNumber: '+233 24 123 4567',
  address: 'Accra, Ghana',
  maintenanceMode: false
}

export default function Footer() {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

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
      } finally {
        setLoading(false)
      }
    }

    fetchSiteSettings()
  }, [])

  return (
    <footer className="bg-[#1a1a2e] text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-4">
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
              <span className="text-xl font-bold font-display text-white">{siteSettings.siteName}</span>
            </Link>
            <p className="text-gray-400 text-sm mb-4">
              Ghana's premier salon and barbershop booking platform.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-2 text-sm">
              <a 
                href={`mailto:${siteSettings.email}`} 
                className="flex items-center gap-2 text-gray-400 hover:text-ghana-gold transition-colors"
              >
                <Mail className="w-4 h-4" />
                {siteSettings.email}
              </a>
              <a 
                href={`tel:${siteSettings.phoneNumber?.replace(/\s/g, '')}`} 
                className="flex items-center gap-2 text-gray-400 hover:text-ghana-gold transition-colors"
              >
                <Phone className="w-4 h-4" />
                {siteSettings.phoneNumber}
              </a>
              <div className="flex items-center gap-2 text-gray-400">
                <MapPin className="w-4 h-4" />
                {siteSettings.address}
              </div>
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold text-white mb-4 font-display">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-gray-400 hover:text-ghana-gold text-sm transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* For Customers Links */}
          <div>
            <h4 className="font-semibold text-white mb-4 font-display">For Customers</h4>
            <ul className="space-y-2">
              {footerLinks.forCustomers.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-gray-400 hover:text-ghana-gold text-sm transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* For Salon Owners Links */}
          <div>
            <h4 className="font-semibold text-white mb-4 font-display">For Salons</h4>
            <ul className="space-y-2">
              {footerLinks.forSalons.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-gray-400 hover:text-ghana-gold text-sm transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-semibold text-white mb-4 font-display">Contact</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-gray-400 hover:text-ghana-gold text-sm transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-gray-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} GroomLink. All rights reserved.
            </p>
            <span className="hidden sm:inline text-gray-600">•</span>
            <p className="text-gray-400 text-sm flex items-center gap-1">
              Made with <span className="text-ghana-red">❤</span> in Ghana 🇬🇭
            </p>
          </div>
          
          {/* Social Links */}
          <div className="flex items-center gap-3">
            {socialLinks.map((social, i) => (
              <a 
                key={i}
                href={social.href}
                className="w-9 h-9 bg-white/5 rounded-lg flex items-center justify-center text-gray-400 hover:bg-ghana-green hover:text-white transition-all"
                aria-label={social.name}
              >
                <social.icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

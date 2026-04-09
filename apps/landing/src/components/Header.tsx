import { Menu, X, Scissors } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

interface HeaderProps {
  scrolled: boolean
}

export default function Header({ scrolled }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
            <div className="w-10 h-10 bg-gradient-to-br from-ghana-green via-ghana-gold to-ghana-red rounded-full flex items-center justify-center">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <span className={`text-xl font-bold font-display ${scrolled ? 'text-ghana-green' : 'text-white'}`}>
              GroomLink
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
            <Link 
              to="/login" 
              className={`font-medium px-4 py-2 rounded-lg border-2 transition-all ${
                scrolled 
                  ? 'text-ghana-green border-ghana-green hover:bg-ghana-green hover:text-white' 
                  : 'text-white border-white/50 hover:border-white hover:bg-white/10'
              }`}
            >
              Sign In
            </Link>
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
            <Link 
              to="/login" 
              className="block text-center text-ghana-green font-medium py-2 border-2 border-ghana-green rounded-lg hover:bg-ghana-green hover:text-white transition-all"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In
            </Link>
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

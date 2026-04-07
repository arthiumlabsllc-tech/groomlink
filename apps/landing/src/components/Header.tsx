import { Menu, X, Scissors } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

interface HeaderProps {
  scrolled: boolean
}

export default function Header({ scrolled }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-lg' : 'bg-transparent'
      }`}
    >
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="#" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-ghana-green via-ghana-gold to-ghana-red rounded-full flex items-center justify-center">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <span className={`text-xl font-bold font-display ${scrolled ? 'text-primary-500' : 'text-white'}`}>
              GroomLink
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-primary-500' : 'text-white/90 hover:text-white'}`}>
              Features
            </a>
            <a href="#how-it-works" className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-primary-500' : 'text-white/90 hover:text-white'}`}>
              How It Works
            </a>
            <a href="#pricing" className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-primary-500' : 'text-white/90 hover:text-white'}`}>
              Pricing
            </a>
            <a href="https://dash.groomlinkgh.com" className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-primary-500' : 'text-white/90 hover:text-white'}`}>
              For Salons
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link 
              to="/register" 
              className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-primary-500' : 'text-white/90 hover:text-white'}`}
            >
              Sign In
            </Link>
            <Link 
              to="/register" 
              className="btn-gold text-sm"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className={scrolled ? 'text-gray-700' : 'text-white'} />
            ) : (
              <Menu className={scrolled ? 'text-gray-700' : 'text-white'} />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white rounded-lg shadow-lg mt-2 p-4">
            <div className="flex flex-col space-y-4">
              <a href="#features" className="text-gray-700 font-medium">Features</a>
              <a href="#how-it-works" className="text-gray-700 font-medium">How It Works</a>
              <a href="#pricing" className="text-gray-700 font-medium">Pricing</a>
              <a href="https://dash.groomlinkgh.com" className="text-gray-700 font-medium">For Salons</a>
              <hr />
              <Link to="/register" className="text-gray-700 font-medium">Sign In</Link>
              <Link to="/register" className="btn-primary text-center">Get Started</Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}

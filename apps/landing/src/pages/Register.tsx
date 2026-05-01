import { useEffect } from 'react'
import { useDarkMode } from '../hooks/useDarkMode'

// Simple redirect component - all registration now happens on respective subdomains
export default function Register() {
  const isDark = useDarkMode()
  
  // Redirect to customer login (which includes registration) on mount
  useEffect(() => {
    window.location.href = 'https://my.groomlinkgh.com/login'
  }, [])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-ghana-green/5 via-white to-ghana-gold/10 flex items-center justify-center">
      <div className="text-center">
        <img
          src={isDark ? "/logo-white.png" : "/logo-black.png"}
          alt="Redirecting..."
          className="w-16 h-16 animate-pulse-logo mx-auto"
        />
        <p className="text-gray-600 mt-4">Redirecting to customer registration...</p>
      </div>
    </div>
  )
}
